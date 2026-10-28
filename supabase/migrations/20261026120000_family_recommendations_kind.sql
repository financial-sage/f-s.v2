-- CFO Presence (ADR-0011): note kinds on family_recommendations

ALTER TABLE public.family_recommendations
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'recommendation';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'family_recommendations_kind_check'
  ) THEN
    ALTER TABLE public.family_recommendations
      ADD CONSTRAINT family_recommendations_kind_check
      CHECK (
        kind IN (
          'recommendation',
          'alert',
          'summary',
          'nudge',
          'celebration'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS family_recommendations_family_kind_idx
  ON public.family_recommendations (family_id, kind, created_at DESC);
