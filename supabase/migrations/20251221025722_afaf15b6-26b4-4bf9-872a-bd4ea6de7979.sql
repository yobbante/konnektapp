-- Créer une fonction pour notifier les transporteurs lors d'une nouvelle commande
CREATE OR REPLACE FUNCTION public.notify_gp_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gp_user_id uuid;
  v_client_name text;
BEGIN
  -- Récupérer l'user_id du GP
  SELECT user_id INTO v_gp_user_id
  FROM gp_profiles
  WHERE id = NEW.gp_id;
  
  -- Récupérer le nom du client
  SELECT COALESCE(full_name, 'Client') INTO v_client_name
  FROM profiles
  WHERE user_id = NEW.client_id;
  
  -- Créer la notification pour le GP
  IF v_gp_user_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      related_id,
      related_type
    ) VALUES (
      v_gp_user_id,
      'Nouvelle commande reçue',
      'Commande ' || NEW.order_number || ' de ' || v_client_name || ' - ' || NEW.origin_city || ' → ' || NEW.destination_city || ' (' || NEW.weight || ' kg)',
      'order',
      NEW.id,
      'order'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger pour notifier les GP des nouvelles commandes
DROP TRIGGER IF EXISTS on_new_order_notify_gp ON orders;
CREATE TRIGGER on_new_order_notify_gp
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_gp_new_order();

-- Fonction pour notifier les transporteurs des changements de statut
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gp_user_id uuid;
  v_status_label text;
BEGIN
  -- Seulement si le statut a changé
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Mapper les statuts
  v_status_label := CASE NEW.status
    WHEN 'pending' THEN 'en attente'
    WHEN 'accepted' THEN 'acceptée'
    WHEN 'collected' THEN 'collecté'
    WHEN 'in_transit' THEN 'en transit'
    WHEN 'delivered' THEN 'livré'
    WHEN 'cancelled' THEN 'annulée'
    WHEN 'disputed' THEN 'en litige'
    ELSE NEW.status
  END;
  
  -- Récupérer l'user_id du GP
  SELECT user_id INTO v_gp_user_id
  FROM gp_profiles
  WHERE id = NEW.gp_id;
  
  -- Notifier le client
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    related_id,
    related_type
  ) VALUES (
    NEW.client_id,
    'Statut de commande mis à jour',
    'Votre commande ' || NEW.order_number || ' est maintenant ' || v_status_label,
    'order',
    NEW.id,
    'order'
  );
  
  RETURN NEW;
END;
$$;

-- Trigger pour notifier des changements de statut
DROP TRIGGER IF EXISTS on_order_status_change ON orders;
CREATE TRIGGER on_order_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_status_change();

-- Permettre aux edge functions d'insérer des notifications
CREATE POLICY "Service can insert notifications"
ON notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- Ajouter les véhicules de déménagement aux types existants
-- Les types sont déjà dans le code frontend, pas besoin de migration