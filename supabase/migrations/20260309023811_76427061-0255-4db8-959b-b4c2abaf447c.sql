
-- DB function: get corridor opportunities by grouping open routier missions
CREATE OR REPLACE FUNCTION public.get_corridor_opportunities()
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
  mission_ids uuid[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    LOWER(rm.origin_city) || '→' || LOWER(rm.destination_city) AS corridor_key,
    rm.origin_city,
    rm.origin_country,
    rm.destination_city,
    rm.destination_country,
    COUNT(*) AS mission_count,
    COALESCE(SUM(rm.weight_kg), 0) AS total_weight_kg,
    COALESCE(SUM(COALESCE(rm.client_budget, rm.estimated_price, 0)), 0) AS total_estimated_revenue,
    MIN(rm.pickup_date_start::date) AS earliest_pickup,
    MAX(COALESCE(rm.pickup_date_end, rm.pickup_date_start)::date) AS latest_pickup,
    ARRAY_AGG(rm.id) AS mission_ids
  FROM public.routier_missions rm
  WHERE rm.status IN ('open', 'matching')
    AND (rm.expires_at IS NULL OR rm.expires_at > now())
  GROUP BY LOWER(rm.origin_city), LOWER(rm.destination_city), rm.origin_city, rm.origin_country, rm.destination_city, rm.destination_country
  ORDER BY COUNT(*) DESC, SUM(COALESCE(rm.client_budget, rm.estimated_price, 0)) DESC
  LIMIT 20
$$;
