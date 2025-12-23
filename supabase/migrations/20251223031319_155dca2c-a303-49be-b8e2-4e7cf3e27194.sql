-- Create trigger function for dispute notifications
CREATE OR REPLACE FUNCTION public.notify_dispute_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_gp_user_id UUID;
  v_client_name TEXT;
BEGIN
  -- Get order info
  SELECT o.*, gp.user_id AS gp_user_id, p.full_name AS client_name
  INTO v_order
  FROM orders o
  JOIN gp_profiles gp ON o.gp_id = gp.id
  LEFT JOIN profiles p ON o.client_id = p.user_id
  WHERE o.id = NEW.order_id;

  -- Notify the transporter
  IF v_order.gp_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
    VALUES (
      v_order.gp_user_id,
      'Litige ouvert sur votre commande',
      'Un litige a été ouvert pour la commande ' || v_order.order_number || '. Vous avez 72h pour répondre.',
      'dispute',
      NEW.id,
      'dispute'
    );
  END IF;

  -- Notify the client if initiated by system/admin
  IF NEW.initiated_by_type != 'client' THEN
    INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
    VALUES (
      v_order.client_id,
      'Litige ouvert sur votre commande',
      'Un litige a été ouvert pour la commande ' || v_order.order_number,
      'dispute',
      NEW.id,
      'dispute'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for new disputes
DROP TRIGGER IF EXISTS trigger_notify_dispute_created ON disputes;
CREATE TRIGGER trigger_notify_dispute_created
  AFTER INSERT ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION notify_dispute_created();

-- Create trigger function for dispute status updates
CREATE OR REPLACE FUNCTION public.notify_dispute_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_status_label TEXT;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get order info
  SELECT o.*, gp.user_id AS gp_user_id
  INTO v_order
  FROM orders o
  JOIN gp_profiles gp ON o.gp_id = gp.id
  WHERE o.id = NEW.order_id;

  -- Map status labels
  v_status_label := CASE NEW.status
    WHEN 'open' THEN 'ouvert'
    WHEN 'under_review' THEN 'en cours d''examen'
    WHEN 'awaiting_response' THEN 'en attente de réponse'
    WHEN 'provisional_decision' THEN 'décision provisoire rendue'
    WHEN 'closed' THEN 'clôturé'
    ELSE NEW.status::text
  END;

  -- Notify client
  INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
  VALUES (
    v_order.client_id,
    'Mise à jour de votre litige',
    'Le litige ' || NEW.dispute_number || ' est maintenant ' || v_status_label,
    'dispute',
    NEW.id,
    'dispute'
  );

  -- Notify transporter
  INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
  VALUES (
    v_order.gp_user_id,
    'Mise à jour d''un litige',
    'Le litige ' || NEW.dispute_number || ' est maintenant ' || v_status_label,
    'dispute',
    NEW.id,
    'dispute'
  );

  RETURN NEW;
END;
$$;

-- Create trigger for dispute status changes
DROP TRIGGER IF EXISTS trigger_notify_dispute_status_change ON disputes;
CREATE TRIGGER trigger_notify_dispute_status_change
  AFTER UPDATE OF status ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION notify_dispute_status_change();