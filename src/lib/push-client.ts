"use client";

import { getVapidPublicKey, urlBase64ToUint8Array } from "@/lib/push";

function subscriptionToJSON(subscription: PushSubscription) {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Suscripción push incompleta.");
  }
  return {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  };
}

/**
 * Persist a push subscription when permission is already granted, or (optionally)
 * prompt once when `promptIfNeeded` is true.
 * No-ops when VAPID is not configured or the browser lacks Push support.
 */
export async function ensurePushSubscription(
  registration?: ServiceWorkerRegistration,
  options?: { promptIfNeeded?: boolean }
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  const publicKey = getVapidPublicKey();
  if (!publicKey) return false;

  try {
    let permission = Notification.permission;
    if (permission === "default" && options?.promptIfNeeded) {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") return false;

    const reg = registration ?? (await navigator.serviceWorker.ready);
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }

    const body = subscriptionToJSON(subscription);
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    return res.ok;
  } catch {
    return false;
  }
}
