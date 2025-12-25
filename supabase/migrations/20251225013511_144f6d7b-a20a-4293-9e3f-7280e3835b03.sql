-- Create function to notify on new offer matching saved searches
CREATE OR REPLACE FUNCTION public.notify_matching_offers()
RETURNS TRIGGER AS $$
DECLARE
  saved_search RECORD;
BEGIN
  -- Find saved searches that match this new offer
  FOR saved_search IN
    SELECT ss.*, p.user_id
    FROM saved_searches ss
    JOIN profiles p ON p.user_id = ss.user_id
    WHERE ss.notify_enabled = true
      AND (ss.origin_city IS NULL OR LOWER(ss.origin_city) = LOWER(NEW.origin_city))
      AND (ss.destination_city IS NULL OR LOWER(ss.destination_city) = LOWER(NEW.destination_city))
      AND (ss.transport_type IS NULL OR ss.transport_type = NEW.transport_type::text)
      AND (ss.min_price IS NULL OR NEW.price_per_kg >= ss.min_price)
      AND (ss.max_price IS NULL OR NEW.price_per_kg <= ss.max_price)
      AND (ss.min_weight IS NULL OR NEW.available_capacity >= ss.min_weight)
  LOOP
    INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
    VALUES (
      saved_search.user_id,
      'new_offer',
      'Nouvelle offre correspondante',
      format('Une offre %s → %s à %s FCFA/kg correspond à vos critères', NEW.origin_city, NEW.destination_city, NEW.price_per_kg),
      NEW.id,
      'offer'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new offers
DROP TRIGGER IF EXISTS trigger_notify_matching_offers ON gp_offers;
CREATE TRIGGER trigger_notify_matching_offers
  AFTER INSERT ON gp_offers
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION notify_matching_offers();

-- Create function to notify on order status change
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  status_label TEXT;
  gp_user_id UUID;
BEGIN
  -- Only notify if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get human-readable status
  status_label := CASE NEW.status
    WHEN 'pending' THEN 'en attente'
    WHEN 'accepted' THEN 'acceptée'
    WHEN 'collected' THEN 'collectée'
    WHEN 'in_transit' THEN 'en transit'
    WHEN 'delivered' THEN 'livrée'
    WHEN 'cancelled' THEN 'annulée'
    WHEN 'disputed' THEN 'en litige'
    ELSE NEW.status
  END;

  -- Notify client
  INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
  VALUES (
    NEW.client_id,
    'order_status',
    format('Commande %s', status_label),
    format('Votre commande %s est maintenant %s', NEW.order_number, status_label),
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
      format('Commande %s', status_label),
      format('La commande %s est maintenant %s', NEW.order_number, status_label),
      NEW.id,
      'order'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for order status changes
DROP TRIGGER IF EXISTS trigger_notify_order_status ON orders;
CREATE TRIGGER trigger_notify_order_status
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_status_change();

-- Create function to notify on new custom request response
CREATE OR REPLACE FUNCTION public.notify_custom_request_response()
RETURNS TRIGGER AS $$
DECLARE
  request_record RECORD;
BEGIN
  -- Get the request details
  SELECT cr.*, p.user_id as client_user_id
  INTO request_record
  FROM custom_requests cr
  JOIN profiles p ON p.user_id = cr.client_id
  WHERE cr.id = NEW.request_id;

  IF request_record.client_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
    VALUES (
      request_record.client_user_id,
      'quote_response',
      'Nouvelle offre reçue',
      format('Vous avez reçu une offre à %s FCFA pour votre demande %s', NEW.price_proposed, request_record.request_number),
      NEW.request_id,
      'custom_request'
    );
    
    -- Update request status
    UPDATE custom_requests SET status = 'has_responses' WHERE id = NEW.request_id AND status = 'open';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new responses
DROP TRIGGER IF EXISTS trigger_notify_custom_request_response ON custom_request_responses;
CREATE TRIGGER trigger_notify_custom_request_response
  AFTER INSERT ON custom_request_responses
  FOR EACH ROW
  EXECUTE FUNCTION notify_custom_request_response();