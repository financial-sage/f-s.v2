ALTER TABLE public.family_categories
  ADD COLUMN IF NOT EXISTS icon text;

COMMENT ON COLUMN public.family_categories.icon IS
  'Lucide icon key from product catalog (e.g. home, utensils).';

-- Backfill seed / common names when icon is still empty
UPDATE public.family_categories SET icon = 'home' WHERE name ILIKE 'Hogar' AND COALESCE(icon, '') = '';
UPDATE public.family_categories SET icon = 'utensils' WHERE name ILIKE 'Alimentaci%' AND COALESCE(icon, '') = '';
UPDATE public.family_categories SET icon = 'car' WHERE name ILIKE 'Movilidad' AND COALESCE(icon, '') = '';
UPDATE public.family_categories SET icon = 'heart' WHERE name ILIKE 'Bienestar' AND COALESCE(icon, '') = '';
UPDATE public.family_categories SET icon = 'party' WHERE name ILIKE 'Ocio' AND COALESCE(icon, '') = '';
UPDATE public.family_categories SET icon = 'more' WHERE name ILIKE 'Otros' AND COALESCE(icon, '') = '';
UPDATE public.family_categories
SET icon = 'cart'
WHERE name ILIKE ANY (ARRAY['Super', 'Mercado', 'Supermercado'])
  AND COALESCE(icon, '') = '';
UPDATE public.family_categories
SET icon = 'tags'
WHERE COALESCE(icon, '') = '';
