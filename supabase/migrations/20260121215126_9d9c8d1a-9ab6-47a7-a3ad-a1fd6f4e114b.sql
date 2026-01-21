-- Add default_currency to gp_profiles if not exists
ALTER TABLE public.gp_profiles 
ADD COLUMN IF NOT EXISTS default_currency text DEFAULT 'XOF';

-- Create client loyalty system tables
CREATE TABLE public.loyalty_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  min_orders integer NOT NULL DEFAULT 0,
  min_spent integer NOT NULL DEFAULT 0,
  discount_percent numeric NOT NULL DEFAULT 0,
  badge_icon text,
  badge_color text DEFAULT '#FFD700',
  perks text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default tiers
INSERT INTO public.loyalty_tiers (name, min_orders, min_spent, discount_percent, badge_icon, badge_color, perks) VALUES
('Bronze', 0, 0, 0, 'medal', '#CD7F32', ARRAY['Suivi en temps réel', 'Support prioritaire']),
('Argent', 3, 50000, 3, 'medal', '#C0C0C0', ARRAY['Suivi en temps réel', 'Support prioritaire', '3% de réduction']),
('Or', 10, 200000, 5, 'crown', '#FFD700', ARRAY['Suivi en temps réel', 'Support VIP', '5% de réduction', 'Priorité sur les transporteurs']),
('Platine', 25, 500000, 8, 'gem', '#E5E4E2', ARRAY['Suivi en temps réel', 'Support VIP dédié', '8% de réduction', 'Priorité maximale', 'Cadeaux exclusifs']),
('Diamant', 50, 1000000, 12, 'diamond', '#B9F2FF', ARRAY['Tout Platine', '12% de réduction', 'Gestionnaire de compte dédié', 'Événements exclusifs']);

-- Create client loyalty status table
CREATE TABLE public.client_loyalty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_tier_id uuid REFERENCES public.loyalty_tiers(id),
  total_orders integer NOT NULL DEFAULT 0,
  total_spent integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL DEFAULT 0,
  points_redeemed integer NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  tier_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_loyalty ENABLE ROW LEVEL SECURITY;

-- RLS policies for loyalty_tiers (public read)
CREATE POLICY "Anyone can view loyalty tiers"
ON public.loyalty_tiers FOR SELECT
USING (true);

-- RLS policies for client_loyalty
CREATE POLICY "Users can view their own loyalty status"
ON public.client_loyalty FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own loyalty record"
ON public.client_loyalty FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update loyalty status"
ON public.client_loyalty FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all loyalty records"
ON public.client_loyalty FOR ALL
USING (has_admin_access(auth.uid()));

-- Function to update client loyalty on order completion
CREATE OR REPLACE FUNCTION public.update_client_loyalty_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tier_id uuid;
  v_current_loyalty RECORD;
  v_new_total_orders integer;
  v_new_total_spent integer;
BEGIN
  -- Only trigger on status change to delivered
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Get or create loyalty record
    SELECT * INTO v_current_loyalty
    FROM client_loyalty
    WHERE user_id = NEW.client_id;
    
    IF v_current_loyalty IS NULL THEN
      -- Create new loyalty record
      INSERT INTO client_loyalty (user_id, total_orders, total_spent, total_points)
      VALUES (NEW.client_id, 1, COALESCE(NEW.total_price, 0), COALESCE(NEW.total_price, 0) / 100)
      RETURNING * INTO v_current_loyalty;
    ELSE
      -- Update existing record
      v_new_total_orders := v_current_loyalty.total_orders + 1;
      v_new_total_spent := v_current_loyalty.total_spent + COALESCE(NEW.total_price, 0);
      
      UPDATE client_loyalty
      SET 
        total_orders = v_new_total_orders,
        total_spent = v_new_total_spent,
        total_points = total_points + (COALESCE(NEW.total_price, 0) / 100),
        updated_at = now()
      WHERE user_id = NEW.client_id;
      
      v_current_loyalty.total_orders := v_new_total_orders;
      v_current_loyalty.total_spent := v_new_total_spent;
    END IF;
    
    -- Find appropriate tier
    SELECT id INTO v_tier_id
    FROM loyalty_tiers
    WHERE min_orders <= v_current_loyalty.total_orders
      AND min_spent <= v_current_loyalty.total_spent
    ORDER BY min_orders DESC, min_spent DESC
    LIMIT 1;
    
    -- Update tier if changed
    IF v_tier_id IS DISTINCT FROM v_current_loyalty.current_tier_id THEN
      UPDATE client_loyalty
      SET current_tier_id = v_tier_id, tier_updated_at = now(), updated_at = now()
      WHERE user_id = NEW.client_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for loyalty updates
CREATE TRIGGER update_loyalty_on_order_delivered
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_client_loyalty_on_order();

-- Enable realtime for loyalty
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_loyalty;