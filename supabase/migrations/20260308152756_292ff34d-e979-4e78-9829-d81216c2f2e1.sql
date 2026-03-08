
-- Auto-accept trigger: when an order is created with status 'pending',
-- if the GP has premium/pro subscription AND auto_accept_enabled, auto-accept it
CREATE OR REPLACE FUNCTION public.auto_accept_premium_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_gp RECORD;
BEGIN
  -- Only process new pending orders
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Check if GP has premium/pro AND auto_accept_enabled
  SELECT subscription, auto_accept_enabled
  INTO v_gp
  FROM public.gp_profiles
  WHERE id = NEW.gp_id;

  IF v_gp.subscription IN ('premium', 'pro') AND v_gp.auto_accept_enabled = true THEN
    NEW.status := 'accepted';
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger (BEFORE INSERT so it modifies the row before saving)
DROP TRIGGER IF EXISTS trg_auto_accept_premium_orders ON public.orders;
CREATE TRIGGER trg_auto_accept_premium_orders
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_accept_premium_orders();

-- Function to get premium commission discount
CREATE OR REPLACE FUNCTION public.get_premium_commission_discount(p_subscription text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF p_subscription = 'pro' THEN RETURN 0.60;      -- 40% reduction
  ELSIF p_subscription = 'premium' THEN RETURN 0.80; -- 20% reduction
  ELSE RETURN 1.00;                                   -- no discount
  END IF;
END;
$$;
