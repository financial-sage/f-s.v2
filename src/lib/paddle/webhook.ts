import { EventName } from "@paddle/paddle-node-sdk";
import type { EventEntity } from "@paddle/paddle-node-sdk";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getPaddleServer } from "@/lib/paddle/client";
import { getPaddleWebhookSecret } from "@/lib/paddle/config";
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

function resolveUserId(customData: CustomData, customerId?: string | null) {
  if (customData.supabase_user_id) return customData.supabase_user_id;
  return null;
}

async function resolveUserIdFromCustomer(
  customerId: string | null | undefined,
  customData: CustomData
): Promise<{ userId: string | null; familyId: string | null }> {
  const fromCustom = resolveUserId(customData);
  const familyId =
    typeof customData.family_id === "string" ? customData.family_id : null;

  if (fromCustom) {
    return { userId: fromCustom, familyId };
  }

  if (!customerId) return { userId: null, familyId };

  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, family_id")
    .eq("paddle_customer_id", customerId)
    .maybeSingle();

  if (data) {
    return {
      userId: (data as { id: string }).id,
      familyId:
        familyId ??
        ((data as { family_id?: string | null }).family_id ?? null),
    };
  }

  return { userId: null, familyId };
}

async function upsertSubscription(input: {
  userId: string;
  familyId: string | null;
  subscriptionId: string;
  customerId: string | null;
  priceId: string | null;
  status: string;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  raw: unknown;
}) {
  const admin = getSupabaseAdminClient();

  if (input.customerId) {
    await admin
      .from("profiles")
      .update({ paddle_customer_id: input.customerId } as never)
      .eq("id", input.userId);
  }

  const { error } = await admin.from("billing_subscriptions").upsert(
    {
      user_id: input.userId,
      family_id: input.familyId,
      paddle_subscription_id: input.subscriptionId,
      paddle_customer_id: input.customerId,
      paddle_price_id: input.priceId,
      status: input.status,
      current_period_end: input.periodEnd,
      cancel_at_period_end: input.cancelAtPeriodEnd,
      raw: input.raw as never,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "paddle_subscription_id" }
  );

  if (error) {
    throw new Error(error.message);
  }

  await syncUserPremiumFromBilling(input.userId);
}

async function handleSubscriptionEvent(event: EventEntity) {
  const data = event.data as {
    id: string;
    status: string;
    customerId: string;
    customData?: unknown;
    currentBillingPeriod?: { endsAt?: string | null } | null;
    scheduledChange?: { action?: string | null } | null;
    items?: Array<{ price?: { id?: string } | null }>;
  };

  const customData = asCustomData(data.customData);
  const { userId, familyId } = await resolveUserIdFromCustomer(
    data.customerId,
    customData
  );

  if (!userId) {
    console.warn("[paddle] subscription event without supabase_user_id", {
      subscriptionId: data.id,
      eventType: event.eventType,
    });
    return;
  }

  const priceId = data.items?.[0]?.price?.id ?? null;
  const cancelAtPeriodEnd = data.scheduledChange?.action === "cancel";

  await upsertSubscription({
    userId,
    familyId,
    subscriptionId: data.id,
    customerId: data.customerId ?? null,
    priceId,
    status: String(data.status ?? "unknown"),
    periodEnd: data.currentBillingPeriod?.endsAt ?? null,
    cancelAtPeriodEnd,
    raw: data,
  });
}

async function handleTransactionCompleted(event: EventEntity) {
  const data = event.data as {
    id: string;
    status: string;
    customerId?: string | null;
    subscriptionId?: string | null;
    customData?: unknown;
    billedAt?: string | null;
    details?: {
      totals?: {
        grandTotal?: string | null;
        total?: string | null;
        currencyCode?: string | null;
      } | null;
    } | null;
    currencyCode?: string | null;
  };

  const customData = asCustomData(data.customData);
  const { userId, familyId } = await resolveUserIdFromCustomer(
    data.customerId,
    customData
  );

  const totalStr =
    data.details?.totals?.grandTotal ??
    data.details?.totals?.total ??
    "0";
  // Paddle amounts are typically in lowest currency unit as string.
  const amountCents = Math.round(Number.parseFloat(totalStr) || 0);
  const currency =
    data.details?.totals?.currencyCode ?? data.currencyCode ?? "EUR";

  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("billing_transactions").upsert(
    {
      user_id: userId,
      family_id: familyId,
      paddle_transaction_id: data.id,
      paddle_subscription_id: data.subscriptionId ?? null,
      amount_cents: amountCents,
      currency,
      status: String(data.status ?? "completed"),
      billed_at: data.billedAt ?? new Date().toISOString(),
      raw: data as never,
    } as never,
    { onConflict: "paddle_transaction_id" }
  );

  if (error) {
    throw new Error(error.message);
  }

  if (userId) {
    await syncUserPremiumFromBilling(userId);
  }
}

export async function processPaddleWebhook(
  rawBody: string,
  signature: string
): Promise<{ ok: true; eventType: string }> {
  const secret = getPaddleWebhookSecret();
  if (!secret) {
    throw new Error("Falta PADDLE_WEBHOOK_SECRET.");
  }

  const paddle = getPaddleServer();
  const event = await paddle.webhooks.unmarshal(rawBody, secret, signature);

  switch (event.eventType) {
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionUpdated:
    case EventName.SubscriptionActivated:
    case EventName.SubscriptionTrialing:
    case EventName.SubscriptionPastDue:
    case EventName.SubscriptionCanceled:
    case EventName.SubscriptionPaused:
    case EventName.SubscriptionResumed:
      await handleSubscriptionEvent(event);
      break;
    case EventName.TransactionCompleted:
    case EventName.TransactionPaid:
      await handleTransactionCompleted(event);
      break;
    default:
      break;
  }

  return { ok: true, eventType: String(event.eventType) };
}
