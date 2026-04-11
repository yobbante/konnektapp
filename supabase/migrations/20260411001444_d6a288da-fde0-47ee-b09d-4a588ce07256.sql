
CREATE OR REPLACE FUNCTION public.is_valid_state_transition(p_current_status text, p_target_status text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  -- Terminal states: no further transitions
  IF p_current_status IN ('released', 'cancelled', 'disputed') THEN
    RETURN false;
  END IF;

  -- Cancellation is always allowed from any non-terminal state
  IF p_target_status = 'cancelled' THEN
    RETURN true;
  END IF;

  RETURN CASE p_current_status
    WHEN 'pending'                THEN p_target_status IN ('accepted', 'paid_held', 'collected', 'checked_in', 'weight_pending_payment')
    WHEN 'accepted'               THEN p_target_status IN ('paid_held', 'collected', 'checked_in', 'weight_pending_payment')
    WHEN 'paid_held'              THEN p_target_status IN ('checked_in', 'weight_pending_payment')
    WHEN 'checked_in'             THEN p_target_status IN ('weight_pending_payment', 'scheduled_departure', 'in_transit', 'delivery_pending', 'delivery_confirmed')
    WHEN 'weight_pending_payment' THEN p_target_status IN ('checked_in', 'accepted', 'paid_held', 'pending')
    WHEN 'scheduled_departure'    THEN p_target_status IN ('in_transit', 'delivery_pending', 'delivery_confirmed')
    WHEN 'collected'              THEN p_target_status IN ('checked_in', 'in_transit', 'scheduled_departure', 'weight_pending_payment', 'delivery_pending', 'delivery_confirmed')
    WHEN 'in_transit'             THEN p_target_status IN ('arrived_destination', 'delivery_pending', 'delivery_confirmed', 'delivered')
    WHEN 'arrived_destination'    THEN p_target_status IN ('delivery_pending', 'delivery_confirmed', 'delivered')
    WHEN 'delivery_pending'       THEN p_target_status IN ('delivery_confirmed', 'delivered')
    WHEN 'delivery_confirmed'     THEN p_target_status IN ('delivered', 'released')
    WHEN 'delivered'              THEN p_target_status IN ('released')
    ELSE false
  END;
END;
$$;
