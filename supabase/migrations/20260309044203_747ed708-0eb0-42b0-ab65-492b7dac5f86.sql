
-- Maritime departures table for LCL/FCL/Vehicle/Bulk shipments
CREATE TABLE public.maritime_departures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  
  -- Type: lcl, fcl, vehicle, bulk
  maritime_type TEXT NOT NULL DEFAULT 'lcl',
  
  -- Route
  origin_port TEXT NOT NULL,
  origin_country TEXT NOT NULL DEFAULT 'France',
  destination_port TEXT NOT NULL,
  destination_country TEXT NOT NULL DEFAULT 'Sénégal',
  
  -- Dates
  departure_date DATE NOT NULL,
  arrival_date DATE,
  cargo_cutoff_date DATE,
  
  -- Capacity (m³)
  total_capacity_m3 NUMERIC NOT NULL DEFAULT 0,
  available_capacity_m3 NUMERIC NOT NULL DEFAULT 0,
  min_volume_m3 NUMERIC DEFAULT 1,
  
  -- Pricing
  price_per_m3 NUMERIC DEFAULT 0,
  price_total NUMERIC DEFAULT 0,  -- for FCL flat price
  currency TEXT NOT NULL DEFAULT 'EUR',
  
  -- FCL specific
  container_type TEXT,
  
  -- Transit
  transit_days INTEGER,
  
  -- Cargo restrictions
  cargo_types_accepted TEXT[] DEFAULT '{}',
  conditions TEXT,
  description TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active',
  bookings_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for search
CREATE INDEX idx_maritime_departures_route ON public.maritime_departures(origin_port, destination_port, status);
CREATE INDEX idx_maritime_departures_gp ON public.maritime_departures(gp_id);

-- Enable RLS
ALTER TABLE public.maritime_departures ENABLE ROW LEVEL SECURITY;

-- Anyone can read active departures
CREATE POLICY "Anyone can view active maritime departures"
ON public.maritime_departures FOR SELECT
USING (status = 'active');

-- GP can manage own departures
CREATE POLICY "GP can insert own departures"
ON public.maritime_departures FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.gp_profiles WHERE id = gp_id AND user_id = auth.uid())
);

CREATE POLICY "GP can update own departures"
ON public.maritime_departures FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.gp_profiles WHERE id = gp_id AND user_id = auth.uid())
);

CREATE POLICY "GP can delete own departures"
ON public.maritime_departures FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.gp_profiles WHERE id = gp_id AND user_id = auth.uid())
);
