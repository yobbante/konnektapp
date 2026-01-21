-- Create exchange rates table for admin currency conversion
CREATE TABLE public.exchange_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(from_currency, to_currency)
);

-- Enable RLS
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone can read, only admins can manage
CREATE POLICY "Anyone can view exchange rates"
ON public.exchange_rates
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage exchange rates"
ON public.exchange_rates
FOR ALL
USING (has_admin_access(auth.uid()));

-- Create price history table for tracking GP pricing over time
CREATE TABLE public.gp_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  price_per_kg NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  origin_city TEXT,
  origin_country TEXT,
  destination_city TEXT,
  destination_country TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  offer_id UUID REFERENCES public.gp_offers(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.gp_price_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all price history"
ON public.gp_price_history
FOR SELECT
USING (has_admin_access(auth.uid()));

CREATE POLICY "GPs can view their own price history"
ON public.gp_price_history
FOR SELECT
USING (gp_id IN (SELECT id FROM gp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "System can insert price history"
ON public.gp_price_history
FOR INSERT
WITH CHECK (true);

-- Insert default exchange rates (EUR as base)
INSERT INTO public.exchange_rates (from_currency, to_currency, rate) VALUES
('EUR', 'XOF', 655.957),
('EUR', 'USD', 1.08),
('EUR', 'CAD', 1.47),
('EUR', 'AED', 3.97),
('EUR', 'GBP', 0.86),
('EUR', 'MAD', 10.85),
('XOF', 'EUR', 0.00152),
('USD', 'EUR', 0.93),
('CAD', 'EUR', 0.68),
('AED', 'EUR', 0.25),
('GBP', 'EUR', 1.16),
('MAD', 'EUR', 0.092);

-- Trigger to record price history when offers are created/updated
CREATE OR REPLACE FUNCTION public.record_offer_price_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.gp_price_history (gp_id, price_per_kg, currency, origin_city, origin_country, destination_city, destination_country, offer_id)
  VALUES (NEW.gp_id, NEW.price_per_kg, NEW.currency, NEW.origin_city, NEW.origin_country, NEW.destination_city, NEW.destination_country, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_record_price_history
AFTER INSERT OR UPDATE OF price_per_kg ON public.gp_offers
FOR EACH ROW
EXECUTE FUNCTION public.record_offer_price_history();