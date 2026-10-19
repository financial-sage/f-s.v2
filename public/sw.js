const CACHE_NAME = "sindescuadre-v1.0.6";
const APP_SHELL = [
  "/",
  "/icons/icon-192.png?v=2",
  "/icons/icon-512.png?v=2",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Always fetch a fresh manifest so installed PWAs can pick up name/icon updates.
  if (url.pathname === "/manifest.json") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const headers = new Headers(response.headers);
          headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cachedResponse = await caches.match(event.request);
      return cachedResponse || caches.match("/");
    })
  );
});
