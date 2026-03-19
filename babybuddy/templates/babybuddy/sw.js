// BabyBuddy Service Worker
const CACHE_NAME = "babybuddy-v{{ STATIC_VERSION }}";
const SW_URL = "/sw.js";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add("/login/").catch(() => {}))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Prevent self-interception
  if (url.pathname === SW_URL) return;

  // API calls: always network
  if (url.pathname.startsWith("/api/")) return;

  // Static assets: cache-first
  if (url.pathname.startsWith("/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok && response.type !== "opaque") {
              const cloned = response.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, cloned));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // HTML navigation: network-first with offline fallback
  if (
    request.mode === "navigate" ||
    request.headers.get("Accept")?.includes("text/html")
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.type !== "opaque") {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const login = await caches.match("/login/");
          if (login) return login;
          return new Response("App is offline. Please reconnect.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }),
    );
  }
});
