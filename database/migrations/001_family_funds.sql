-- Multi-funds (bolsillos)
-- Run in Supabase SQL editor / migration pipeline.

-- 1) Funds table
CREATE TABLE IF NOT EXISTS public.family_funds (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('shared', 'personal')),
  owner_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_default boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT family_funds_pkey PRIMARY KEY (id),
  CONSTRAINT family_funds_personal_owner_chk CHECK (
    (scope = 'personal' AND owner_profile_id IS NOT NULL)
    OR (scope = 'shared' AND owner_profile_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS family_funds_family_id_idx ON public.family_funds(family_id);
CREATE INDEX IF NOT EXISTS family_funds_owner_idx ON public.family_funds(owner_profile_id);

-- Unique active names per family+scope (+owner for personal)
CREATE UNIQUE INDEX IF NOT EXISTS family_funds_shared_name_uq
  ON public.family_funds (family_id, lower(name))
  WHERE scope = 'shared' AND archived_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS family_funds_personal_name_uq
  ON public.family_funds (family_id, owner_profile_id, lower(name))
  WHERE scope = 'personal' AND archived_at IS NULL;

-- 2) Expense columns
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS fund_id uuid REFERENCES public.family_funds(id),
  ADD COLUMN IF NOT EXISTS paid_from_fund boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS transfer_group_id uuid;

CREATE INDEX IF NOT EXISTS expenses_fund_id_idx ON public.expenses(fund_id);
CREATE INDEX IF NOT EXISTS expenses_transfer_group_id_idx ON public.expenses(transfer_group_id);

-- 3) Ensure system funds for every family
INSERT INTO public.family_funds (family_id, name, scope, owner_profile_id, is_default, is_system, sort_order)
SELECT f.id, 'Fondo común', 'shared', NULL, true, true, 0
FROM public.families f
WHERE NOT EXISTS (
  SELECT 1 FROM public.family_funds ff
  WHERE ff.family_id = f.id AND ff.scope = 'shared' AND ff.is_default = true AND ff.archived_at IS NULL
);

INSERT INTO public.family_funds (family_id, name, scope, owner_profile_id, is_default, is_system, sort_order)
SELECT p.family_id, 'Mi fondo', 'personal', p.id, true, true, 10
FROM public.profiles p
WHERE p.family_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.family_funds ff
    WHERE ff.family_id = p.family_id
      AND ff.scope = 'personal'
      AND ff.owner_profile_id = p.id
      AND ff.archived_at IS NULL
  );

-- 4) Backfill fund_id for legacy joint_fund rows
UPDATE public.expenses e
SET fund_id = ff.id
FROM public.family_funds ff
WHERE e.family_id = ff.family_id
  AND ff.scope = 'shared'
  AND ff.is_default = true
  AND e.fund_id IS NULL
  AND e.responsible_for IN ('joint_fund', 'fondo_comun', 'shared', 'compartido');

-- Personal deposits / personal responsibility
UPDATE public.expenses e
SET fund_id = ff.id
FROM public.family_funds ff
WHERE e.family_id = ff.family_id
  AND ff.scope = 'personal'
  AND ff.owner_profile_id::text = e.responsible_for
  AND e.fund_id IS NULL
  AND e.responsible_for IS NOT NULL
  AND e.responsible_for NOT IN ('joint_fund', 'fondo_comun', 'shared', 'compartido', 'partner', 'pareja', 'mio');

-- Remaining personal rows by paid_by when responsible_for points to self-ish aliases
UPDATE public.expenses e
SET fund_id = ff.id
FROM public.family_funds ff
WHERE e.family_id = ff.family_id
  AND ff.scope = 'personal'
  AND ff.owner_profile_id = e.paid_by
  AND e.fund_id IS NULL
  AND (e.responsible_for IS NULL OR e.responsible_for IN ('mio') OR e.responsible_for = e.paid_by::text);

-- RLS (adjust to match your existing policies style)
ALTER TABLE public.family_funds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_funds_select_member ON public.family_funds;
CREATE POLICY family_funds_select_member ON public.family_funds
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS family_funds_insert_member ON public.family_funds;
CREATE POLICY family_funds_insert_member ON public.family_funds
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS family_funds_update_member ON public.family_funds;
CREATE POLICY family_funds_update_member ON public.family_funds
  FOR UPDATE USING (
    family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid())
  );
