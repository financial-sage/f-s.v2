-- Track whether the fixed-expenses pocket amount was edited by the user
ALTER TABLE public.fixed_expense_budgets
  ADD COLUMN IF NOT EXISTS is_manual boolean NOT NULL DEFAULT false;
