import { evolveFitApiClient } from "@/lib/api-client";
import { apiErrorMessage } from "@/lib/api-errors";
import { currentState, notify } from "@/lib/store/app-store";
import { useNotificationStore } from "./store";

const store = () => useNotificationStore.getState();

function localProfileId() {
  return currentState().profile.email || "local-profile";
}

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from([...window.atob(base64)].map((char) => char.charCodeAt(0)));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function serviceWorkerRegistration() {
  if (!("serviceWorker" in navigator)) return undefined;
  return navigator.serviceWorker.ready;
}

export async function refreshPushStatus() {
  if (!("Notification" in window)) {
    store().patch({ permission: "default", pushStatus: "unsupported" });
    return;
  }
  store().patch({ permission: Notification.permission });
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    store().patch({ pushStatus: "unsupported" });
    return;
  }
  try {
    const result = await evolveFitApiClient.notificationConfig(localProfileId());
    const config = result.ok ? result.data : undefined;
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || config?.vapidPublicKey || null;
    const registration = await serviceWorkerRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    store().patch({
      vapidPublicKey: key,
      pushConfigured: Boolean(config?.configured && key),
      pushStatus: !key || !config?.configured ? "missing-env" : subscription ? "subscribed" : "unsubscribed"
    });
  } catch {
    store().patch({ pushStatus: "missing-env" });
  }
}

export async function subscribeWebPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    store().patch({ pushStatus: "unsupported" });
    notify("Trình duyệt không hỗ trợ Web Push, sẽ dùng nhắc dự phòng trong app");
    return;
  }
  const key = store().vapidPublicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key || !store().pushConfigured) {
    store().patch({ pushStatus: "missing-env" });
    notify("Thiếu VAPID public key hoặc cấu hình máy chủ, sẽ dùng nhắc trong app");
    return;
  }
  const registration = await serviceWorkerRegistration();
  if (!registration) return;
  let subscription: PushSubscription;
  try {
    subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToArrayBuffer(key) }));
  } catch {
    notify("Trình duyệt từ chối đăng ký thông báo. Hãy kiểm tra quyền thông báo của trang.");
    return;
  }
  const result = await evolveFitApiClient.subscribeNotifications({ ...subscription.toJSON(), localProfileId: localProfileId(), platform: navigator.userAgent.slice(0, 40) });
  if (!result.ok) {
    notify(apiErrorMessage(result, "Không lưu được đăng ký thông báo trên máy chủ."));
    return;
  }
  store().patch({ pushStatus: "subscribed" });
  notify("Đã bật thông báo đẩy");
}

export async function unsubscribeWebPush() {
  const registration = await serviceWorkerRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  const endpoint = subscription?.endpoint;
  await subscription?.unsubscribe().catch(() => undefined);
  if (endpoint) await evolveFitApiClient.unsubscribeNotifications(endpoint);
  store().patch({ pushStatus: store().pushConfigured ? "unsubscribed" : "missing-env" });
  notify("Đã hủy đăng ký Web Push");
}

export async function requestNotifications() {
  if (!("Notification" in window)) {
    notify("Trình duyệt chưa hỗ trợ Notification API");
    return;
  }
  const permission = await Notification.requestPermission();
  store().patch({ permission });
  if (permission === "granted") {
    await subscribeWebPush();
    return;
  }
  notify("Chưa bật quyền thông báo");
}

export async function sendTestPushNotification() {
  if (store().pushStatus !== "subscribed") {
    if (store().permission !== "granted") await requestNotifications();
    else await subscribeWebPush();
  }
  const registration = await serviceWorkerRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  const result = await evolveFitApiClient.sendTestNotification({ endpoint: subscription?.endpoint, localProfileId: localProfileId() });
  if (result.ok && result.data?.sent) {
    notify("Đã gửi thử Web Push");
    return;
  }
  registration?.active?.postMessage({
    type: "EVOLVEFIT_TEST_NOTIFICATION",
    payload: { title: "Thông báo thử EvolveFit", body: "Thông báo dự phòng trong app/dịch vụ nền." }
  });
  notify("Đã dùng thông báo thử bằng cơ chế dự phòng");
}
