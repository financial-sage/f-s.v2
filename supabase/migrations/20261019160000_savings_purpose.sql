-- Savings MVP: allow purpose = 'savings' on family_funds (+ unique active pot per family)

ALTER TABLE public.family_funds
  DROP CONSTRAINT IF EXISTS family_funds_purpose_check;

ALTER TABLE public.family_funds
  ADD CONSTRAINT family_funds_purpose_check
  CHECK (purpose = ANY (ARRAY['general'::text, 'fixed_expenses'::text, 'savings'::text]));

CREATE UNIQUE INDEX IF NOT EXISTS family_funds_savings_uq
  ON public.family_funds (family_id)
  WHERE (purpose = 'savings' AND archived_at IS NULL);
