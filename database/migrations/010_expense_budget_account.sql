-- Cross-account advances: budget attribution vs cash source
-- Mirror of supabase/migrations/20261106120000_expense_budget_account.sql

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS budget_account_id uuid REFERENCES public.family_accounts(id);

COMMENT ON COLUMN public.expenses.budget_account_id IS
  'Account the budget/envelope attributed the spend to. When different from account_id, cash left paid_from account and a reimbursement may be pending.';

CREATE INDEX IF NOT EXISTS expenses_budget_account_id_idx
  ON public.expenses (family_id, budget_account_id)
  WHERE budget_account_id IS NOT NULL AND is_active IS TRUE;
