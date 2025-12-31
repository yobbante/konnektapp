-- Create function to notify transporters when their status changes
CREATE OR REPLACE FUNCTION public.notify_gp_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Only notify if status actually changed
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Set notification content based on new status
  CASE NEW.status
    WHEN 'verified' THEN
      v_title := 'Compte approuvé !';
      v_message := 'Félicitations ! Votre compte transporteur a été validé. Vous pouvez maintenant publier des offres et accepter des missions.';
    WHEN 'rejected' THEN
      v_title := 'Compte refusé';
      v_message := 'Votre demande de compte transporteur a été refusée. Contactez le support pour plus d''informations.';
    WHEN 'suspended' THEN
      v_title := 'Compte suspendu';
      v_message := 'Votre compte transporteur a été suspendu. Contactez le support pour résoudre cette situation.';
    WHEN 'pending' THEN
      v_title := 'Compte en cours de validation';
      v_message := 'Votre compte est en cours d''examen par notre équipe.';
    ELSE
      RETURN NEW;
  END CASE;

  -- Create notification for the transporter
  INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
  VALUES (
    NEW.user_id,
    v_title,
    v_message,
    'account_status',
    NEW.id,
    'gp_profile'
  );

  RETURN NEW;
END;
$$;

-- Create trigger for GP status change notifications
DROP TRIGGER IF EXISTS trigger_notify_gp_status_change ON gp_profiles;
CREATE TRIGGER trigger_notify_gp_status_change
  AFTER UPDATE OF status ON gp_profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_gp_status_change();