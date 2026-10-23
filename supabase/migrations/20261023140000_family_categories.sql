-- User-defined categories (shared or personal) with optional subcategories.
-- Budget limits attach to parent categories only (app layer).

CREATE TABLE IF NOT EXISTS public.family_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families (id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.family_categories (id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('shared', 'personal')),
  owner_profile_id uuid REFERENCES public.profiles (id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  sort_order integer NOT NULL DEFAULT 100,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT family_categories_scope_owner CHECK (
    (scope = 'shared' AND owner_profile_id IS NULL)
    OR (scope = 'personal' AND owner_profile_id IS NOT NULL)
  ),
  CONSTRAINT family_categories_name_len CHECK (
    char_length(trim(name)) >= 1 AND char_length(name) <= 40
  )
);

CREATE INDEX IF NOT EXISTS family_categories_family_idx
  ON public.family_categories (family_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS family_categories_parent_idx
  ON public.family_categories (parent_id)
  WHERE archived_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS family_categories_shared_name_uidx
  ON public.family_categories (family_id, lower(trim(name)))
  WHERE archived_at IS NULL
    AND parent_id IS NULL
    AND scope = 'shared';

CREATE UNIQUE INDEX IF NOT EXISTS family_categories_personal_name_uidx
  ON public.family_categories (family_id, owner_profile_id, lower(trim(name)))
  WHERE archived_at IS NULL
    AND parent_id IS NULL
    AND scope = 'personal';

CREATE UNIQUE INDEX IF NOT EXISTS family_categories_sub_name_uidx
  ON public.family_categories (parent_id, lower(trim(name)))
  WHERE archived_at IS NULL
    AND parent_id IS NOT NULL;

COMMENT ON TABLE public.family_categories IS
  'Spend categories: shared (family) or personal (member). parent_id = subcategory.';

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.family_categories (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS expenses_category_id_idx
  ON public.expenses (family_id, category_id)
  WHERE category_id IS NOT NULL AND is_active IS TRUE;

ALTER TABLE public.family_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_categories_select_member ON public.family_categories;
CREATE POLICY family_categories_select_member
  ON public.family_categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.family_id = family_categories.family_id
    )
    AND (
      scope = 'shared'
      OR owner_profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS family_categories_insert_member ON public.family_categories;
CREATE POLICY family_categories_insert_member
  ON public.family_categories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.family_id = family_categories.family_id
    )
    AND (
      (scope = 'shared' AND owner_profile_id IS NULL)
      OR (scope = 'personal' AND owner_profile_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS family_categories_update_member ON public.family_categories;
CREATE POLICY family_categories_update_member
  ON public.family_categories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.family_id = family_categories.family_id
    )
    AND (
      scope = 'shared'
      OR owner_profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS family_categories_delete_member ON public.family_categories;
CREATE POLICY family_categories_delete_member
  ON public.family_categories
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.family_id = family_categories.family_id
    )
    AND (
      scope = 'shared'
      OR owner_profile_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_categories TO authenticated;
GRANT ALL ON public.family_categories TO service_role;
