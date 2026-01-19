-- Create escrow transactions table for secure payments
CREATE TABLE public.escrow_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'held', 'released', 'refunded', 'disputed')),
  payment_method TEXT,
  payment_reference TEXT,
  held_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  release_reason TEXT,
  refund_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add payment_status to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'held', 'released', 'refunded'));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS escrow_id UUID REFERENCES public.escrow_transactions(id);

-- Enable RLS on escrow_transactions
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for escrow_transactions
CREATE POLICY "Users can view their own escrow transactions"
  ON public.escrow_transactions FOR SELECT
  USING (
    client_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.gp_profiles WHERE id = escrow_transactions.gp_id AND user_id = auth.uid()) OR
    public.has_admin_access(auth.uid())
  );

CREATE POLICY "Clients can create escrow for their orders"
  ON public.escrow_transactions FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Admins can update escrow status"
  ON public.escrow_transactions FOR UPDATE
  USING (public.has_admin_access(auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER update_escrow_transactions_updated_at
  BEFORE UPDATE ON public.escrow_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to match baggage requests with GP voyages
CREATE OR REPLACE FUNCTION public.match_baggage_requests_to_voyages()
RETURNS TRIGGER AS $$
DECLARE
  matching_gp RECORD;
  request_weight NUMERIC;
BEGIN
  -- Only for baggage international type requests
  IF NEW.transport_type != 'bagages_international' THEN
    RETURN NEW;
  END IF;
  
  -- Get estimated weight from request
  request_weight := COALESCE(NEW.weight_estimate, 10);
  
  -- Find matching GP voyages
  FOR matching_gp IN
    SELECT 
      gp.id as gp_id,
      gp.user_id,
      gpo.id as offer_id,
      gpo.origin_city,
      gpo.destination_city,
      gpo.departure_date,
      gpo.available_capacity,
      gpo.price_per_kg,
      gpf.business_name
    FROM public.gp_offers gpo
    INNER JOIN public.gp_profiles gpf ON gpo.gp_id = gpf.id
    INNER JOIN public.gp_profiles gp ON gpf.id = gp.id
    WHERE gpo.transport_type = 'bagages_international'
      AND gpo.status = 'active'
      AND LOWER(gpo.origin_city) = LOWER(NEW.origin_city)
      AND LOWER(gpo.destination_city) = LOWER(NEW.destination_city)
      AND gpo.departure_date >= COALESCE(NEW.pickup_date_from, CURRENT_DATE)
      AND gpo.departure_date <= COALESCE(NEW.pickup_date_to, CURRENT_DATE + INTERVAL '30 days')
      AND gpo.available_capacity >= request_weight
  LOOP
    -- Create notification for matching GP
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      related_id,
      related_type
    ) VALUES (
      matching_gp.user_id,
      'Nouvelle demande de bagage correspondante',
      'Une demande de ' || request_weight || ' kg correspond à votre voyage ' || 
      matching_gp.origin_city || ' → ' || matching_gp.destination_city || 
      ' du ' || TO_CHAR(matching_gp.departure_date, 'DD/MM/YYYY'),
      'matching_request',
      NEW.id,
      'custom_request'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic matching
DROP TRIGGER IF EXISTS trigger_match_baggage_requests ON public.custom_requests;
CREATE TRIGGER trigger_match_baggage_requests
  AFTER INSERT ON public.custom_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.match_baggage_requests_to_voyages();

-- Function to notify clients when matching voyage is created
CREATE OR REPLACE FUNCTION public.match_voyages_to_pending_requests()
RETURNS TRIGGER AS $$
DECLARE
  matching_request RECORD;
BEGIN
  -- Only for baggage international voyages
  IF NEW.transport_type != 'bagages_international' THEN
    RETURN NEW;
  END IF;
  
  -- Find matching pending requests
  FOR matching_request IN
    SELECT 
      cr.id,
      cr.client_id,
      cr.weight_estimate,
      cr.origin_city,
      cr.destination_city
    FROM public.custom_requests cr
    WHERE cr.transport_type = 'bagages_international'
      AND cr.status IN ('open', 'has_responses')
      AND LOWER(cr.origin_city) = LOWER(NEW.origin_city)
      AND LOWER(cr.destination_city) = LOWER(NEW.destination_city)
      AND NEW.departure_date >= COALESCE(cr.pickup_date_from, CURRENT_DATE)
      AND NEW.departure_date <= COALESCE(cr.pickup_date_to, CURRENT_DATE + INTERVAL '30 days')
      AND NEW.available_capacity >= COALESCE(cr.weight_estimate, 10)
  LOOP
    -- Notify client of matching voyage
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      related_id,
      related_type
    ) VALUES (
      matching_request.client_id,
      'Nouveau voyage correspondant à votre demande',
      'Un GP propose un voyage ' || NEW.origin_city || ' → ' || NEW.destination_city || 
      ' le ' || TO_CHAR(NEW.departure_date, 'DD/MM/YYYY') || ' à ' || NEW.price_per_kg || ' FCFA/kg',
      'matching_voyage',
      NEW.id,
      'offer'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for voyage to request matching
DROP TRIGGER IF EXISTS trigger_match_voyages_to_requests ON public.gp_offers;
CREATE TRIGGER trigger_match_voyages_to_requests
  AFTER INSERT ON public.gp_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.match_voyages_to_pending_requests();

-- Enable realtime for escrow_transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.escrow_transactions;