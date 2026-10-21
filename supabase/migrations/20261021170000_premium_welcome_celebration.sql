-- One-shot Premium welcome modal (confetti) after household unlocks Premium.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pending_premium_welcome jsonb;

COMMENT ON COLUMN public.profiles.pending_premium_welcome IS
  'JSON: { at, variant: solo|couple, source?: paid|vip|stub } — cleared after user dismisses.';
