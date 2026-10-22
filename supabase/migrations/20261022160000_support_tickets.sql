-- In-app support tickets (no email). Visible to superadmin via service role.

CREATE SEQUENCE IF NOT EXISTS public.support_tickets_seq START 1000;

CREATE OR REPLACE FUNCTION public.next_support_ticket_number()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'SD-' || to_char(timezone('utc', now()), 'YYMMDD') || '-' ||
         lpad(nextval('public.support_tickets_seq')::text, 5, '0');
$$;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  family_id uuid REFERENCES public.families(id) ON DELETE SET NULL,
  email text NOT NULL,
  message text NOT NULL,
  -- In-app screen / path where the user opened support.
  location text,
  user_agent text,
  app_version text,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'read', 'resolved')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT support_tickets_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS support_tickets_status_created_idx
  ON public.support_tickets (status, created_at DESC);

CREATE INDEX IF NOT EXISTS support_tickets_user_created_idx
  ON public.support_tickets (user_id, created_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can create their own tickets.
DROP POLICY IF EXISTS support_tickets_insert_own ON public.support_tickets;
CREATE POLICY support_tickets_insert_own ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can see their own tickets (confirmation / history).
DROP POLICY IF EXISTS support_tickets_select_own ON public.support_tickets;
CREATE POLICY support_tickets_select_own ON public.support_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- No user updates/deletes; admin uses service role.
GRANT USAGE ON SEQUENCE public.support_tickets_seq TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.next_support_ticket_number() TO authenticated, service_role;
