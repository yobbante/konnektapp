-- Fix security warnings: set search_path for function
CREATE OR REPLACE FUNCTION public.record_offer_price_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.gp_price_history (gp_id, price_per_kg, currency, origin_city, origin_country, destination_city, destination_country, offer_id)
  VALUES (NEW.gp_id, NEW.price_per_kg, NEW.currency, NEW.origin_city, NEW.origin_country, NEW.destination_city, NEW.destination_country, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Replace overly permissive policy with more restrictive one
DROP POLICY IF EXISTS "System can insert price history" ON public.gp_price_history;

-- Allow GPs to insert their own price history and trigger-based inserts
CREATE POLICY "GPs can insert their price history"
ON public.gp_price_history
FOR INSERT
WITH CHECK (gp_id IN (SELECT id FROM gp_profiles WHERE user_id = auth.uid()) OR auth.uid() IS NULL);