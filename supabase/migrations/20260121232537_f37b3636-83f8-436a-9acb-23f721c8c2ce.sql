-- Create table for loyalty points history
CREATE TABLE IF NOT EXISTS public.loyalty_points_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'bonus', 'expired')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_points_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own points history
CREATE POLICY "Users can view their own points history"
ON public.loyalty_points_history
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own points (for redemption)
CREATE POLICY "Users can insert their own redemption points"
ON public.loyalty_points_history
FOR INSERT
WITH CHECK (auth.uid() = user_id AND type = 'redeemed');

-- Admins can manage all points history
CREATE POLICY "Admins can manage all points history"
ON public.loyalty_points_history
FOR ALL
USING (has_admin_access(auth.uid()));

-- Create table for tracking tier notifications sent
CREATE TABLE IF NOT EXISTS public.loyalty_tier_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.loyalty_tiers(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('approaching', 'reached')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tier_id, notification_type)
);

-- Enable RLS
ALTER TABLE public.loyalty_tier_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own tier notifications"
ON public.loyalty_tier_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "System can insert tier notifications"
ON public.loyalty_tier_notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add available_points column to client_loyalty if not exists
ALTER TABLE public.client_loyalty 
ADD COLUMN IF NOT EXISTS available_points INTEGER NOT NULL DEFAULT 0;

-- Update client loyalty trigger to also insert points history
CREATE OR REPLACE FUNCTION public.update_client_loyalty_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  points_earned INTEGER;
  next_tier_id UUID;
  current_tier_min_orders INTEGER;
  next_tier_min_orders INTEGER;
BEGIN
  -- Only process when status changes to 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Calculate points (10 points per 1000 FCFA spent)
    points_earned := GREATEST(1, FLOOR(NEW.total_price / 1000) * 10);
    
    -- Insert or update client_loyalty
    INSERT INTO client_loyalty (user_id, total_orders, total_spent, total_points, available_points)
    VALUES (NEW.client_id, 1, COALESCE(NEW.total_price, 0), points_earned, points_earned)
    ON CONFLICT (user_id) DO UPDATE SET
      total_orders = client_loyalty.total_orders + 1,
      total_spent = client_loyalty.total_spent + COALESCE(NEW.total_price, 0),
      total_points = client_loyalty.total_points + points_earned,
      available_points = client_loyalty.available_points + points_earned,
      updated_at = now();
    
    -- Record points in history
    INSERT INTO loyalty_points_history (user_id, order_id, points, type, description)
    VALUES (NEW.client_id, NEW.id, points_earned, 'earned', 
            'Points gagnés pour commande ' || COALESCE(NEW.order_number, 'N/A'));
    
    -- Update tier based on total orders
    UPDATE client_loyalty cl
    SET current_tier_id = (
      SELECT lt.id FROM loyalty_tiers lt
      WHERE cl.total_orders >= lt.min_orders
      ORDER BY lt.min_orders DESC
      LIMIT 1
    ),
    tier_updated_at = CASE 
      WHEN current_tier_id IS DISTINCT FROM (
        SELECT lt.id FROM loyalty_tiers lt
        WHERE cl.total_orders >= lt.min_orders
        ORDER BY lt.min_orders DESC
        LIMIT 1
      ) THEN now()
      ELSE tier_updated_at
    END
    WHERE cl.user_id = NEW.client_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create function to check and send tier progress notifications
CREATE OR REPLACE FUNCTION public.check_loyalty_tier_progress(p_user_id UUID)
RETURNS TABLE(notification_type TEXT, tier_name TEXT, progress_percent INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_orders INTEGER;
  v_current_tier_id UUID;
  v_next_tier RECORD;
  v_progress INTEGER;
BEGIN
  -- Get current loyalty status
  SELECT total_orders, current_tier_id INTO v_current_orders, v_current_tier_id
  FROM client_loyalty WHERE user_id = p_user_id;
  
  IF v_current_orders IS NULL THEN
    RETURN;
  END IF;
  
  -- Find next tier
  SELECT * INTO v_next_tier
  FROM loyalty_tiers lt
  WHERE lt.min_orders > v_current_orders
  ORDER BY lt.min_orders ASC
  LIMIT 1;
  
  IF v_next_tier IS NULL THEN
    RETURN; -- Already at max tier
  END IF;
  
  -- Calculate progress
  v_progress := (v_current_orders * 100) / v_next_tier.min_orders;
  
  -- Check if user is approaching next tier (80%+) and hasn't been notified
  IF v_progress >= 80 THEN
    IF NOT EXISTS (
      SELECT 1 FROM loyalty_tier_notifications 
      WHERE user_id = p_user_id 
      AND tier_id = v_next_tier.id 
      AND notification_type = 'approaching'
    ) THEN
      -- Insert notification record
      INSERT INTO loyalty_tier_notifications (user_id, tier_id, notification_type)
      VALUES (p_user_id, v_next_tier.id, 'approaching')
      ON CONFLICT DO NOTHING;
      
      notification_type := 'approaching';
      tier_name := v_next_tier.name;
      progress_percent := v_progress;
      RETURN NEXT;
    END IF;
  END IF;
  
  RETURN;
END;
$$;