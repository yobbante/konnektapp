CREATE TABLE public.gp_onboarding_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_gp text NOT NULL,
  event text NOT NULL,
  konnekt_user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_gp_onboarding_events_ref ON public.gp_onboarding_events (ref_gp);
CREATE INDEX idx_gp_onboarding_events_event ON public.gp_onboarding_events (event);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gp_onboarding_events TO authenticated;
GRANT ALL ON public.gp_onboarding_events TO service_role;

ALTER TABLE public.gp_onboarding_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Onboarding events viewable by admins"
ON public.gp_onboarding_events FOR SELECT
TO authenticated
USING (public.has_admin_access(auth.uid()));