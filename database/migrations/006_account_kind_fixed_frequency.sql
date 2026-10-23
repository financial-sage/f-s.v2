-- ADR-0010: account kinds (credit / investment) + fixed-expense multi-period frequency

ALTER TABLE public.family_accounts
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'checking';

ALTER TABLE public.family_accounts
  DROP CONSTRAINT IF EXISTS family_accounts_kind_check;

ALTER TABLE public.family_accounts
  ADD CONSTRAINT family_accounts_kind_check
  CHECK (kind = ANY (ARRAY['checking'::text, 'credit'::text, 'investment'::text]));

ALTER TABLE public.fixed_expenses
  ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'monthly';

ALTER TABLE public.fixed_expenses
  ADD COLUMN IF NOT EXISTS anchor_month integer NOT NULL DEFAULT 1;

ALTER TABLE public.fixed_expenses
  DROP CONSTRAINT IF EXISTS fixed_expenses_frequency_check;

ALTER TABLE public.fixed_expenses
  ADD CONSTRAINT fixed_expenses_frequency_check
  CHECK (
    frequency = ANY (
      ARRAY[
        'monthly'::text,
        'bimonthly'::text,
        'quarterly'::text,
        'semiannual'::text,
        'annual'::text
      ]
    )
  );

ALTER TABLE public.fixed_expenses
  DROP CONSTRAINT IF EXISTS fixed_expenses_anchor_month_check;

ALTER TABLE public.fixed_expenses
  ADD CONSTRAINT fixed_expenses_anchor_month_check
  CHECK (anchor_month >= 1 AND anchor_month <= 12);
