-- Accounts (cuentas) — bank-like liquidity layer
-- Run in Supabase SQL editor / migration pipeline.
-- Product: docs/product/features/accounts/technical-spec.md

-- 1) Accounts table
CREATE TABLE IF NOT EXISTS public.family_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('personal', 'shared')),
  owner_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'family_visible')),
  color text,
  sort_order integer NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT family_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT family_accounts_personal_owner_chk CHECK (
    (scope = 'personal' AND owner_profile_id IS NOT NULL)
    OR (scope = 'shared' AND owner_profile_id IS NULL)
  ),
  CONSTRAINT family_accounts_shared_visibility_chk CHECK (
    scope = 'personal' OR visibility = 'family_visible'
  )
);

CREATE INDEX IF NOT EXISTS family_accounts_family_id_idx ON public.family_accounts(family_id);
CREATE INDEX IF NOT EXISTS family_accounts_owner_idx ON public.family_accounts(owner_profile_id);

CREATE UNIQUE INDEX IF NOT EXISTS family_accounts_shared_name_uq
  ON public.family_accounts (family_id, lower(name))
  WHERE scope = 'shared' AND archived_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS family_accounts_personal_name_uq
  ON public.family_accounts (family_id, owner_profile_id, lower(name))
  WHERE scope = 'personal' AND archived_at IS NULL;

-- 2) Expense ledger columns for account cash movements
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.family_accounts(id),
  ADD COLUMN IF NOT EXISTS paid_from_account boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS expenses_account_id_idx ON public.expenses(account_id);

-- 3) RLS
ALTER TABLE public.family_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_accounts_select_member ON public.family_accounts;
CREATE POLICY family_accounts_select_member ON public.family_accounts
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid())
    AND (
      scope = 'shared'
      OR owner_profile_id = auth.uid()
      OR visibility = 'family_visible'
    )
  );

DROP POLICY IF EXISTS family_accounts_insert_member ON public.family_accounts;
CREATE POLICY family_accounts_insert_member ON public.family_accounts
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid())
    AND (
      (scope = 'personal' AND owner_profile_id = auth.uid())
      OR (scope = 'shared' AND owner_profile_id IS NULL AND visibility = 'family_visible')
    )
  );

DROP POLICY IF EXISTS family_accounts_update_member ON public.family_accounts;
CREATE POLICY family_accounts_update_member ON public.family_accounts
  FOR UPDATE USING (
    family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid())
    AND (
      (scope = 'personal' AND owner_profile_id = auth.uid())
      OR scope = 'shared'
    )
  );
