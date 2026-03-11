// BabyBuddy Service Worker v2
// Enables PWA install prompt and basic offline support.

const CACHE = "babybuddy-v2";

self.addEventListener("install", (event) => {
  // Pre-cache the login page so there's always an offline fallback
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add("/login/").catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API calls: always go to network, no caching
  if (url.pathname.startsWith("/api/")) return;

  // Static assets (fingerprinted by WhiteNoise): cache-first
  if (url.pathname.startsWith("/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // HTML pages: network-first, fall back to cache for offline
  if (request.mode === "navigate" || request.headers.get("Accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Return cached version of this page if available
          const cached = await caches.match(request);
          if (cached) return cached;
          // Fall back to cached login page
          const login = await caches.match("/login/");
          if (login) return login;
          // Last resort: plain offline message
          return new Response("App is offline. Please connect to the internet.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        })
    );
  }
});
