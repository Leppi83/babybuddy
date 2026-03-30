// BabyBuddy Service Worker — push notifications only, no caching
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Baby Buddy";
  const options = {
    body: data.body || "",
    icon: data.icon || "/static/babybuddy/root/apple-touch-icon.png",
    badge: "/static/babybuddy/root/apple-touch-icon.png",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow(url);
      }),
  );
});
