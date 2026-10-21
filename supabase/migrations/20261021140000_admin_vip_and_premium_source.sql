-- Admin ops: VIP friends + premium grant source for household billing.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_vip boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_vip IS
  'Ops tag: friend/tester. VIP households get free Premium (not revenue).';

ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS premium_source text;

COMMENT ON COLUMN public.families.premium_source IS
  'How household Premium was granted: vip | stub | campaign | paid | unknown.';

-- Existing premium households without a source → stub (legacy invite/founder grants).
UPDATE public.families
SET premium_source = 'stub'
WHERE is_premium_household = true
  AND (premium_source IS NULL OR premium_source = '');
