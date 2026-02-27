
-- Update notify_order_status_change to also notify recipient
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
  -- Only notify if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get human-readable status (French labels for display only)
  status_label := CASE NEW.status::text
    WHEN 'pending' THEN 'en attente'
    WHEN 'accepted' THEN 'acceptée'
    WHEN 'collected' THEN 'collectée'
    WHEN 'checked_in' THEN 'enregistrée'
    WHEN 'in_transit' THEN 'en transit'
    WHEN 'arrived_destination' THEN 'arrivée à destination'
    WHEN 'delivery_pending' THEN 'livraison en cours'
    WHEN 'delivery_confirmed' THEN 'livrée'
    WHEN 'delivered' THEN 'livrée'
    WHEN 'released' THEN 'terminée'
    WHEN 'cancelled' THEN 'annulée'
    WHEN 'disputed' THEN 'en litige'
    ELSE NEW.status::text
  END;

  -- Notify client
  INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
  VALUES (
    NEW.client_id,
    'order_status',
    'Commande ' || status_label,
    'Votre commande ' || NEW.order_number || ' est maintenant ' || status_label,
    NEW.id,
    'order'
  );

  -- Get GP user_id and notify
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

  -- Notify recipient if different from client
  v_recipient_user_id := NEW.recipient_user_id;
  IF v_recipient_user_id IS NOT NULL AND v_recipient_user_id != NEW.client_id THEN
    INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
    VALUES (
      v_recipient_user_id,
      'order_status',
      '📦 Colis ' || status_label,
      'Le colis ' || NEW.order_number || ' qui vous est destiné est maintenant ' || status_label,
      NEW.id,
      'order'
    );
  END IF;

  RETURN NEW;
END;
$function$;
