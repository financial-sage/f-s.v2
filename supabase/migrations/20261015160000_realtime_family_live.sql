-- Stronger Realtime payloads for partner live sync
-- FULL replica identity ensures UPDATE/DELETE events include enough row data.
ALTER TABLE public.expenses REPLICA IDENTITY FULL;

-- Shared pockets also need live invalidation on the partner device.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'family_funds'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.family_funds;
  END IF;
END $$;
