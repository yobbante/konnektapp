
-- Fix emoji in notification title for routier missions
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
      'Nouvelle mission disponible',
      NEW.freight_type || ' - ' || NEW.origin_city || ' → ' || NEW.destination_city || ' - ' || COALESCE(NEW.weight_kg::text, '?') || ' kg',
      'info',
      'routier_mission',
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$function$;

-- Fix emoji in notify_order_status_change for recipient notifications
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  status_label TEXT;
  gp_user_id UUID;
  v_recipient_user_id UUID;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  status_label := CASE NEW.status::text
    WHEN 'pending' THEN 'en attente'
    WHEN 'accepted' THEN 'acceptee'
    WHEN 'collected' THEN 'collectee'
    WHEN 'checked_in' THEN 'enregistree'
    WHEN 'in_transit' THEN 'en transit'
    WHEN 'arrived_destination' THEN 'arrivee a destination'
    WHEN 'delivery_pending' THEN 'livraison en cours'
    WHEN 'delivery_confirmed' THEN 'livree'
    WHEN 'delivered' THEN 'livree'
    WHEN 'released' THEN 'terminee'
    WHEN 'cancelled' THEN 'annulee'
    WHEN 'disputed' THEN 'en litige'
    ELSE NEW.status::text
  END;

  INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
  VALUES (
    NEW.client_id,
    'order_status',
    'Commande ' || status_label,
    'Votre commande ' || NEW.order_number || ' est maintenant ' || status_label,
    NEW.id,
    'order'
  );

  SELECT user_id INTO gp_user_id FROM gp_profiles WHERE id = NEW.gp_id;
  
  IF gp_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
    VALUES (
      gp_user_id,
      'order_status',
      'Commande ' || status_label,
      'La commande ' || NEW.order_number || ' est maintenant ' || status_label,
      NEW.id,
      'order'
    );
  END IF;

  v_recipient_user_id := NEW.recipient_user_id;
  IF v_recipient_user_id IS NOT NULL AND v_recipient_user_id != NEW.client_id THEN
    INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
    VALUES (
      v_recipient_user_id,
      'order_status',
      'Colis ' || status_label,
      'Le colis ' || NEW.order_number || ' qui vous est destine est maintenant ' || status_label,
      NEW.id,
      'order'
    );
  END IF;

  RETURN NEW;
END;
$function$;
