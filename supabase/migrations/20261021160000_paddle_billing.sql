-- Paddle Billing: individual subscription shared with household partner.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS paddle_customer_id text;

COMMENT ON COLUMN public.profiles.paddle_customer_id IS
  'Paddle Billing customer id linked to this Auth user.';

CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  family_id uuid REFERENCES public.families(id) ON DELETE SET NULL,
  paddle_subscription_id text NOT NULL UNIQUE,
  paddle_customer_id text,
  paddle_price_id text,
  status text NOT NULL DEFAULT 'unknown',
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_subscriptions_user_id_idx
  ON public.billing_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS billing_subscriptions_family_id_idx
  ON public.billing_subscriptions (family_id);

CREATE INDEX IF NOT EXISTS billing_subscriptions_status_idx
  ON public.billing_subscriptions (status);

COMMENT ON TABLE public.billing_subscriptions IS
  'Paddle subscriptions owned by a user; Premium is shared with their household.';

CREATE TABLE IF NOT EXISTS public.billing_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  family_id uuid REFERENCES public.families(id) ON DELETE SET NULL,
  paddle_transaction_id text NOT NULL UNIQUE,
  paddle_subscription_id text,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'unknown',
  billed_at timestamptz,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_transactions_billed_at_idx
  ON public.billing_transactions (billed_at DESC);

CREATE INDEX IF NOT EXISTS billing_transactions_user_id_idx
  ON public.billing_transactions (user_id);

COMMENT ON TABLE public.billing_transactions IS
  'Completed Paddle charges for admin revenue reporting.';

-- Service role / backend only; no direct client access.
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;
