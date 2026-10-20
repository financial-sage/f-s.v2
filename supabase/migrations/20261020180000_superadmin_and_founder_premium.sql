-- Founder / spouse: superadmin flag + permanent household Premium.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_superadmin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_superadmin IS
  'App operators: access to /admin and privileged ops. Not a household billing flag.';

-- Mark founder accounts as superadmin + premium profile flag.
UPDATE public.profiles p
SET
  is_superadmin = true,
  is_premium = true
FROM auth.users u
WHERE p.id = u.id
  AND lower(u.email) IN (
    'tcampof@gmail.com',
    'sandralu317@hotmail.com'
  );

-- Unlock their household(s) as Premium (billing source of truth).
UPDATE public.families f
SET
  is_premium_household = true,
  premium_until = NULL,
  updated_at = now()
WHERE f.id IN (
  SELECT p.family_id
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(u.email) IN (
    'tcampof@gmail.com',
    'sandralu317@hotmail.com'
  )
  AND p.family_id IS NOT NULL
);
