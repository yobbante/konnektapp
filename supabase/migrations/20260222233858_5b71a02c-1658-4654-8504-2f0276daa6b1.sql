
CREATE OR REPLACE FUNCTION public.notify_gp_new_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_gp_user_id uuid;
  v_client_name text;
  v_message text;
BEGIN
  -- Récupérer l'user_id du GP
  SELECT user_id INTO v_gp_user_id
  FROM gp_profiles
  WHERE id = NEW.gp_id;
  
  -- Récupérer le nom du client
  SELECT COALESCE(full_name, 'Client') INTO v_client_name
  FROM profiles
  WHERE user_id = NEW.client_id;
  
  -- Construire le message avec COALESCE pour éviter les NULL
  v_message := 'Commande ' || COALESCE(NEW.order_number, 'N/A') || ' de ' || COALESCE(v_client_name, 'Client') || ' - ' || COALESCE(NEW.origin_city, '?') || ' → ' || COALESCE(NEW.destination_city, '?') || ' (' || COALESCE(NEW.weight::text, '0') || ' kg)';
  
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
      v_message,
      'order',
      NEW.id,
      'order'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;
