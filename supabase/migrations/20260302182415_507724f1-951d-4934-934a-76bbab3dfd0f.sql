
-- Unified freight tables for multimodal (air, maritime, multimodal)
CREATE TABLE public.freight_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  freight_mode TEXT NOT NULL DEFAULT 'air' CHECK (freight_mode IN ('air', 'maritime', 'multimodal')),
  request_number TEXT NOT NULL,
  -- Origin
  origin_country TEXT NOT NULL DEFAULT 'France',
  origin_city TEXT NOT NULL,
  origin_port_or_airport TEXT,
  -- Destination
  destination_country TEXT NOT NULL DEFAULT 'Sénégal',
  destination_city TEXT NOT NULL,
  destination_port_or_airport TEXT,
  -- Cargo details
  merchandise_type TEXT,
  merchandise_description TEXT,
  weight_kg NUMERIC DEFAULT 0,
  volume_m3 NUMERIC DEFAULT 0,
  dimensions_cm TEXT,
  declared_value NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  -- Vehicle (if applicable)
  is_vehicle BOOLEAN DEFAULT false,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INT,
  vehicle_vin TEXT,
  vehicle_running BOOLEAN DEFAULT true,
  -- Logistics
  incoterm TEXT,
  customs_required BOOLEAN DEFAULT false,
  insurance_required BOOLEAN DEFAULT false,
  is_fragile BOOLEAN DEFAULT false,
  is_urgent BOOLEAN DEFAULT false,
  urgency_level TEXT DEFAULT 'standard' CHECK (urgency_level IN ('standard', 'express', 'critical')),
  final_delivery_mode TEXT DEFAULT 'pickup' CHECK (final_delivery_mode IN ('road', 'pickup', 'hub')),
  -- Dates
  pickup_date_from DATE,
  pickup_date_to DATE,
  -- Status
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'has_proposals', 'accepted', 'in_progress', 'completed', 'cancelled', 'expired')),
  accepted_proposal_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Proposals from shipping partners / independents
CREATE TABLE public.freight_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.freight_requests(id) ON DELETE CASCADE,
  provider_gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  price_proposed NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  estimated_transit_days INT,
  available_pickup_date DATE,
  routing_description TEXT,
  includes_customs BOOLEAN DEFAULT false,
  includes_insurance BOOLEAN DEFAULT false,
  includes_last_mile BOOLEAN DEFAULT false,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tracking events for freight shipments
CREATE TABLE public.freight_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  freight_request_id UUID REFERENCES public.freight_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_label TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  actor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generate request number
CREATE OR REPLACE FUNCTION public.generate_freight_request_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.request_number := 'FRT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(NEW.id::text, 1, 6));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_freight_request_created
  BEFORE INSERT ON public.freight_requests
  FOR EACH ROW EXECUTE FUNCTION public.generate_freight_request_number();

-- RLS
ALTER TABLE public.freight_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freight_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freight_tracking_events ENABLE ROW LEVEL SECURITY;

-- Clients can manage their own requests
CREATE POLICY "Users can manage own freight requests" ON public.freight_requests
  FOR ALL TO authenticated USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());

-- Authenticated users can view open requests (marketplace)
CREATE POLICY "Authenticated can view open freight requests" ON public.freight_requests
  FOR SELECT TO authenticated USING (status IN ('open', 'has_proposals'));

-- Providers can manage own proposals
CREATE POLICY "Providers can manage own proposals" ON public.freight_proposals
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.gp_profiles WHERE id = provider_gp_id AND user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.gp_profiles WHERE id = provider_gp_id AND user_id = auth.uid())
  );

-- Request owners can view proposals on their requests
CREATE POLICY "Clients can view proposals on their requests" ON public.freight_proposals
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.freight_requests WHERE id = request_id AND client_id = auth.uid())
  );

-- Tracking events visible to involved parties
CREATE POLICY "Involved parties can view tracking events" ON public.freight_tracking_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert tracking events" ON public.freight_tracking_events
  FOR INSERT TO authenticated WITH CHECK (true);
