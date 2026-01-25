-- Fix the trigger that causes FK error by checking if order exists first
DROP TRIGGER IF EXISTS set_gp_response_deadline ON public.orders;

CREATE OR REPLACE FUNCTION public.check_gp_response_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deadline TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only create tracking for pending orders that already exist
  -- This is now called AFTER insert, not BEFORE
  IF NEW.status = 'pending' AND NEW.gp_id IS NOT NULL THEN
    v_deadline := NEW.created_at + INTERVAL '24 hours';
    
    -- Insert tracking record
    INSERT INTO public.gp_response_tracking (order_id, gp_id, deadline_at)
    VALUES (NEW.id, NEW.gp_id, v_deadline)
    ON CONFLICT (order_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create AFTER INSERT trigger instead of BEFORE
CREATE TRIGGER set_gp_response_deadline
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.check_gp_response_deadline();

-- Add unique constraint to prevent duplicates
ALTER TABLE public.gp_response_tracking 
DROP CONSTRAINT IF EXISTS gp_response_tracking_order_id_key;

ALTER TABLE public.gp_response_tracking 
ADD CONSTRAINT gp_response_tracking_order_id_key UNIQUE (order_id);

-- Add system history insert policy for triggers
DROP POLICY IF EXISTS "System can insert status history" ON public.order_status_history;
CREATE POLICY "System can insert status history" ON public.order_status_history
FOR INSERT
WITH CHECK (true);