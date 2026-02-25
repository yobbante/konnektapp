
-- Add residence fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS residence_city TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Create gp_routes table for explicit route declarations
CREATE TABLE IF NOT EXISTS public.gp_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  origin_city TEXT NOT NULL,
  origin_country TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  default_price_per_kg NUMERIC,
  currency TEXT DEFAULT 'XOF',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(gp_id, origin_city, origin_country, destination_city, destination_country)
);

-- RLS for gp_routes
ALTER TABLE public.gp_routes ENABLE ROW LEVEL SECURITY;

-- Public read for active routes
CREATE POLICY "Anyone can view active routes" ON public.gp_routes
  FOR SELECT USING (is_active = true);

-- GP can manage own routes
CREATE POLICY "GP can manage own routes" ON public.gp_routes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.gp_profiles WHERE id = gp_id AND user_id = auth.uid())
  );

-- Admin can manage all routes
CREATE POLICY "Admin can manage all routes" ON public.gp_routes
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create route when GP creates an offer (trigger)
CREATE OR REPLACE FUNCTION public.auto_create_route_from_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.gp_routes (gp_id, origin_city, origin_country, destination_city, destination_country, default_price_per_kg, currency)
  VALUES (NEW.gp_id, NEW.origin_city, NEW.origin_country, NEW.destination_city, NEW.destination_country, NEW.price_per_kg, NEW.currency)
  ON CONFLICT (gp_id, origin_city, origin_country, destination_city, destination_country) 
  DO UPDATE SET is_active = true, updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_route_from_offer
  AFTER INSERT ON public.gp_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_route_from_offer();

-- Index for route search
CREATE INDEX IF NOT EXISTS idx_gp_routes_cities ON public.gp_routes(origin_city, destination_city) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_gp_routes_gp ON public.gp_routes(gp_id);
