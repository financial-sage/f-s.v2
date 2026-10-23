-- Investment display currency (foreign-currency valued assets)

ALTER TABLE public.family_accounts
  ADD COLUMN IF NOT EXISTS currency_code text;

ALTER TABLE public.family_accounts
  DROP CONSTRAINT IF EXISTS family_accounts_currency_code_check;

ALTER TABLE public.family_accounts
  ADD CONSTRAINT family_accounts_currency_code_check
  CHECK (
    currency_code IS NULL
    OR currency_code = ANY (ARRAY['EUR'::text, 'COP'::text, 'USD'::text, 'GBP'::text, 'MXN'::text, 'CHF'::text, 'BRL'::text])
  );

COMMENT ON COLUMN public.family_accounts.currency_code IS
  'Display currency for valued investments (and optional future use). NULL = household app currency.';
