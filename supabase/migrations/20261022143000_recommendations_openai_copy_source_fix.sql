-- Ensure copy_source allows openai even if a prior migration was skipped
-- or the inline CHECK kept a different constraint name.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'public.family_recommendations'::regclass
      AND c.contype = 'c'
      AND a.attname = 'copy_source'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.family_recommendations DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
  END LOOP;
END $$;

ALTER TABLE public.family_recommendations
  ADD CONSTRAINT family_recommendations_copy_source_check
  CHECK (copy_source IN ('template', 'gemini', 'openai'));
