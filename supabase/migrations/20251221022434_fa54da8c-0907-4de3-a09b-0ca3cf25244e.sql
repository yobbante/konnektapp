-- Create vehicles table for transporter fleet management
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  
  -- Common fields
  name TEXT NOT NULL,
  vehicle_type TEXT NOT NULL, -- camion, fourgon, hammer, grue, bulldozer, avion_cargo, navire, moto, voiture, bagage
  transport_category TEXT NOT NULL, -- routier, aerien, maritime, express, voyageur, agence
  
  -- Capacity & dimensions
  max_weight_kg NUMERIC,
  max_volume_m3 NUMERIC,
  length_m NUMERIC,
  width_m NUMERIC,
  height_m NUMERIC,
  
  -- Type-specific characteristics (JSONB for flexibility)
  specifications JSONB DEFAULT '{}'::jsonb,
  -- For routier: {license_plate, brand, model, year, fuel_type}
  -- For aerien: {airline, flight_capacity, cargo_hold_size}
  -- For maritime: {ship_name, container_types, ports_served}
  -- For express: {delivery_zones, avg_delivery_time_hours}
  -- For voyageur/GP: {baggage_allowance_kg, airlines_used}
  
  -- Availability
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Photo/document
  photo_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scheduled_routes table for fixed shuttle services
CREATE TABLE public.scheduled_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  
  -- Route info
  route_name TEXT NOT NULL,
  origin_city TEXT NOT NULL,
  origin_country TEXT NOT NULL DEFAULT 'SN',
  destination_city TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  
  -- Schedule (days of week: 0=Sunday, 1=Monday, etc.)
  days_of_week INTEGER[] NOT NULL DEFAULT '{}',
  departure_time TIME,
  estimated_duration_hours INTEGER,
  
  -- Pricing
  price_per_kg INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'FCFA',
  
  -- Capacity per trip
  available_capacity_kg NUMERIC,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add vehicle_id to gp_offers for linking offers to specific vehicles
ALTER TABLE public.gp_offers 
ADD COLUMN vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_routes ENABLE ROW LEVEL SECURITY;

-- RLS policies for vehicles
CREATE POLICY "Transporters can view their vehicles"
ON public.vehicles FOR SELECT
USING (gp_id IN (SELECT id FROM gp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Transporters can create their vehicles"
ON public.vehicles FOR INSERT
WITH CHECK (gp_id IN (SELECT id FROM gp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Transporters can update their vehicles"
ON public.vehicles FOR UPDATE
USING (gp_id IN (SELECT id FROM gp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Transporters can delete their vehicles"
ON public.vehicles FOR DELETE
USING (gp_id IN (SELECT id FROM gp_profiles WHERE user_id = auth.uid()));

-- RLS policies for scheduled_routes
CREATE POLICY "Transporters can view their routes"
ON public.scheduled_routes FOR SELECT
USING (gp_id IN (SELECT id FROM gp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Transporters can create their routes"
ON public.scheduled_routes FOR INSERT
WITH CHECK (gp_id IN (SELECT id FROM gp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Transporters can update their routes"
ON public.scheduled_routes FOR UPDATE
USING (gp_id IN (SELECT id FROM gp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Transporters can delete their routes"
ON public.scheduled_routes FOR DELETE
USING (gp_id IN (SELECT id FROM gp_profiles WHERE user_id = auth.uid()));

-- Public can view active vehicles (for offer details)
CREATE POLICY "Public can view active vehicles"
ON public.vehicles FOR SELECT
USING (is_active = true);

-- Public can view active routes
CREATE POLICY "Public can view active scheduled routes"
ON public.scheduled_routes FOR SELECT
USING (is_active = true);

-- Admin access
CREATE POLICY "Admins can manage all vehicles"
ON public.vehicles FOR ALL
USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can manage all routes"
ON public.scheduled_routes FOR ALL
USING (has_admin_access(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_routes_updated_at
BEFORE UPDATE ON public.scheduled_routes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes
CREATE INDEX idx_vehicles_gp_id ON public.vehicles(gp_id);
CREATE INDEX idx_vehicles_transport_category ON public.vehicles(transport_category);
CREATE INDEX idx_scheduled_routes_gp_id ON public.scheduled_routes(gp_id);
CREATE INDEX idx_scheduled_routes_origin ON public.scheduled_routes(origin_city);
CREATE INDEX idx_scheduled_routes_destination ON public.scheduled_routes(destination_city);