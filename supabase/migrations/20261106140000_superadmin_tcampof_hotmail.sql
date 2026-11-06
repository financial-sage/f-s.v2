-- Grant superadmin (+ profile premium) to production test account.
UPDATE public.profiles p
SET
  is_superadmin = true,
  is_premium = true,
  updated_at = now()
FROM auth.users u
WHERE p.id = u.id
  AND lower(u.email) = 'tcampof@hotmail.com';

-- Unlock their household as Premium when linked.
UPDATE public.families f
SET
  is_premium_household = true,
  premium_until = NULL,
  updated_at = now()
WHERE f.id IN (
  SELECT p.family_id
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(u.email) = 'tcampof@hotmail.com'
    AND p.family_id IS NOT NULL
);
