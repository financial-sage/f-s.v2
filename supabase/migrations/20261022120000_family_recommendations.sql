-- Persistent recommendations (ADR-0009) — domain candidates + AI copy; no chat.

CREATE TABLE IF NOT EXISTS public.family_recommendations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  rule_id text NOT NULL,
  priority text NOT NULL
    CHECK (priority IN ('critical', 'important', 'opportunity', 'educational')),
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'seen', 'accepted', 'deferred', 'dismissed', 'resolved')),
  facts jsonb NOT NULL DEFAULT '{}'::jsonb,
  title text NOT NULL,
  body text NOT NULL,
  why text[] NOT NULL DEFAULT '{}',
  impact text,
  cta_href text,
  cta_label text,
  defer_until timestamptz,
  copy_source text NOT NULL DEFAULT 'template'
    CHECK (copy_source IN ('template', 'gemini')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT family_recommendations_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS family_recommendations_family_status_idx
  ON public.family_recommendations (family_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS family_recommendations_family_rule_idx
  ON public.family_recommendations (family_id, rule_id, created_at DESC);

-- At most one open (new/seen) recommendation per rule per family.
CREATE UNIQUE INDEX IF NOT EXISTS family_recommendations_open_rule_uq
  ON public.family_recommendations (family_id, rule_id)
  WHERE status IN ('new', 'seen');

ALTER TABLE public.family_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_recommendations_select_member ON public.family_recommendations;
CREATE POLICY family_recommendations_select_member ON public.family_recommendations
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid())
    AND (member_id IS NULL OR member_id = auth.uid())
  );

DROP POLICY IF EXISTS family_recommendations_insert_member ON public.family_recommendations;
CREATE POLICY family_recommendations_insert_member ON public.family_recommendations
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid())
    AND (member_id IS NULL OR member_id = auth.uid())
  );

DROP POLICY IF EXISTS family_recommendations_update_member ON public.family_recommendations;
CREATE POLICY family_recommendations_update_member ON public.family_recommendations
  FOR UPDATE USING (
    family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid())
    AND (member_id IS NULL OR member_id = auth.uid())
  );

DROP POLICY IF EXISTS family_recommendations_delete_member ON public.family_recommendations;
CREATE POLICY family_recommendations_delete_member ON public.family_recommendations
  FOR DELETE USING (
    family_id IN (SELECT family_id FROM public.profiles WHERE id = auth.uid())
    AND (member_id IS NULL OR member_id = auth.uid())
  );
