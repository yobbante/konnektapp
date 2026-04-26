
CREATE TABLE IF NOT EXISTS public.beta_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  gp_id uuid NULL REFERENCES public.gp_profiles(id) ON DELETE SET NULL,
  user_id uuid NULL,
  session_id text NULL,
  source text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beta_tracking_event_type ON public.beta_tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_beta_tracking_session ON public.beta_tracking_events(session_id);
CREATE INDEX IF NOT EXISTS idx_beta_tracking_source ON public.beta_tracking_events(source);
CREATE INDEX IF NOT EXISTS idx_beta_tracking_created_at ON public.beta_tracking_events(created_at DESC);

ALTER TABLE public.beta_tracking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert beta tracking events"
  ON public.beta_tracking_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view beta tracking events"
  ON public.beta_tracking_events
  FOR SELECT
  TO authenticated
  USING (public.has_admin_access(auth.uid()));
