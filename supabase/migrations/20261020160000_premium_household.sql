-- Premium v1: household trial + premium + partner first-move celebration

ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS couple_trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS couple_trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_premium_household boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_until timestamptz,
  ADD COLUMN IF NOT EXISTS first_movement_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_movement_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pending_first_move_celebration jsonb;

COMMENT ON COLUMN public.families.couple_trial_started_at IS
  'Set once when the first expense/income is registered after both members joined.';
COMMENT ON COLUMN public.families.couple_trial_ends_at IS
  'couple_trial_started_at + 7 days.';
COMMENT ON COLUMN public.families.is_premium_household IS
  'Household unlocked via payment by invite code (any member).';
COMMENT ON COLUMN public.profiles.pending_first_move_celebration IS
  'JSON: { fromUserId, fromName, kind, at } — cleared after partner sees the modal.';
