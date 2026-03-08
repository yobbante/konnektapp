
CREATE OR REPLACE FUNCTION public.expire_routier_missions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  expired_mission RECORD;
  expired_count INTEGER := 0;
BEGIN
  FOR expired_mission IN
    SELECT rm.id, rm.mission_number, rm.client_id, rm.origin_city, rm.destination_city
    FROM public.routier_missions rm
    WHERE rm.status IN ('open', 'pending', 'has_responses')
      AND rm.expires_at IS NOT NULL
      AND rm.expires_at < now()
  LOOP
    -- Cancel the mission
    UPDATE public.routier_missions
    SET status = 'expired', updated_at = now()
    WHERE id = expired_mission.id;

    -- Notify the client
    INSERT INTO public.notifications (user_id, title, message, type, related_id, related_type)
    VALUES (
      expired_mission.client_id,
      'Mission expirée',
      'Votre mission ' || expired_mission.mission_number || ' (' || expired_mission.origin_city || ' → ' || expired_mission.destination_city || ') a expiré sans être acceptée.',
      'info',
      expired_mission.id,
      'routier_mission'
    );

    expired_count := expired_count + 1;
  END LOOP;

  RETURN expired_count;
END;
$function$;
