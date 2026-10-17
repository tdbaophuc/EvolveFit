import { create } from "zustand";
import type { CloudMergePreview } from "@evolvefit/shared";

export type AuthAction = "sign-in" | "sign-up" | "refresh" | "reset-request" | "reset" | "merge" | "replace" | "sign-out" | "delete";
/** How the current account was opened on this device; sign-in means an existing (already onboarded) account. */
export type SessionSource = "sign-in" | "sign-up" | "restore";

type AuthStore = {
  pending: AuthAction | null;
  /** True once a pending request has taken long enough that the user should be told the server is waking up. */
  slow: boolean;
  /** Set on the first sign-in of an account on this device: the user must choose how to reconcile local data. */
  cloudMergePreview: CloudMergePreview | null;
  mergeSource: SessionSource | null;
  /** The server no longer accepts our session; sync is paused until the user signs in again. */
  sessionExpired: boolean;
  /** True once the session was confirmed with the server this run; sync waits for it to avoid sending with a dead cookie. */
  sessionChecked: boolean;
  /**
   * Bumped whenever the session changes on purpose (sign-in, sign-out, account deletion, app start).
   * Slow background checks compare it to ignore results that started before the change.
   */
  epoch: number;
  patch: (next: Partial<Omit<AuthStore, "patch" | "reset">>) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  pending: null,
  slow: false,
  cloudMergePreview: null,
  mergeSource: null,
  sessionExpired: false,
  sessionChecked: false,
  epoch: 0,
  patch: (next) => set(next),
  reset: () => set((store) => ({ pending: null, slow: false, cloudMergePreview: null, mergeSource: null, sessionExpired: false, sessionChecked: false, epoch: store.epoch + 1 }))
}));

export function authState() {
  return useAuthStore.getState();
}

export function bumpSessionEpoch() {
  authState().patch({ epoch: authState().epoch + 1 });
}
