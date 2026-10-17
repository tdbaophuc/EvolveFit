// Bump CACHE_VERSION whenever cached shell assets change; old caches are deleted on activate.
const CACHE_VERSION = "evolvefit-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(["/", "/manifest.webmanifest", "/icon.svg"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Never cache API calls (personal data, auth state) or other origins such as the hosted API.
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "EvolveFit",
    body: "Bạn có nhắc nhở mới.",
    tag: "evolvefit-reminder",
    actions: []
  };

  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    // Keep default payload when push body is empty or not JSON.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: payload.data || { url: "/" },
      actions: payload.actions.length
        ? payload.actions
        : [
            { action: "log-water-250", title: "Log 250ml" },
            { action: "snooze", title: "Snooze" }
          ]
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const actionUrl =
    event.action === "log-water-250"
      ? "/?quickAction=log-water-250"
      : event.action === "log-creatine"
        ? "/?quickAction=log-creatine"
        : event.action === "snooze"
          ? "/?quickAction=snooze-reminders"
          : event.action === "open-progress"
            ? "/?tab=progress"
            : event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => "focus" in client);
      if (existing) {
        existing.navigate(actionUrl);
        return existing.focus();
      }
      return self.clients.openWindow(actionUrl);
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "EVOLVEFIT_TEST_NOTIFICATION") return;
  event.waitUntil(
    self.registration.showNotification(event.data.payload?.title || "EvolveFit test", {
      body: event.data.payload?.body || "Notifications are ready.",
      tag: "test-notification",
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: "/" },
      actions: [
        { action: "log-water-250", title: "Log 250ml" },
        { action: "snooze", title: "Snooze" }
      ]
    })
  );
});
