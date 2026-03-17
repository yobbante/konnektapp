
CREATE TABLE public.call_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL,
  callee_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ringing',
  caller_peer_id TEXT,
  callee_peer_id TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

-- Allow participants to see their calls
CREATE POLICY "Users can view their calls" ON public.call_signals
  FOR SELECT TO authenticated
  USING (caller_id = auth.uid() OR callee_id = auth.uid());

-- Allow authenticated users to create calls
CREATE POLICY "Users can create calls" ON public.call_signals
  FOR INSERT TO authenticated
  WITH CHECK (caller_id = auth.uid());

-- Allow participants to update calls
CREATE POLICY "Participants can update calls" ON public.call_signals
  FOR UPDATE TO authenticated
  USING (caller_id = auth.uid() OR callee_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;
