-- Fixed expenses module: purpose on funds + templates, payments, budgets

ALTER TABLE public.family_funds
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'general';

ALTER TABLE public.family_funds
  DROP CONSTRAINT IF EXISTS family_funds_purpose_check;

ALTER TABLE public.family_funds
  ADD CONSTRAINT family_funds_purpose_check
  CHECK (purpose = ANY (ARRAY['general'::text, 'fixed_expenses'::text]));

CREATE UNIQUE INDEX IF NOT EXISTS family_funds_fixed_expenses_uq
  ON public.family_funds (family_id)
  WHERE (purpose = 'fixed_expenses' AND archived_at IS NULL);

CREATE TABLE IF NOT EXISTS public.fixed_expenses (
  id          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  family_id   uuid                     NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name        text                     NOT NULL,
  base_value  numeric(12,2)            NOT NULL,
  due_day     integer,
  is_active   boolean                  NOT NULL DEFAULT true,
  sort_order  integer                  NOT NULL DEFAULT 0,
  created_at  timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at  timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT fixed_expenses_pkey PRIMARY KEY (id),
  CONSTRAINT fixed_expenses_base_value_check CHECK (base_value >= (0)::numeric),
  CONSTRAINT fixed_expenses_due_day_check CHECK ((due_day IS NULL) OR ((due_day >= 1) AND (due_day <= 28))),
  CONSTRAINT fixed_expenses_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS fixed_expenses_family_id_idx
  ON public.fixed_expenses USING btree (family_id);

CREATE TABLE IF NOT EXISTS public.fixed_expense_payments (
  id                   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  family_id            uuid                     NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  fixed_expense_id     uuid                     NOT NULL REFERENCES public.fixed_expenses(id) ON DELETE CASCADE,
  month_key            text                     NOT NULL,
  base_value_snapshot  numeric(12,2)            NOT NULL,
  real_value           numeric(12,2),
  status               text                     NOT NULL DEFAULT 'pending',
  paid_at              timestamp with time zone,
  paid_by              uuid                     REFERENCES public.profiles(id) ON DELETE SET NULL,
  expense_id           uuid                     REFERENCES public.expenses(id) ON DELETE SET NULL,
  created_at           timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at           timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT fixed_expense_payments_pkey PRIMARY KEY (id),
  CONSTRAINT fixed_expense_payments_status_check CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text])),
  CONSTRAINT fixed_expense_payments_month_key_check CHECK (month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  CONSTRAINT fixed_expense_payments_base_value_check CHECK (base_value_snapshot >= (0)::numeric),
  CONSTRAINT fixed_expense_payments_real_value_check CHECK ((real_value IS NULL) OR (real_value > (0)::numeric)),
  CONSTRAINT fixed_expense_payments_unique UNIQUE (fixed_expense_id, month_key)
);

CREATE INDEX IF NOT EXISTS fixed_expense_payments_family_month_idx
  ON public.fixed_expense_payments USING btree (family_id, month_key);

CREATE TABLE IF NOT EXISTS public.fixed_expense_budgets (
  family_id     uuid                     NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  month_key     text                     NOT NULL,
  total_budget  numeric(12,2)            NOT NULL DEFAULT 0,
  created_at    timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at    timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT fixed_expense_budgets_pkey PRIMARY KEY (family_id, month_key),
  CONSTRAINT fixed_expense_budgets_month_key_check CHECK (month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  CONSTRAINT fixed_expense_budgets_total_check CHECK (total_budget >= (0)::numeric)
);

ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_expense_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_expense_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fixed_expenses_select_member" ON public.fixed_expenses;
CREATE POLICY "fixed_expenses_select_member" ON public.fixed_expenses
  FOR SELECT TO PUBLIC
  USING (family_id IN (SELECT profiles.family_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "fixed_expenses_insert_member" ON public.fixed_expenses;
CREATE POLICY "fixed_expenses_insert_member" ON public.fixed_expenses
  FOR INSERT TO PUBLIC
  WITH CHECK (family_id IN (SELECT profiles.family_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "fixed_expenses_update_member" ON public.fixed_expenses;
CREATE POLICY "fixed_expenses_update_member" ON public.fixed_expenses
  FOR UPDATE TO PUBLIC
  USING (family_id IN (SELECT profiles.family_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "fixed_expenses_delete_member" ON public.fixed_expenses;
CREATE POLICY "fixed_expenses_delete_member" ON public.fixed_expenses
  FOR DELETE TO PUBLIC
  USING (family_id IN (SELECT profiles.family_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "fixed_expense_payments_select_member" ON public.fixed_expense_payments;
CREATE POLICY "fixed_expense_payments_select_member" ON public.fixed_expense_payments
  FOR SELECT TO PUBLIC
  USING (family_id IN (SELECT profiles.family_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "fixed_expense_payments_insert_member" ON public.fixed_expense_payments;
CREATE POLICY "fixed_expense_payments_insert_member" ON public.fixed_expense_payments
  FOR INSERT TO PUBLIC
  WITH CHECK (family_id IN (SELECT profiles.family_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "fixed_expense_payments_update_member" ON public.fixed_expense_payments;
CREATE POLICY "fixed_expense_payments_update_member" ON public.fixed_expense_payments
  FOR UPDATE TO PUBLIC
  USING (family_id IN (SELECT profiles.family_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "fixed_expense_payments_delete_member" ON public.fixed_expense_payments;
CREATE POLICY "fixed_expense_payments_delete_member" ON public.fixed_expense_payments
  FOR DELETE TO PUBLIC
  USING (family_id IN (SELECT profiles.family_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "fixed_expense_budgets_select_member" ON public.fixed_expense_budgets;
CREATE POLICY "fixed_expense_budgets_select_member" ON public.fixed_expense_budgets
  FOR SELECT TO PUBLIC
  USING (family_id IN (SELECT profiles.family_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "fixed_expense_budgets_insert_member" ON public.fixed_expense_budgets;
CREATE POLICY "fixed_expense_budgets_insert_member" ON public.fixed_expense_budgets
  FOR INSERT TO PUBLIC
  WITH CHECK (family_id IN (SELECT profiles.family_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "fixed_expense_budgets_update_member" ON public.fixed_expense_budgets;
CREATE POLICY "fixed_expense_budgets_update_member" ON public.fixed_expense_budgets
  FOR UPDATE TO PUBLIC
  USING (family_id IN (SELECT profiles.family_id FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "fixed_expense_budgets_delete_member" ON public.fixed_expense_budgets;
CREATE POLICY "fixed_expense_budgets_delete_member" ON public.fixed_expense_budgets
  FOR DELETE TO PUBLIC
  USING (family_id IN (SELECT profiles.family_id FROM public.profiles WHERE profiles.id = auth.uid()));

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.fixed_expenses TO anon, authenticated, service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.fixed_expense_payments TO anon, authenticated, service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.fixed_expense_budgets TO anon, authenticated, service_role;
