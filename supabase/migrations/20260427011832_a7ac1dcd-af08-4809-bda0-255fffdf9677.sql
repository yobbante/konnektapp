-- Site lock / countdown configuration (singleton)
CREATE TABLE IF NOT EXISTS public.app_lock_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_locked boolean NOT NULL DEFAULT true,
  launch_at timestamptz NOT NULL DEFAULT '2027-06-01T00:00:00Z',
  title text NOT NULL DEFAULT 'Konnekt arrive bientôt',
  message text NOT NULL DEFAULT 'Notre plateforme officielle ouvre bientôt. Les transporteurs partenaires Yobbanté bénéficient d''un accès anticipé.',
  bypass_paths text[] NOT NULL DEFAULT ARRAY['/t', '/auth', '/admin', '/reset-password']::text[],
  partner_token text NOT NULL DEFAULT 'yobbante2027',
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_lock_settings ENABLE ROW LEVEL SECURITY;

-- Public read so the splash can render without auth
CREATE POLICY "anyone_can_read_app_lock"
ON public.app_lock_settings FOR SELECT
USING (true);

-- Only admins can change it
CREATE POLICY "admins_can_update_app_lock"
ON public.app_lock_settings FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_can_insert_app_lock"
ON public.app_lock_settings FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_app_lock_settings_updated_at
BEFORE UPDATE ON public.app_lock_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default
INSERT INTO public.app_lock_settings (is_locked, launch_at, singleton)
VALUES (true, '2027-06-01T00:00:00Z', true)
ON CONFLICT (singleton) DO NOTHING;