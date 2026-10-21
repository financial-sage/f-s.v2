export type PaddlePlanId = "monthly" | "yearly";

export function isPaddleConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() &&
      process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY?.trim() &&
      process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY?.trim()
  );
}

export function getPaddleEnv(): "sandbox" | "production" {
  const raw = (process.env.NEXT_PUBLIC_PADDLE_ENV ?? "sandbox").toLowerCase();
  return raw === "production" ? "production" : "sandbox";
}

export function getPaddleClientToken(): string | null {
  return process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim() || null;
}

export function getPaddlePriceId(plan: PaddlePlanId): string | null {
  if (plan === "monthly") {
    return process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY?.trim() || null;
  }
  return process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY?.trim() || null;
}

export function getPaddleApiKey(): string | null {
  return process.env.PADDLE_API_KEY?.trim() || null;
}

export function getPaddleWebhookSecret(): string | null {
  const raw = process.env.PADDLE_WEBHOOK_SECRET?.trim() || null;
  if (!raw) return null;
  // Endpoint secret looks like pdl_ntfset_… — ntfset_ alone is the destination ID.
  return raw.replace(/^["']|["']$/g, "").trim() || null;
}

export function paddleWebhookSecretLooksValid(secret: string | null): boolean {
  if (!secret) return false;
  return secret.startsWith("pdl_ntfset_") || secret.startsWith("pdl_");
}

/** Active-enough statuses that unlock Premium. */
export const PADDLE_ACTIVE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);
