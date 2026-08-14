self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("evolvefit-v1").then((cache) => cache.addAll(["/", "/manifest.webmanifest", "/icon.svg"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open("evolvefit-v1").then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/")))
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

  if (event.action === "snooze") return;

  const actionUrl =
    event.action === "log-water-250"
      ? "/?quickAction=log-water-250"
      : event.action === "log-creatine"
        ? "/?quickAction=log-creatine"
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
