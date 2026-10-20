import webpush from "web-push";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { AppUpdatePushPayload } from "@/lib/push";
import { isPushConfigured } from "@/lib/push";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() ||
    (process.env.ADMIN_EMAIL ? `mailto:${process.env.ADMIN_EMAIL}` : "mailto:ops@sindescuadre.app");

  if (!publicKey || !privateKey) {
    throw new Error("Faltan las claves VAPID (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export type StoredPushSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function broadcastAppUpdate(options?: {
  version?: string;
  body?: string;
}): Promise<{ sent: number; removed: number; skipped: boolean }> {
  if (!isPushConfigured()) {
    return { sent: 0, removed: 0, skipped: true };
  }

  ensureVapid();
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as StoredPushSubscription[];
  const version = options?.version ?? process.env.NEXT_PUBLIC_APP_VERSION ?? "1.1.0";
  const payload: AppUpdatePushPayload = {
    type: "app_update",
    version,
    title: "Actualización disponible",
    body: options?.body ?? "Hay una nueva versión de SinDescuadre.",
    url: "/",
  };

  let sent = 0;
  let removed = 0;
  const staleIds: string[] = [];

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          JSON.stringify(payload),
          { TTL: 60 * 60 }
        );
        sent += 1;
      } catch (err) {
        const statusCode =
          err && typeof err === "object" && "statusCode" in err
            ? Number((err as { statusCode?: number }).statusCode)
            : null;
        // Gone / expired subscription
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(row.id);
          removed += 1;
        }
      }
    })
  );

  if (staleIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", staleIds);
  }

  return { sent, removed, skipped: false };
}
