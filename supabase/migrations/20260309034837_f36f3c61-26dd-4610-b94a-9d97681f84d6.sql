
-- Fix convert_mission_to_order to properly set commission_amount and price_per_kg
-- This ensures routier orders have correct financial data for release-funds

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
  v_gp_wallet RECORD;
  v_commission_rate NUMERIC;
  v_price_per_kg NUMERIC;
  v_commission_amount INTEGER;
  v_premium_discount NUMERIC;
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

  -- Get GP wallet for commission rate
  SELECT commission_rate INTO v_commission_rate
  FROM gp_wallets WHERE gp_id = p_gp_id;
  v_commission_rate := COALESCE(v_commission_rate, 5);

  -- Apply premium discount to commission
  v_premium_discount := public.get_premium_commission_discount(v_gp_profile.subscription::text);
  v_commission_rate := v_commission_rate * v_premium_discount;

  -- Calculate price_per_kg from agreed price and weight
  IF COALESCE(v_mission.weight_kg, 0) > 0 THEN
    v_price_per_kg := ROUND(p_agreed_price / v_mission.weight_kg);
  ELSE
    v_price_per_kg := ROUND(p_agreed_price);
  END IF;

  -- Calculate commission on transport price (agreed_price)
  v_commission_amount := CEIL(p_agreed_price * v_commission_rate / 100);

  -- Create order with full financial data
  INSERT INTO orders (
    client_id, gp_id, offer_id,
    origin_city, origin_country, destination_city, destination_country,
    weight, price_per_kg, total_price, commission_amount,
    currency, status, description,
    routier_mission_id
  ) VALUES (
    v_mission.client_id, p_gp_id, NULL,
    v_mission.origin_city, v_mission.origin_country,
    v_mission.destination_city, v_mission.destination_country,
    v_mission.weight_kg, v_price_per_kg::integer, p_agreed_price::integer, v_commission_amount,
    v_mission.currency,
    'accepted',
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
