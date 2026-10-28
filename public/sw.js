importScripts("/push-sw.js");

const CACHE_NAME = "sindescuadre-v1.1.0";
const APP_SHELL = ["/"];

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

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

  // Never fall back to the app shell for JS/CSS/chunks — that returns HTML and
  // surfaces as "Loading chunk … failed" after a Next.js restart / HMR.
  const isStaticAsset =
    url.pathname.startsWith("/_next/") ||
    /\.(?:js|css|map|mjs|woff2?|ttf|otf)$/i.test(url.pathname);

  event.respondWith(
    fetch(event.request).catch(async () => {
      if (isStaticAsset) {
        return Response.error();
      }
      const cachedResponse = await caches.match(event.request);
      return cachedResponse || caches.match("/");
    })
  );
});
