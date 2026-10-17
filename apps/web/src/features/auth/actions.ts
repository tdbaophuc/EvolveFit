import { buildCloudMergePreview, buildLocalToCloudSyncItems, type AppState } from "@evolvefit/shared";
import { evolveFitApiClient, type AuthMode } from "@/lib/api-client";
import { apiErrorMessage, isValidEmail, passwordProblem } from "@/lib/api-errors";
import { hasAccountCache, loadState, normalizeAccount, removeAccountCache } from "@/lib/storage";
import { commit, currentAccount, currentState, notify, useAppStore } from "@/lib/store/app-store";
import { adoptCloudState, cloudStateFrom } from "../sync/merge";
import { isUnauthorized, pullFromCloud } from "../sync/pull";
import { authState, bumpSessionEpoch, type AuthAction, type SessionSource } from "./store";

export type AuthResult = { ok: true; message?: string } | { ok: false; error: string };

const slowRequestAfterMs = 3000;

/** Runs one auth request at a time with pending/slow state so buttons never look dead. */
async function runAuthAction<T>(action: AuthAction, task: () => Promise<T>): Promise<T | undefined> {
  if (authState().pending) return undefined;
  authState().patch({ pending: action, slow: false });
  const slowTimer = setTimeout(() => authState().patch({ slow: true }), slowRequestAfterMs);
  try {
    return await task();
  } catch {
    return undefined;
  } finally {
    clearTimeout(slowTimer);
    authState().patch({ pending: null, slow: false });
  }
}

const busy: AuthResult = { ok: false, error: "Đang xử lý yêu cầu trước, vui lòng đợi." };

function signedInProfile(state: AppState, email: string, mode: AuthMode): AppState {
  return { ...state, profile: { ...state.profile, email, authMode: mode } };
}

/**
 * Opens the namespace of the account the server says we are signed in as.
 * - same account already open: just refresh it;
 * - account cached on this device: reopen the cache and pull newer cloud data;
 * - first time on this device: start from a copy of the guest data and ask how to reconcile it with the cloud.
 */
export async function establishSession(email: string, mode: AuthMode, source: SessionSource): Promise<void> {
  const account = normalizeAccount(email);
  if (!account) return;
  bumpSessionEpoch();
  authState().patch({ sessionExpired: false, sessionChecked: true });
  const store = useAppStore.getState();

  if (store.account === account) {
    commit((state) => signedInProfile(state, email, mode));
    void pullFromCloud({ force: true });
    return;
  }

  if (hasAccountCache(account)) {
    const cached = loadState(account);
    store.switchAccount(account, signedInProfile({ ...cached, profile: { ...cached.profile, onboardingCompleted: true } }, email, mode));
    void pullFromCloud({ force: true });
    return;
  }

  const guest = currentState();
  store.switchAccount(account, { ...signedInProfile(guest, email, mode), syncQueue: [], undo: undefined });
  if (source === "sign-up") return; // brand-new account: nothing in the cloud to reconcile yet
  authState().patch({ cloudMergePreview: buildCloudMergePreview(guest), mergeSource: source });
}

export async function signInWithEmail(emailInput: string, password: string): Promise<AuthResult> {
  const email = emailInput.trim();
  if (!isValidEmail(email)) return { ok: false, error: "Email chưa đúng định dạng." };
  const passwordError = passwordProblem(password, "sign-in");
  if (passwordError) return { ok: false, error: passwordError };
  const payload = await runAuthAction("sign-in", () => evolveFitApiClient.signIn({ email, password, mode: "email" }));
  if (!payload) return busy;
  if (!payload.ok) return { ok: false, error: apiErrorMessage(payload, "Đăng nhập thất bại. Vui lòng thử lại.") };
  await establishSession(payload.data.email || email, payload.data.mode, "sign-in");
  return { ok: true };
}

export async function signUpWithEmail(emailInput: string, password: string): Promise<AuthResult & { needsVerification?: boolean }> {
  const email = emailInput.trim();
  if (!isValidEmail(email)) return { ok: false, error: "Email chưa đúng định dạng." };
  const passwordError = passwordProblem(password, "sign-up");
  if (passwordError) return { ok: false, error: passwordError };
  const payload = await runAuthAction("sign-up", () => evolveFitApiClient.signUp({ email, password }));
  if (!payload) return busy;
  if (!payload.ok) return { ok: false, error: apiErrorMessage(payload, "Đăng ký thất bại. Vui lòng thử lại.") };
  if (payload.data.needsEmailVerification) return { ok: true, needsVerification: true };
  await establishSession(payload.data.email || email, payload.data.mode, "sign-up");
  return { ok: true };
}

export async function requestPasswordReset(emailInput: string): Promise<AuthResult> {
  const email = emailInput.trim();
  if (!isValidEmail(email)) return { ok: false, error: "Nhập email hợp lệ để nhận hướng dẫn." };
  const payload = await runAuthAction("reset-request", () => evolveFitApiClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/reset-password` }));
  if (!payload) return busy;
  if (!payload.ok) return { ok: false, error: apiErrorMessage(payload, "Không gửi được email đặt lại mật khẩu.") };
  return { ok: true, message: "Nếu email đã đăng ký, bạn sẽ nhận được liên kết đặt lại mật khẩu trong vài phút." };
}

export async function resetPassword(resetToken: string, password: string): Promise<AuthResult> {
  if (!resetToken.trim()) return { ok: false, error: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." };
  const passwordError = passwordProblem(password, "sign-up");
  if (passwordError) return { ok: false, error: passwordError };
  const payload = await runAuthAction("reset", () => evolveFitApiClient.resetPassword({ accessToken: resetToken.trim(), password }));
  if (!payload) return busy;
  if (!payload.ok) return { ok: false, error: apiErrorMessage(payload, "Không đặt lại được mật khẩu. Liên kết có thể đã hết hạn.") };
  return { ok: true, message: "Mật khẩu đã được cập nhật. Hãy đăng nhập bằng mật khẩu mới." };
}

export function startGoogleOAuth() {
  window.location.href = evolveFitApiClient.googleOAuthUrl();
}

export async function refreshAuthSession() {
  const payload = await runAuthAction("refresh", () => evolveFitApiClient.refresh());
  if (!payload) return;
  if (!payload.ok) {
    notify(apiErrorMessage(payload, "Không làm mới được phiên đăng nhập."));
    return;
  }
  authState().patch({ sessionExpired: false });
  notify("Phiên đăng nhập đã được làm mới");
}

// --- First sign-in on a device: reconcile guest data with the cloud -----------------------------------

function finishMerge() {
  authState().patch({ cloudMergePreview: null, mergeSource: null });
}

/** Uploads the local data, then adopts the merged cloud result. */
export async function mergeLocalAccountToCloud() {
  const state = currentState();
  const idempotencyKey = `account-merge:${currentAccount() ?? "guest"}`;
  const payload = await runAuthAction("merge", () => evolveFitApiClient.syncBatch({ idempotencyKey, items: buildLocalToCloudSyncItems(state, idempotencyKey) }));
  if (!payload) return;
  if (!payload.ok) {
    notify(apiErrorMessage(payload, "Không đưa được dữ liệu trên máy lên cloud."));
    return;
  }
  const exportPayload = await evolveFitApiClient.exportAccount();
  const onboarded = authState().mergeSource === "sign-in";
  finishMerge();
  const cloudState = exportPayload.ok ? cloudStateFrom(exportPayload.data) : undefined;
  if (cloudState) {
    const { email, authMode } = currentState().profile;
    const cloud = adoptCloudState(state, cloudState, { email, authMode }, onboarded);
    // Local items are already uploaded; keep local preferences on top of the merged collections.
    commit({ ...cloud, profile: { ...cloud.profile, name: state.profile.name || cloud.profile.name } }, "Đã gộp dữ liệu trên máy với tài khoản");
    return;
  }
  notify("Đã đưa dữ liệu lên cloud. Dữ liệu từ các thiết bị khác sẽ được tải ở lần đồng bộ tới.");
}

/** Replaces this device's copy with the account's cloud data. */
export async function replaceLocalWithCloud() {
  const payload = await runAuthAction("replace", () => evolveFitApiClient.exportAccount());
  if (!payload) return;
  if (!payload.ok) {
    notify(apiErrorMessage(payload, "Không tải được dữ liệu cloud."));
    return;
  }
  const cloudState = cloudStateFrom(payload.data);
  if (!cloudState) {
    notify("Dữ liệu tài khoản trên cloud không hợp lệ. Đã giữ dữ liệu trên máy.");
    keepLocalAccountData();
    return;
  }
  const state = currentState();
  const onboarded = authState().mergeSource === "sign-in";
  finishMerge();
  commit(adoptCloudState(state, cloudState, { email: state.profile.email, authMode: state.profile.authMode }, onboarded), "Đã dùng dữ liệu từ tài khoản");
}

/** Keeps this device's copy as the account's starting point without uploading the existing items. */
export function keepLocalAccountData() {
  finishMerge();
  commit((state) => ({ ...state, syncQueue: [] }), "Giữ dữ liệu trên máy. Thay đổi từ giờ sẽ được đồng bộ.");
}

// --- Sign-out / account deletion ------------------------------------------------------------------------

function openGuestNamespace() {
  useAppStore.getState().switchAccount(null, loadState(null));
}

export async function signOutAccount(options: { removeLocalData: boolean }): Promise<boolean> {
  const payload = await runAuthAction("sign-out", () => evolveFitApiClient.signOut());
  if (!payload) return false;
  if (!payload.ok && !isUnauthorized(payload)) {
    notify(apiErrorMessage(payload, "Không đăng xuất được. Vui lòng thử lại."));
    return false;
  }
  const account = currentAccount();
  bumpSessionEpoch();
  authState().patch({ cloudMergePreview: null, mergeSource: null, sessionExpired: false });
  if (options.removeLocalData) removeAccountCache(account);
  openGuestNamespace();
  notify(options.removeLocalData ? "Đã đăng xuất và xoá dữ liệu tài khoản khỏi thiết bị này" : "Đã đăng xuất");
  return true;
}

export async function deleteCloudAccount() {
  const payload = await runAuthAction("delete", () => evolveFitApiClient.deleteAccount());
  if (!payload) return;
  if (!payload.ok) {
    notify(apiErrorMessage(payload, "Xoá tài khoản thất bại."));
    return;
  }
  const account = currentAccount();
  bumpSessionEpoch();
  authState().patch({ cloudMergePreview: null, mergeSource: null, sessionExpired: false });
  removeAccountCache(account);
  openGuestNamespace();
  notify("Đã xóa tài khoản cloud và dữ liệu cá nhân");
}

/** Reconciles the open namespace with the server cookie when the app starts. */
export async function bootstrapSession() {
  const epoch = authState().epoch;
  const result = await evolveFitApiClient.session();
  // The user signed in/out (or the app restarted) while this check was in flight: its answer is stale.
  if (epoch !== authState().epoch) return;
  if (!result.ok) {
    // Offline / server unreachable: keep the cached state; the sync engine will retry and handle 401s itself.
    authState().patch({ sessionChecked: true });
    return;
  }
  const session = result.data;
  if (session.authenticated && session.mode !== "local") {
    await establishSession(session.email, session.mode, "restore");
    return;
  }
  // Keep the account's data and queue, but stop syncing until the user signs in again.
  authState().patch({ sessionChecked: true, ...(currentAccount() ? { sessionExpired: true } : {}) });
}
