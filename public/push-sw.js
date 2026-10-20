/**
 * Shared Web Push handlers for the SinDescuadre service worker.
 * Loaded by public/sw.js (dev/custom) and worker/index.js (next-pwa prod).
 */

const APP_UPDATE_MSG = "APP_UPDATE_AVAILABLE";

self.addEventListener("push", (event) => {
  event.waitUntil(handlePushEvent(event));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          client.postMessage({
            type: APP_UPDATE_MSG,
            version: event.notification.data?.version ?? null,
            source: "notificationclick",
          });
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});

async function handlePushEvent(event) {
  let payload = { type: "app_update" };
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch {
    try {
      payload = { type: "app_update", body: event.data?.text() };
    } catch {
      // keep default
    }
  }

  const type = payload.type || "app_update";
  const version = payload.version ?? null;
  const title = payload.title || "SinDescuadre";
  const body =
    payload.body ||
    (type === "app_update"
      ? "Hay una nueva versión. Toca para actualizar."
      : "Tienes una notificación nueva.");

  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  if (type === "app_update") {
    for (const client of clients) {
      client.postMessage({
        type: APP_UPDATE_MSG,
        version,
        source: "push",
      });
    }
  }

  const anyFocused = clients.some((client) => client.focused);
  // With the app open and focused, only enable the in-app update button.
  if (type === "app_update" && anyFocused && !payload.forceNotification) {
    return;
  }

  await self.registration.showNotification(title, {
    body,
    icon: "/icons/v3/icon-192.png",
    badge: "/icons/v3/icon-192.png",
    tag: type === "app_update" ? "app-update" : "general",
    renotify: true,
    data: {
      url: payload.url || "/",
      version,
      type,
    },
  });
}
