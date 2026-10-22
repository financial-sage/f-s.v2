-- Allow OpenAI as recommendations copy_source (Gemini kept for legacy rows).
ALTER TABLE public.family_recommendations
  DROP CONSTRAINT IF EXISTS family_recommendations_copy_source_check;

ALTER TABLE public.family_recommendations
  ADD CONSTRAINT family_recommendations_copy_source_check
  CHECK (copy_source IN ('template', 'gemini', 'openai'));
