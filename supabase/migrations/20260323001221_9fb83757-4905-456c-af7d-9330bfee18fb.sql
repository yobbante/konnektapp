
-- Fix state machine: allow weight_pending_payment from accepted, pending, paid_held, collected
CREATE OR REPLACE FUNCTION public.is_valid_state_transition(p_current_status text, p_target_status text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_current_status IN ('released', 'cancelled', 'disputed') THEN
    RETURN false;
  END IF;

  RETURN CASE p_current_status
    WHEN 'pending'                THEN p_target_status IN ('accepted', 'paid_held', 'collected', 'checked_in', 'weight_pending_payment', 'cancelled')
    WHEN 'accepted'               THEN p_target_status IN ('paid_held', 'collected', 'checked_in', 'weight_pending_payment', 'cancelled')
    WHEN 'paid_held'              THEN p_target_status IN ('checked_in', 'weight_pending_payment', 'cancelled')
    WHEN 'checked_in'             THEN p_target_status IN ('weight_pending_payment', 'scheduled_departure', 'in_transit', 'delivery_pending', 'delivery_confirmed')
    WHEN 'weight_pending_payment' THEN p_target_status IN ('checked_in', 'accepted', 'paid_held', 'pending')
    WHEN 'scheduled_departure'    THEN p_target_status IN ('in_transit', 'delivery_pending', 'delivery_confirmed')
    WHEN 'collected'              THEN p_target_status IN ('checked_in', 'in_transit', 'scheduled_departure', 'weight_pending_payment', 'cancelled', 'delivery_pending', 'delivery_confirmed')
    WHEN 'in_transit'             THEN p_target_status IN ('arrived_destination', 'delivery_pending', 'delivery_confirmed', 'delivered')
    WHEN 'arrived_destination'    THEN p_target_status IN ('delivery_pending', 'delivery_confirmed', 'delivered')
    WHEN 'delivery_pending'       THEN p_target_status IN ('delivery_confirmed', 'delivered')
    WHEN 'delivery_confirmed'     THEN p_target_status IN ('delivered', 'released')
    WHEN 'delivered'              THEN p_target_status IN ('released')
    ELSE false
  END;
END;
$function$;
