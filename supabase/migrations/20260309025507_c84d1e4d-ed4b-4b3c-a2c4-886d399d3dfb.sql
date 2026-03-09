
-- Routier pricing reference tables

-- 1. Distance bands (base price for category S)
CREATE TABLE IF NOT EXISTS public.routier_distance_bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_km integer NOT NULL,
  max_km integer NOT NULL,
  base_price_fcfa integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.routier_distance_bands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read distance bands" ON public.routier_distance_bands FOR SELECT USING (true);
CREATE POLICY "Admins manage distance bands" ON public.routier_distance_bands FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid())) WITH CHECK (public.has_admin_access(auth.uid()));

-- 2. Size category coefficients
CREATE TABLE IF NOT EXISTS public.routier_size_coefficients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL UNIQUE,
  min_weight_kg numeric NOT NULL DEFAULT 0,
  max_weight_kg numeric NOT NULL,
  coefficient numeric NOT NULL DEFAULT 1.0,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.routier_size_coefficients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read size coefficients" ON public.routier_size_coefficients FOR SELECT USING (true);
CREATE POLICY "Admins manage size coefficients" ON public.routier_size_coefficients FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid())) WITH CHECK (public.has_admin_access(auth.uid()));

-- 3. Pricing config (supplement per kg, freight thresholds)
CREATE TABLE IF NOT EXISTS public.routier_pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value numeric NOT NULL,
  label text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.routier_pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pricing config" ON public.routier_pricing_config FOR SELECT USING (true);
CREATE POLICY "Admins manage pricing config" ON public.routier_pricing_config FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid())) WITH CHECK (public.has_admin_access(auth.uid()));

-- Seed distance bands
INSERT INTO public.routier_distance_bands (min_km, max_km, base_price_fcfa) VALUES
  (0, 50, 1500),
  (50, 150, 2500),
  (150, 300, 4000),
  (300, 600, 6500),
  (600, 1000, 9000)
ON CONFLICT DO NOTHING;

-- Seed size coefficients
INSERT INTO public.routier_size_coefficients (category, min_weight_kg, max_weight_kg, coefficient, sort_order) VALUES
  ('S', 0, 50, 1.0, 1),
  ('M', 50, 100, 2.0, 2),
  ('L', 100, 200, 3.5, 3),
  ('XL', 200, 300, 5.5, 4)
ON CONFLICT (category) DO NOTHING;

-- Seed pricing config
INSERT INTO public.routier_pricing_config (key, value, label, description) VALUES
  ('weight_supplement_per_kg', 200, 'Supplément poids', 'FCFA par kg supplémentaire au-delà de la catégorie'),
  ('freight_threshold_kg', 300, 'Seuil fret spécial', 'Poids à partir duquel la tarification fret s''applique'),
  ('freight_price_per_kg', 150, 'Prix fret par kg', 'FCFA par kg pour les charges fret'),
  ('freight_price_per_m3', 25000, 'Prix fret par m3', 'FCFA par m³ pour tarification volumétrique')
ON CONFLICT (key) DO NOTHING;

-- SQL function for price calculation
CREATE OR REPLACE FUNCTION public.calculate_routier_price(
  p_distance_km integer,
  p_weight_kg numeric,
  p_quantity integer DEFAULT 1,
  p_volume_m3 numeric DEFAULT NULL
)
RETURNS TABLE(
  size_category text,
  base_price integer,
  coefficient numeric,
  unit_price integer,
  quantity integer,
  weight_supplement integer,
  total_price integer,
  is_freight boolean,
  pricing_method text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_base_price integer;
  v_category text;
  v_coeff numeric;
  v_max_weight numeric;
  v_supplement_rate numeric;
  v_freight_threshold numeric;
  v_freight_per_kg numeric;
  v_freight_per_m3 numeric;
  v_unit_price integer;
  v_weight_supplement integer := 0;
  v_total integer;
  v_is_freight boolean := false;
  v_method text := 'standard';
BEGIN
  -- Get freight config
  SELECT value INTO v_freight_threshold FROM routier_pricing_config WHERE key = 'freight_threshold_kg' AND is_active;
  SELECT value INTO v_freight_per_kg FROM routier_pricing_config WHERE key = 'freight_price_per_kg' AND is_active;
  SELECT value INTO v_freight_per_m3 FROM routier_pricing_config WHERE key = 'freight_price_per_m3' AND is_active;
  SELECT value INTO v_supplement_rate FROM routier_pricing_config WHERE key = 'weight_supplement_per_kg' AND is_active;

  -- Check if freight mode
  IF p_weight_kg > COALESCE(v_freight_threshold, 300) THEN
    v_is_freight := true;
    
    -- Volume-based or weight-based
    IF p_volume_m3 IS NOT NULL AND p_volume_m3 > 0 THEN
      v_total := GREATEST(
        (p_weight_kg * COALESCE(v_freight_per_kg, 150))::integer,
        (p_volume_m3 * COALESCE(v_freight_per_m3, 25000))::integer
      );
      v_method := 'volume_or_weight';
    ELSE
      v_total := (p_weight_kg * COALESCE(v_freight_per_kg, 150))::integer;
      v_method := 'freight_weight';
    END IF;

    RETURN QUERY SELECT
      'FRET'::text,
      0,
      0::numeric,
      v_total,
      p_quantity,
      0,
      v_total * p_quantity,
      true,
      v_method;
    RETURN;
  END IF;

  -- Get base price from distance band
  SELECT db.base_price_fcfa INTO v_base_price
  FROM routier_distance_bands db
  WHERE db.is_active AND p_distance_km >= db.min_km AND p_distance_km < db.max_km;

  -- Fallback for distances > 1000km: extrapolate
  IF v_base_price IS NULL THEN
    SELECT db.base_price_fcfa INTO v_base_price
    FROM routier_distance_bands db
    WHERE db.is_active
    ORDER BY db.max_km DESC LIMIT 1;
    v_base_price := COALESCE(v_base_price, 9000) + ((p_distance_km - 1000) * 8);
  END IF;

  -- Get size category and coefficient
  SELECT sc.category, sc.coefficient, sc.max_weight_kg
  INTO v_category, v_coeff, v_max_weight
  FROM routier_size_coefficients sc
  WHERE sc.is_active AND p_weight_kg >= sc.min_weight_kg AND p_weight_kg <= sc.max_weight_kg
  ORDER BY sc.sort_order ASC LIMIT 1;

  -- Fallback to XL if no match (between 300 and freight threshold)
  IF v_category IS NULL THEN
    SELECT sc.category, sc.coefficient, sc.max_weight_kg
    INTO v_category, v_coeff, v_max_weight
    FROM routier_size_coefficients sc
    WHERE sc.is_active
    ORDER BY sc.sort_order DESC LIMIT 1;
  END IF;

  v_coeff := COALESCE(v_coeff, 1.0);
  v_category := COALESCE(v_category, 'S');
  v_max_weight := COALESCE(v_max_weight, 50);

  -- Calculate unit price
  v_unit_price := (v_base_price * v_coeff)::integer;

  -- Weight supplement if exceeds category max
  IF p_weight_kg > v_max_weight THEN
    v_weight_supplement := ((p_weight_kg - v_max_weight) * COALESCE(v_supplement_rate, 200))::integer;
  END IF;

  v_total := (v_unit_price + v_weight_supplement) * p_quantity;

  RETURN QUERY SELECT
    v_category,
    v_base_price,
    v_coeff,
    v_unit_price,
    p_quantity,
    v_weight_supplement,
    v_total,
    false,
    'standard'::text;
END;
$$;
