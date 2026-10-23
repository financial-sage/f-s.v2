-- Life-segment tag for ordinary expenses (budget dimension).
-- Null for system ledger rows (deposit / withdrawal / transfer).

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS spend_segment text;

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_spend_segment_check;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_spend_segment_check
  CHECK (
    spend_segment IS NULL
    OR spend_segment IN (
      'home',
      'food',
      'mobility',
      'wellbeing',
      'leisure',
      'other'
    )
  );

COMMENT ON COLUMN public.expenses.spend_segment IS
  'Life segment for budgeting (chosen at expense entry). Null for system movements.';

CREATE INDEX IF NOT EXISTS expenses_family_spend_segment_idx
  ON public.expenses (family_id, spend_segment)
  WHERE spend_segment IS NOT NULL AND is_active IS TRUE;
