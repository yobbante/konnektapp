
-- Phase 3: Dynamic pricing table for corridor-based demand pricing
CREATE TABLE IF NOT EXISTS public.corridor_pricing_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corridor_key text NOT NULL,
  origin_city text NOT NULL,
  destination_city text NOT NULL,
  mission_count integer NOT NULL DEFAULT 0,
  total_weight_kg numeric NOT NULL DEFAULT 0,
  avg_price_per_kg numeric NOT NULL DEFAULT 0,
  demand_index numeric NOT NULL DEFAULT 1.0,
  suggested_price_per_kg numeric NOT NULL DEFAULT 0,
  fill_rate_pct integer NOT NULL DEFAULT 0,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.corridor_pricing_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'corridor_pricing_snapshots' AND policyname = 'Authenticated users can read pricing') THEN
    CREATE POLICY "Authenticated users can read pricing" ON public.corridor_pricing_snapshots FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_corridor_pricing_corridor ON public.corridor_pricing_snapshots (corridor_key, snapshot_at DESC);

-- Function to calculate dynamic corridor pricing
DROP FUNCTION IF EXISTS public.get_corridor_pricing();

CREATE FUNCTION public.get_corridor_pricing()
RETURNS TABLE(
  corridor_key text,
  origin_city text,
  destination_city text,
  mission_count bigint,
  total_weight_kg numeric,
  total_revenue numeric,
  avg_price_per_kg numeric,
  demand_index numeric,
  suggested_price_per_kg numeric,
  fill_rate_pct integer,
  trend text,
  is_hub_corridor boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH current_corridors AS (
    SELECT
      LOWER(rm.origin_city) || '→' || LOWER(rm.destination_city) AS ck,
      rm.origin_city,
      rm.destination_city,
      COUNT(*) AS mc,
      COALESCE(SUM(rm.weight_kg), 0) AS tw,
      COALESCE(SUM(COALESCE(rm.client_budget, rm.estimated_price, 0)), 0) AS tr,
      CASE WHEN SUM(rm.weight_kg) > 0
        THEN SUM(COALESCE(rm.client_budget, rm.estimated_price, 0)) / SUM(rm.weight_kg)
        ELSE 0
      END AS apk
    FROM public.routier_missions rm
    WHERE rm.status IN ('open', 'matching')
      AND (rm.expires_at IS NULL OR rm.expires_at > now())
    GROUP BY LOWER(rm.origin_city), LOWER(rm.destination_city), rm.origin_city, rm.destination_city
  ),
  historical AS (
    SELECT
      corridor_key AS ck,
      AVG(avg_price_per_kg) AS hist_avg,
      AVG(mission_count) AS hist_count
    FROM public.corridor_pricing_snapshots
    WHERE snapshot_at > now() - interval '7 days'
    GROUP BY corridor_key
  )
  SELECT
    cc.ck,
    cc.origin_city,
    cc.destination_city,
    cc.mc,
    cc.tw,
    cc.tr,
    ROUND(cc.apk, 0),
    -- demand_index: ratio of current vs historical volume (capped 0.5-2.0)
    LEAST(2.0, GREATEST(0.5, CASE WHEN COALESCE(h.hist_count, 0) > 0 THEN cc.mc::numeric / h.hist_count ELSE 1.0 END)),
    -- suggested price: base * demand factor
    ROUND(CASE WHEN cc.apk > 0 THEN cc.apk * LEAST(2.0, GREATEST(0.5, CASE WHEN COALESCE(h.hist_count, 0) > 0 THEN cc.mc::numeric / h.hist_count ELSE 1.0 END)) ELSE 0 END, 0),
    -- fill_rate_pct (5+ missions = 100%)
    LEAST(100, (cc.mc * 20)::integer),
    -- trend
    CASE
      WHEN cc.mc > COALESCE(h.hist_count, 0) THEN 'up'
      WHEN cc.mc < COALESCE(h.hist_count, 0) THEN 'down'
      ELSE 'stable'
    END,
    (EXISTS(SELECT 1 FROM public.logistics_hubs h1 WHERE LOWER(h1.city) = LOWER(cc.origin_city) AND h1.is_active)
     AND EXISTS(SELECT 1 FROM public.logistics_hubs h2 WHERE LOWER(h2.city) = LOWER(cc.destination_city) AND h2.is_active))
  FROM current_corridors cc
  LEFT JOIN historical h ON h.ck = cc.ck
  ORDER BY
    (EXISTS(SELECT 1 FROM public.logistics_hubs h1 WHERE LOWER(h1.city) = LOWER(cc.origin_city) AND h1.is_active)
     AND EXISTS(SELECT 1 FROM public.logistics_hubs h2 WHERE LOWER(h2.city) = LOWER(cc.destination_city) AND h2.is_active)) DESC,
    cc.mc DESC,
    cc.tr DESC
  LIMIT 20
$$;
