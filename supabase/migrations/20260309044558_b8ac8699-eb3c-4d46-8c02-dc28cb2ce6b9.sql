
-- Air cargo departures table (scheduled flights for consolidation)
CREATE TABLE public.air_departures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  
  -- Route
  origin_city TEXT NOT NULL,
  origin_country TEXT NOT NULL DEFAULT 'CN',
  origin_airport TEXT,
  destination_city TEXT NOT NULL,
  destination_country TEXT NOT NULL DEFAULT 'SN',
  destination_airport TEXT,
  
  -- Flight info
  airline TEXT,
  flight_number TEXT,
  
  -- Dates
  departure_date DATE NOT NULL,
  arrival_date DATE,
  cargo_cutoff_date DATE,
  
  -- Capacity
  total_capacity_kg NUMERIC NOT NULL DEFAULT 0,
  available_capacity_kg NUMERIC NOT NULL DEFAULT 0,
  min_weight_kg NUMERIC NOT NULL DEFAULT 1,
  
  -- Pricing - base rate
  price_per_kg NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'FCFA',
  
  -- Weight tier pricing (JSON array of {min_kg, max_kg, price_per_kg})
  weight_tiers JSONB DEFAULT '[]'::jsonb,
  
  -- Surcharges
  fuel_surcharge NUMERIC NOT NULL DEFAULT 0,
  security_surcharge NUMERIC NOT NULL DEFAULT 0,
  handling_fee NUMERIC NOT NULL DEFAULT 0,
  documentation_fee NUMERIC NOT NULL DEFAULT 0,
  
  -- Cargo types
  cargo_types_accepted TEXT[] DEFAULT ARRAY['general', 'electronics', 'textiles', 'perishable'],
  cargo_restrictions TEXT,
  
  -- Transit
  transit_time_days INTEGER,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active',
  description TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.air_departures ENABLE ROW LEVEL SECURITY;

-- GP can manage their own departures
CREATE POLICY "GP can manage own air departures"
  ON public.air_departures
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.gp_profiles
      WHERE id = air_departures.gp_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gp_profiles
      WHERE id = air_departures.gp_id AND user_id = auth.uid()
    )
  );

-- Everyone can read active departures
CREATE POLICY "Anyone can read active air departures"
  ON public.air_departures
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Index
CREATE INDEX idx_air_departures_gp ON public.air_departures(gp_id);
CREATE INDEX idx_air_departures_route ON public.air_departures(origin_city, destination_city, departure_date);
CREATE INDEX idx_air_departures_status ON public.air_departures(status);
