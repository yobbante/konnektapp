-- Fix mutable search_path in functions

-- Fix generate_request_number
CREATE OR REPLACE FUNCTION public.generate_request_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.request_number := 'REQ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
    LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$function$;

-- Fix generate_ticket_number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
    LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$function$;

-- Fix notify_client_new_response
CREATE OR REPLACE FUNCTION public.notify_client_new_response()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  request_record RECORD;
  gp_name TEXT;
BEGIN
  SELECT cr.client_id, cr.origin_city, cr.destination_city INTO request_record
  FROM custom_requests cr WHERE cr.id = NEW.request_id;
  
  SELECT gp.business_name INTO gp_name
  FROM gp_profiles gp WHERE gp.id = NEW.gp_id;
  
  INSERT INTO notifications (user_id, title, message, type, related_type, related_id)
  VALUES (
    request_record.client_id,
    'Nouvelle offre reçue',
    gp_name || ' a proposé ' || NEW.price_proposed || ' FCFA pour votre demande',
    'info',
    'custom_request_response',
    NEW.id
  );
  
  -- Mettre à jour le statut de la demande
  UPDATE custom_requests SET status = 'has_responses' WHERE id = NEW.request_id AND status = 'open';
  
  RETURN NEW;
END;
$function$;

-- Fix notify_gps_new_request
CREATE OR REPLACE FUNCTION public.notify_gps_new_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  gp_record RECORD;
BEGIN
  -- Notifier tous les GPs vérifiés
  FOR gp_record IN 
    SELECT gp.user_id 
    FROM gp_profiles gp 
    WHERE gp.status = 'verified'
  LOOP
    INSERT INTO notifications (user_id, title, message, type, related_type, related_id)
    VALUES (
      gp_record.user_id,
      'Nouvelle demande de transport',
      'Un client recherche un transport de ' || NEW.origin_city || ' vers ' || NEW.destination_city,
      'info',
      'custom_request',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;