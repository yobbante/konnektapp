
-- Phase 2+3: Routier Module - Escrow integration & mission-to-order conversion

-- 1. Add accepted_order_id to routier_missions to link to orders table
ALTER TABLE public.routier_missions 
  ADD COLUMN IF NOT EXISTS accepted_order_id UUID REFERENCES public.orders(id),
  ADD COLUMN IF NOT EXISTS accepted_negotiation_id UUID,
  ADD COLUMN IF NOT EXISTS matched_gp_id UUID REFERENCES public.gp_profiles(id);

-- 2. Add mission_id to escrow_transactions for routier traceability
ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS mission_id UUID;

-- 3. Add mission_id to orders for reverse link
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS routier_mission_id UUID;

-- 4. Function to convert accepted mission into a standard order
CREATE OR REPLACE FUNCTION public.convert_mission_to_order(
  p_mission_id UUID,
  p_gp_id UUID,
  p_agreed_price NUMERIC
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mission RECORD;
  v_order_id UUID;
  v_gp_profile RECORD;
BEGIN
  -- Get mission
  SELECT * INTO v_mission FROM routier_missions WHERE id = p_mission_id;
  IF v_mission IS NULL THEN
    RAISE EXCEPTION 'Mission not found: %', p_mission_id;
  END IF;
  IF v_mission.status != 'accepted' THEN
    RAISE EXCEPTION 'Mission must be in accepted status, got: %', v_mission.status;
  END IF;
  IF v_mission.accepted_order_id IS NOT NULL THEN
    RETURN v_mission.accepted_order_id; -- already converted
  END IF;

  -- Get GP profile
  SELECT * INTO v_gp_profile FROM gp_profiles WHERE id = p_gp_id;

  -- Create order
  INSERT INTO orders (
    client_id, gp_id, offer_id,
    origin_city, origin_country, destination_city, destination_country,
    weight, total_price, currency, status, description,
    routier_mission_id
  ) VALUES (
    v_mission.client_id, p_gp_id, NULL,
    v_mission.origin_city, v_mission.origin_country,
    v_mission.destination_city, v_mission.destination_country,
    v_mission.weight_kg, p_agreed_price, v_mission.currency,
    'accepted', -- skip pending since already negotiated
    v_mission.freight_type || ' - ' || COALESCE(v_mission.merchandise_description, ''),
    p_mission_id
  ) RETURNING id INTO v_order_id;

  -- Update mission with order link
  UPDATE routier_missions 
  SET accepted_order_id = v_order_id, 
      status = 'in_progress',
      updated_at = now()
  WHERE id = p_mission_id;

  RETURN v_order_id;
END;
$$;

-- 5. Add routier_mission statuses
-- Already exists from phase 1, but ensure 'in_progress' and 'completed' are tracked in app logic

-- 6. Create index for performance
CREATE INDEX IF NOT EXISTS idx_routier_missions_status ON public.routier_missions(status);
CREATE INDEX IF NOT EXISTS idx_routier_missions_client ON public.routier_missions(client_id);
CREATE INDEX IF NOT EXISTS idx_mission_negotiations_mission ON public.mission_negotiations(mission_id);
CREATE INDEX IF NOT EXISTS idx_orders_routier_mission ON public.orders(routier_mission_id);
