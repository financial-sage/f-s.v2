-- Add color to family_funds
ALTER TABLE public.family_funds
  ADD COLUMN IF NOT EXISTS color text;

UPDATE public.family_funds
SET color = '#4A6549'
WHERE scope = 'shared' AND (color IS NULL OR color = '');

UPDATE public.family_funds
SET color = '#0F2D91'
WHERE scope = 'personal' AND (color IS NULL OR color = '');
