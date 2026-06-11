CREATE TABLE public.gp_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_phone text NOT NULL,
  gp_reference text,
  pending_dep jsonb,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX gp_sessions_sender_phone_key ON public.gp_sessions (sender_phone);

GRANT ALL ON public.gp_sessions TO service_role;

ALTER TABLE public.gp_sessions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_gp_sessions_updated_at
BEFORE UPDATE ON public.gp_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();