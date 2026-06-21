CREATE TABLE public.auth_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token text NOT NULL UNIQUE,
  phone text,
  ref_gp text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.auth_tokens TO anon;
GRANT SELECT, INSERT, UPDATE ON public.auth_tokens TO authenticated;
GRANT ALL ON public.auth_tokens TO service_role;

ALTER TABLE public.auth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create auth tokens"
  ON public.auth_tokens FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read auth tokens"
  ON public.auth_tokens FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can consume auth tokens"
  ON public.auth_tokens FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_auth_tokens_token ON public.auth_tokens (token);