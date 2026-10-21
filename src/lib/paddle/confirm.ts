import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getPaddleServer } from "@/lib/paddle/client";
import { syncUserPremiumFromBilling } from "@/lib/paddle/sync";

type CustomData = {
  supabase_user_id?: string;
  family_id?: string;
  [key: string]: unknown;
};

function asCustomData(raw: unknown): CustomData {
  if (!raw || typeof raw !== "object") return {};
  return raw as CustomData;
}

/**
 * After Overlay checkout completes, pull the transaction (+ subscription)
 * from Paddle and unlock Premium. Works even if the webhook is delayed/misconfigured.
 */
export async function confirmPaddleTransactionForUser(input: {
  userId: string;
  transactionId: string;
}) {
  const paddle = getPaddleServer();
  const txn = await paddle.transactions.get(input.transactionId);

  const customData = asCustomData(txn.customData);
  const customUserId =
    typeof customData.supabase_user_id === "string"
      ? customData.supabase_user_id
      : null;

  if (customUserId && customUserId !== input.userId) {
    throw new Error("Esta compra no corresponde a tu sesión.");
  }

  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("family_id")
    .eq("id", input.userId)
    .maybeSingle();

  const familyId =
    (typeof customData.family_id === "string" ? customData.family_id : null) ??
    ((profile as { family_id?: string | null } | null)?.family_id ?? null);

  const customerId = txn.customerId ?? null;
  if (customerId) {
    await admin
      .from("profiles")
      .update({ paddle_customer_id: customerId } as never)
      .eq("id", input.userId);
  }

  const subscriptionId =
    (txn as { subscriptionId?: string | null }).subscriptionId ?? null;

  if (subscriptionId) {
    const sub = await paddle.subscriptions.get(subscriptionId);
    const priceId = sub.items?.[0]?.price?.id ?? null;
    const periodEnd = sub.currentBillingPeriod?.endsAt ?? null;
    const cancelAtPeriodEnd = sub.scheduledChange?.action === "cancel";

    const { error: subError } = await admin.from("billing_subscriptions").upsert(
      {
        user_id: input.userId,
        family_id: familyId,
        paddle_subscription_id: sub.id,
        paddle_customer_id: sub.customerId ?? customerId,
        paddle_price_id: priceId,
        status: String(sub.status ?? "active"),
        current_period_end: periodEnd,
        cancel_at_period_end: cancelAtPeriodEnd,
        raw: sub as never,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "paddle_subscription_id" }
    );

    if (subError) throw new Error(subError.message);
  }

  const totals = txn.details?.totals as
    | { grandTotal?: string | null; total?: string | null; currencyCode?: string | null }
    | undefined;
  const totalStr = totals?.grandTotal ?? totals?.total ?? "0";
  const amountCents = Math.round(Number.parseFloat(totalStr) || 0);
  const currency =
    totals?.currencyCode ??
    (txn as { currencyCode?: string }).currencyCode ??
    "EUR";

  const { error: txError } = await admin.from("billing_transactions").upsert(
    {
      user_id: input.userId,
      family_id: familyId,
      paddle_transaction_id: txn.id,
      paddle_subscription_id: subscriptionId,
      amount_cents: amountCents,
      currency,
      status: String(txn.status ?? "completed"),
      billed_at:
        (txn as { billedAt?: string | null }).billedAt ??
        new Date().toISOString(),
      raw: txn as never,
    } as never,
    { onConflict: "paddle_transaction_id" }
  );

  if (txError) throw new Error(txError.message);

  await syncUserPremiumFromBilling(input.userId);

  // Always queue welcome on successful checkout confirm (webhook may have
  // marked the household Premium a moment earlier and skipped the queue).
  const { queuePremiumWelcomeForFamily, queuePremiumWelcomeForUsers } =
    await import("@/lib/premiumServer");
  if (familyId) {
    await queuePremiumWelcomeForFamily(familyId, "paid");
  } else {
    await queuePremiumWelcomeForUsers([input.userId], {
      variant: "solo",
      source: "paid",
    });
  }

  return { ok: true as const, subscriptionId, familyId };
}
