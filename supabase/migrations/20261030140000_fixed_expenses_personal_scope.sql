-- Personal fixed expenses: scope + owner (family shared vs mine)

ALTER TABLE public.fixed_expenses
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'shared';

ALTER TABLE public.fixed_expenses
  ADD COLUMN IF NOT EXISTS owner_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.fixed_expenses
  DROP CONSTRAINT IF EXISTS fixed_expenses_scope_check;

ALTER TABLE public.fixed_expenses
  ADD CONSTRAINT fixed_expenses_scope_check
  CHECK (scope = ANY (ARRAY['shared'::text, 'personal'::text]));

ALTER TABLE public.fixed_expenses
  DROP CONSTRAINT IF EXISTS fixed_expenses_owner_scope_check;

ALTER TABLE public.fixed_expenses
  ADD CONSTRAINT fixed_expenses_owner_scope_check
  CHECK (
    (scope = 'shared' AND owner_profile_id IS NULL)
    OR (scope = 'personal' AND owner_profile_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS fixed_expenses_family_scope_owner_idx
  ON public.fixed_expenses USING btree (family_id, scope, owner_profile_id)
  WHERE (is_active = true);
