
-- ========================================
-- ROUTIER MODULE — Phase 1 DB Schema
-- ========================================

-- 1. Road type enum for routier sub-profiles
CREATE TYPE public.road_type AS ENUM ('shuttle', 'mission');

-- 2. Mission urgency enum
CREATE TYPE public.mission_urgency AS ENUM ('standard', 'express', 'immediate');

-- 3. Negotiation status enum
CREATE TYPE public.negotiation_status AS ENUM ('pending', 'counter_proposed', 'accepted', 'rejected', 'expired');

-- 4. Mission request table (marketplace dynamique)
CREATE TABLE public.routier_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_number TEXT NOT NULL,
  
  -- Itinerary
  origin_city TEXT NOT NULL,
  origin_country TEXT NOT NULL DEFAULT 'SN',
  origin_address TEXT,
  destination_city TEXT NOT NULL,
  destination_country TEXT NOT NULL DEFAULT 'SN',
  destination_address TEXT,
  delivery_to_door BOOLEAN DEFAULT false,
  
  -- Freight details
  freight_type TEXT NOT NULL, -- colis, palettes, alimentaire, frigorifie, liquides, materiaux, btp, vehicules
  weight_kg NUMERIC NOT NULL DEFAULT 0,
  volume_estimate TEXT, -- petit, moyen, grand, hors_gabarit
  merchandise_description TEXT,
  constraints TEXT[] DEFAULT '{}',
  
  -- Vehicle preference
  vehicle_type_required TEXT, -- moto, tricycle, fourgon, camionnette, camion_3t, camion_10t, semi_remorque, plateau, frigo, porte_conteneur
  
  -- Timing
  pickup_date_start DATE NOT NULL,
  pickup_date_end DATE,
  urgency mission_urgency DEFAULT 'standard',
  
  -- Budget
  client_budget NUMERIC, -- proposed by client
  currency TEXT DEFAULT 'XOF',
  
  -- Matching
  matched_gp_id UUID REFERENCES public.gp_profiles(id),
  accepted_negotiation_id UUID, -- FK added after negotiation table
  
  -- Status
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matching', 'negotiating', 'accepted', 'in_progress', 'completed', 'cancelled', 'expired')),
  
  -- Metadata
  estimated_distance_km NUMERIC,
  estimated_price NUMERIC,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '48 hours')
);

-- 5. Negotiation table (bidirectional price negotiation)
CREATE TABLE public.mission_negotiations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.routier_missions(id) ON DELETE CASCADE,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  
  -- Negotiation rounds
  initial_client_price NUMERIC NOT NULL, -- client's proposed budget
  gp_counter_price NUMERIC, -- GP's counter-proposal
  client_final_price NUMERIC, -- client's response to counter
  agreed_price NUMERIC, -- final agreed price
  
  -- Status
  status negotiation_status DEFAULT 'pending',
  
  -- GP details
  gp_message TEXT, -- GP's message with counter-proposal
  client_message TEXT, -- client's response message
  vehicle_id UUID REFERENCES public.vehicles(id),
  estimated_delivery TEXT, -- "24-48h", "3-5 jours"
  
  -- Timing
  gp_responded_at TIMESTAMPTZ,
  client_responded_at TIMESTAMPTZ,
  deadline_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 minutes'),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK for accepted_negotiation_id
ALTER TABLE public.routier_missions 
  ADD CONSTRAINT fk_accepted_negotiation 
  FOREIGN KEY (accepted_negotiation_id) REFERENCES public.mission_negotiations(id);

-- 6. Add road_type to gp_profiles for routier sub-typing
ALTER TABLE public.gp_profiles ADD COLUMN IF NOT EXISTS road_type road_type;

-- 7. Indexes
CREATE INDEX idx_routier_missions_client ON public.routier_missions(client_id);
CREATE INDEX idx_routier_missions_status ON public.routier_missions(status);
CREATE INDEX idx_routier_missions_matched_gp ON public.routier_missions(matched_gp_id);
CREATE INDEX idx_mission_negotiations_mission ON public.mission_negotiations(mission_id);
CREATE INDEX idx_mission_negotiations_gp ON public.mission_negotiations(gp_id);
CREATE INDEX idx_mission_negotiations_status ON public.mission_negotiations(status);

-- 8. RLS
ALTER TABLE public.routier_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_negotiations ENABLE ROW LEVEL SECURITY;

-- Missions: clients can see their own, GPs can see open/matching ones
CREATE POLICY "Clients see own missions"
  ON public.routier_missions FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "GPs see open missions"
  ON public.routier_missions FOR SELECT
  TO authenticated
  USING (
    status IN ('open', 'matching', 'negotiating')
    AND EXISTS (
      SELECT 1 FROM public.gp_profiles
      WHERE user_id = auth.uid() AND gp_type = 'routier' AND status = 'verified'
    )
  );

CREATE POLICY "GPs see accepted missions assigned to them"
  ON public.routier_missions FOR SELECT
  TO authenticated
  USING (
    matched_gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Clients create missions"
  ON public.routier_missions FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients update own missions"
  ON public.routier_missions FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Admin full access missions"
  ON public.routier_missions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Negotiations: both parties can see
CREATE POLICY "GPs see own negotiations"
  ON public.mission_negotiations FOR SELECT
  TO authenticated
  USING (
    gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Clients see negotiations on their missions"
  ON public.mission_negotiations FOR SELECT
  TO authenticated
  USING (
    mission_id IN (SELECT id FROM public.routier_missions WHERE client_id = auth.uid())
  );

CREATE POLICY "GPs create negotiations"
  ON public.mission_negotiations FOR INSERT
  TO authenticated
  WITH CHECK (
    gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid() AND gp_type = 'routier')
  );

CREATE POLICY "GPs update own negotiations"
  ON public.mission_negotiations FOR UPDATE
  TO authenticated
  USING (
    gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Clients update negotiations on their missions"
  ON public.mission_negotiations FOR UPDATE
  TO authenticated
  USING (
    mission_id IN (SELECT id FROM public.routier_missions WHERE client_id = auth.uid())
  );

CREATE POLICY "Admin full access negotiations"
  ON public.mission_negotiations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 9. Auto-update timestamps
CREATE TRIGGER update_routier_missions_timestamp
  BEFORE UPDATE ON public.routier_missions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mission_negotiations_timestamp
  BEFORE UPDATE ON public.mission_negotiations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Generate mission number
CREATE OR REPLACE FUNCTION public.generate_mission_number()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  NEW.mission_number := 'MSN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(NEW.id::text, 1, 6));
  RETURN NEW;
END;
$function$;

CREATE TRIGGER generate_mission_number_trigger
  BEFORE INSERT ON public.routier_missions
  FOR EACH ROW EXECUTE FUNCTION public.generate_mission_number();

-- 11. Notify matching routier GPs when mission is created
CREATE OR REPLACE FUNCTION public.notify_routier_gps_new_mission()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  gp_record RECORD;
BEGIN
  FOR gp_record IN 
    SELECT gp.user_id 
    FROM gp_profiles gp 
    WHERE gp.status = 'verified'
      AND gp.gp_type = 'routier'
  LOOP
    INSERT INTO notifications (user_id, title, message, type, related_type, related_id)
    VALUES (
      gp_record.user_id,
      '🚛 Nouvelle mission disponible',
      NEW.freight_type || ' · ' || NEW.origin_city || ' → ' || NEW.destination_city || ' · ' || COALESCE(NEW.weight_kg::text, '?') || ' kg',
      'info',
      'routier_mission',
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER notify_routier_gps_mission
  AFTER INSERT ON public.routier_missions
  FOR EACH ROW EXECUTE FUNCTION public.notify_routier_gps_new_mission();

-- 12. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.routier_missions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mission_negotiations;
