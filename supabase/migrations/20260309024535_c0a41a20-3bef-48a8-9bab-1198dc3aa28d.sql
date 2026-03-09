
-- Step 1: Create table + drop old function + add columns
CREATE TABLE IF NOT EXISTS public.logistics_hubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  country text NOT NULL DEFAULT 'SN',
  region text,
  is_active boolean NOT NULL DEFAULT true,
  priority_level integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.logistics_hubs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'logistics_hubs' AND policyname = 'Anyone can read hubs') THEN
    CREATE POLICY "Anyone can read hubs" ON public.logistics_hubs FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'logistics_hubs' AND policyname = 'Admins manage hubs') THEN
    CREATE POLICY "Admins manage hubs" ON public.logistics_hubs FOR ALL TO authenticated
      USING (public.has_admin_access(auth.uid())) WITH CHECK (public.has_admin_access(auth.uid()));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_logistics_hubs_city_country ON public.logistics_hubs (LOWER(city), LOWER(country));

ALTER TABLE public.routier_missions
  ADD COLUMN IF NOT EXISTS smart_departure_at timestamptz,
  ADD COLUMN IF NOT EXISTS smart_departure_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS corridor_group_id uuid;

INSERT INTO public.logistics_hubs (city, country, region, priority_level) VALUES
  ('Dakar', 'SN', 'Dakar', 1),
  ('Thiès', 'SN', 'Thiès', 2),
  ('Touba', 'SN', 'Diourbel', 2),
  ('Kaolack', 'SN', 'Kaolack', 2),
  ('Saint-Louis', 'SN', 'Saint-Louis', 3),
  ('Ziguinchor', 'SN', 'Ziguinchor', 3),
  ('Mbour', 'SN', 'Thiès', 3),
  ('Tambacounda', 'SN', 'Tambacounda', 4)
ON CONFLICT DO NOTHING;

-- Drop the old function signature
DROP FUNCTION IF EXISTS public.get_corridor_opportunities();

-- Recreate with new signature including hub + smart departure
CREATE FUNCTION public.get_corridor_opportunities()
RETURNS TABLE(
  corridor_key text,
  origin_city text,
  origin_country text,
  destination_city text,
  destination_country text,
  mission_count bigint,
  total_weight_kg numeric,
  total_estimated_revenue numeric,
  earliest_pickup date,
  latest_pickup date,
  mission_ids uuid[],
  is_hub_corridor boolean,
  smart_departure_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    LOWER(rm.origin_city) || '→' || LOWER(rm.destination_city),
    rm.origin_city,
    rm.origin_country,
    rm.destination_city,
    rm.destination_country,
    COUNT(*),
    COALESCE(SUM(rm.weight_kg), 0),
    COALESCE(SUM(COALESCE(rm.client_budget, rm.estimated_price, 0)), 0),
    MIN(rm.pickup_date_start::date),
    MAX(COALESCE(rm.pickup_date_end, rm.pickup_date_start)::date),
    ARRAY_AGG(rm.id),
    (EXISTS(SELECT 1 FROM public.logistics_hubs h1 WHERE LOWER(h1.city) = LOWER(rm.origin_city) AND h1.is_active)
     AND EXISTS(SELECT 1 FROM public.logistics_hubs h2 WHERE LOWER(h2.city) = LOWER(rm.destination_city) AND h2.is_active)),
    MAX(rm.smart_departure_at)
  FROM public.routier_missions rm
  WHERE rm.status IN ('open', 'matching')
    AND (rm.expires_at IS NULL OR rm.expires_at > now())
  GROUP BY LOWER(rm.origin_city), LOWER(rm.destination_city), rm.origin_city, rm.origin_country, rm.destination_city, rm.destination_country
  ORDER BY
    (EXISTS(SELECT 1 FROM public.logistics_hubs h1 WHERE LOWER(h1.city) = LOWER(rm.origin_city) AND h1.is_active)
     AND EXISTS(SELECT 1 FROM public.logistics_hubs h2 WHERE LOWER(h2.city) = LOWER(rm.destination_city) AND h2.is_active)) DESC,
    COUNT(*) DESC,
    SUM(COALESCE(rm.client_budget, rm.estimated_price, 0)) DESC
  LIMIT 20
$$;
