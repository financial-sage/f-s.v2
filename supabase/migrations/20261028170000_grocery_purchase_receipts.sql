-- Superadmin trial: grocery pocket flag + purchase receipt line history for price compare.

ALTER TABLE public.family_funds
  ADD COLUMN IF NOT EXISTS is_grocery boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.purchase_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  fund_id uuid REFERENCES public.family_funds(id) ON DELETE SET NULL,
  merchant text,
  purchased_at date,
  total numeric(12, 2),
  currency text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT purchase_receipts_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS purchase_receipts_family_purchased_idx
  ON public.purchase_receipts (family_id, purchased_at DESC);

CREATE INDEX IF NOT EXISTS purchase_receipts_family_fund_idx
  ON public.purchase_receipts (family_id, fund_id, purchased_at DESC);

CREATE TABLE IF NOT EXISTS public.purchase_receipt_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.purchase_receipts(id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_key text NOT NULL,
  quantity numeric(12, 3),
  unit_price numeric(12, 2),
  line_total numeric(12, 2),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT purchase_receipt_lines_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS purchase_receipt_lines_receipt_idx
  ON public.purchase_receipt_lines (receipt_id, sort_order);

CREATE INDEX IF NOT EXISTS purchase_receipt_lines_family_key_idx
  ON public.purchase_receipt_lines (family_id, name_key, created_at DESC);

ALTER TABLE public.purchase_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_receipt_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS purchase_receipts_select_member ON public.purchase_receipts;
CREATE POLICY purchase_receipts_select_member ON public.purchase_receipts
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS purchase_receipts_insert_member ON public.purchase_receipts;
CREATE POLICY purchase_receipts_insert_member ON public.purchase_receipts
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS purchase_receipts_update_member ON public.purchase_receipts;
CREATE POLICY purchase_receipts_update_member ON public.purchase_receipts
  FOR UPDATE USING (
    family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS purchase_receipts_delete_member ON public.purchase_receipts;
CREATE POLICY purchase_receipts_delete_member ON public.purchase_receipts
  FOR DELETE USING (
    family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS purchase_receipt_lines_select_member ON public.purchase_receipt_lines;
CREATE POLICY purchase_receipt_lines_select_member ON public.purchase_receipt_lines
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS purchase_receipt_lines_insert_member ON public.purchase_receipt_lines;
CREATE POLICY purchase_receipt_lines_insert_member ON public.purchase_receipt_lines
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS purchase_receipt_lines_update_member ON public.purchase_receipt_lines;
CREATE POLICY purchase_receipt_lines_update_member ON public.purchase_receipt_lines
  FOR UPDATE USING (
    family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS purchase_receipt_lines_delete_member ON public.purchase_receipt_lines;
CREATE POLICY purchase_receipt_lines_delete_member ON public.purchase_receipt_lines
  FOR DELETE USING (
    family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid())
  );
