-- Shareable conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS share_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_share_token_key ON public.conversations (share_token);

GRANT SELECT ON public.conversations TO anon;
GRANT SELECT ON public.messages TO anon;

DROP POLICY IF EXISTS "Shared conversations are publicly readable" ON public.conversations;
CREATE POLICY "Shared conversations are publicly readable"
  ON public.conversations FOR SELECT
  TO anon, authenticated
  USING (is_shared = true);

DROP POLICY IF EXISTS "Messages of shared conversations are publicly readable" ON public.messages;
CREATE POLICY "Messages of shared conversations are publicly readable"
  ON public.messages FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id AND c.is_shared = true
  ));

-- Usage tracking / rate limiting
CREATE TABLE IF NOT EXISTS public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('chat', 'image')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_events_user_created_idx ON public.usage_events (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own usage" ON public.usage_events;
CREATE POLICY "Users read own usage" ON public.usage_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own usage" ON public.usage_events;
CREATE POLICY "Users insert own usage" ON public.usage_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);