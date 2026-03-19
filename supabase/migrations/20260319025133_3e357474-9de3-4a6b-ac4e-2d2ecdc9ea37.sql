
CREATE TABLE public.platform_active_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  country_code text NOT NULL DEFAULT '',
  country_name text NOT NULL DEFAULT '',
  flag text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(city, country_code)
);

ALTER TABLE public.platform_active_cities ENABLE ROW LEVEL SECURITY;

-- Everyone can read active cities
CREATE POLICY "Anyone can read active cities" ON public.platform_active_cities
  FOR SELECT USING (true);

-- Only admins can manage cities
CREATE POLICY "Admins can manage cities" ON public.platform_active_cities
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert initial active cities from screenshot
INSERT INTO public.platform_active_cities (city, country_code, country_name, flag, sort_order) VALUES
  ('Abidjan', 'CI', 'Côte d''Ivoire', '🇨🇮', 1),
  ('Almería', 'ES', 'Espagne', '🇪🇸', 2),
  ('Bamako', 'ML', 'Mali', '🇲🇱', 3),
  ('Barcelone', 'ES', 'Espagne', '🇪🇸', 4),
  ('Berlin', 'DE', 'Allemagne', '🇩🇪', 5),
  ('Beyrouth', 'LB', 'Liban', '🇱🇧', 6),
  ('Bordeaux', 'FR', 'France', '🇫🇷', 7),
  ('Brazzaville', 'CG', 'République du Congo', '🇨🇬', 8),
  ('Bruxelles', 'BE', 'Belgique', '🇧🇪', 9),
  ('Casablanca', 'MA', 'Maroc', '🇲🇦', 10),
  ('Conakry', 'GN', 'Guinée', '🇬🇳', 11),
  ('Douala', 'CM', 'Cameroun', '🇨🇲', 12),
  ('Dubaï', 'AE', 'Émirats Arabes Unis', '🇦🇪', 13),
  ('Düsseldorf', 'DE', 'Allemagne', '🇩🇪', 14),
  ('Gatineau', 'CA', 'Canada', '🇨🇦', 15),
  ('Genève', 'CH', 'Suisse', '🇨🇭', 16),
  ('Istanbul', 'TR', 'Turquie', '🇹🇷', 17),
  ('Kinshasa', 'CD', 'République Démocratique du Congo', '🇨🇩', 18),
  ('Libreville', 'GA', 'Gabon', '🇬🇦', 19),
  ('Lille', 'FR', 'France', '🇫🇷', 20),
  ('Lyon', 'FR', 'France', '🇫🇷', 21),
  ('Madrid', 'ES', 'Espagne', '🇪🇸', 22),
  ('Malabo', 'GQ', 'Guinée Équatoriale', '🇬🇶', 23),
  ('Marseille', 'FR', 'France', '🇫🇷', 24),
  ('Milan', 'IT', 'Italie', '🇮🇹', 25),
  ('Montpellier', 'FR', 'France', '🇫🇷', 26),
  ('Montréal', 'CA', 'Canada', '🇨🇦', 27),
  ('N''Djamena', 'TD', 'Tchad', '🇹🇩', 28),
  ('New York City', 'US', 'États-Unis', '🇺🇸', 29),
  ('Nîmes', 'FR', 'France', '🇫🇷', 30),
  ('Ottawa', 'CA', 'Canada', '🇨🇦', 31),
  ('Paris', 'FR', 'France', '🇫🇷', 32),
  ('Providence', 'US', 'États-Unis', '🇺🇸', 33),
  ('Rennes', 'FR', 'France', '🇫🇷', 34),
  ('Rouen', 'FR', 'France', '🇫🇷', 35),
  ('Washington, D.C.', 'US', 'États-Unis', '🇺🇸', 36),
  ('Yaoundé', 'CM', 'Cameroun', '🇨🇲', 37),
  ('Dakar', 'SN', 'Sénégal', '🇸🇳', 0);
