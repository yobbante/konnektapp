
-- ============================================================
-- Migration: Routier Hybrid Pricing (Size-Based)
-- Transporters set their own prices per size category (S/M/L/XL)
-- Platform provides recommended prices for reference
-- ============================================================

-- 1. Add size-based pricing columns to routier_gp_pricing
ALTER TABLE public.routier_gp_pricing
  ADD COLUMN IF NOT EXISTS price_s integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_m integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_l integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_xl integer NOT NULL DEFAULT 0;

-- 2. Add size-based pricing to gp_offers (for routier offers)
ALTER TABLE public.gp_offers
  ADD COLUMN IF NOT EXISTS price_s integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_m integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_l integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_xl integer DEFAULT NULL;

-- 3. Add size_category to routier_missions (client selects size when creating mission)
ALTER TABLE public.routier_missions
  ADD COLUMN IF NOT EXISTS size_category text DEFAULT NULL;

-- 4. Add size_category to orders (for routier orders tracking)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS size_category text DEFAULT NULL;

-- 5. Create recommended pricing table per corridor
CREATE TABLE IF NOT EXISTS public.routier_recommended_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_city text NOT NULL,
  destination_city text NOT NULL,
  recommended_price_s integer NOT NULL DEFAULT 0,
  recommended_price_m integer NOT NULL DEFAULT 0,
  recommended_price_l integer NOT NULL DEFAULT 0,
  recommended_price_xl integer NOT NULL DEFAULT 0,
  avg_distance_km integer DEFAULT NULL,
  sample_count integer NOT NULL DEFAULT 0,
  last_calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(origin_city, destination_city)
);

-- Enable RLS
ALTER TABLE public.routier_recommended_prices ENABLE ROW LEVEL SECURITY;

-- Everyone can read recommended prices (public reference data)
CREATE POLICY "Anyone can read recommended prices"
  ON public.routier_recommended_prices FOR SELECT
  USING (true);

-- Only admins can modify recommended prices
CREATE POLICY "Admins can manage recommended prices"
  ON public.routier_recommended_prices FOR ALL
  TO authenticated
  USING (public.has_admin_access(auth.uid()));

-- 6. Create function to calculate recommended price for a corridor
CREATE OR REPLACE FUNCTION public.get_routier_recommended_prices(
  p_origin_city text,
  p_destination_city text
)
RETURNS TABLE(
  recommended_price_s integer,
  recommended_price_m integer,
  recommended_price_l integer,
  recommended_price_xl integer,
  sample_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- First try exact match from pre-calculated table
  RETURN QUERY
  SELECT 
    rrp.recommended_price_s,
    rrp.recommended_price_m,
    rrp.recommended_price_l,
    rrp.recommended_price_xl,
    rrp.sample_count
  FROM routier_recommended_prices rrp
  WHERE LOWER(rrp.origin_city) = LOWER(p_origin_city)
    AND LOWER(rrp.destination_city) = LOWER(p_destination_city);

  -- If no rows returned, calculate from active offers
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      COALESCE(AVG(go.price_s)::integer, 0) as recommended_price_s,
      COALESCE(AVG(go.price_m)::integer, 0) as recommended_price_m,
      COALESCE(AVG(go.price_l)::integer, 0) as recommended_price_l,
      COALESCE(AVG(go.price_xl)::integer, 0) as recommended_price_xl,
      COUNT(*)::integer as sample_count
    FROM gp_offers go
    WHERE go.transport_type = 'routier'
      AND go.status = 'active'
      AND LOWER(go.origin_city) = LOWER(p_origin_city)
      AND LOWER(go.destination_city) = LOWER(p_destination_city)
      AND go.price_s IS NOT NULL;
  END IF;
END;
$$;

-- 7. Insert some seed recommended prices for common Senegal corridors
INSERT INTO public.routier_recommended_prices (origin_city, destination_city, recommended_price_s, recommended_price_m, recommended_price_l, recommended_price_xl, avg_distance_km, sample_count)
VALUES
  ('Dakar', 'Thiès', 5000, 10000, 20000, 40000, 70, 5),
  ('Dakar', 'Saint-Louis', 8000, 15000, 30000, 55000, 260, 3),
  ('Dakar', 'Kaolack', 7000, 13000, 25000, 45000, 190, 4),
  ('Dakar', 'Ziguinchor', 12000, 22000, 40000, 75000, 460, 2),
  ('Dakar', 'Tambacounda', 10000, 18000, 35000, 65000, 470, 2),
  ('Dakar', 'Touba', 6000, 11000, 22000, 42000, 190, 6),
  ('Dakar', 'Mbour', 4000, 8000, 16000, 32000, 80, 4),
  ('Dakar', 'Bamako', 25000, 45000, 80000, 150000, 1200, 2),
  ('Thiès', 'Kaolack', 5000, 9000, 18000, 35000, 130, 3),
  ('Saint-Louis', 'Dakar', 8000, 15000, 30000, 55000, 260, 3)
ON CONFLICT (origin_city, destination_city) DO NOTHING;
