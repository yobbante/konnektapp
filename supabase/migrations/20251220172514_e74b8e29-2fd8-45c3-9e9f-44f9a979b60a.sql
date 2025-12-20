-- Create order logistics details table for mandatory post-booking form
CREATE TABLE public.order_logistics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE UNIQUE,
  
  -- A. Marchandise
  merchandise_type TEXT NOT NULL,
  merchandise_description TEXT,
  estimated_weight NUMERIC NOT NULL,
  estimated_volume TEXT,
  declared_value INTEGER,
  
  -- B. Conditions
  is_fragile BOOLEAN NOT NULL DEFAULT false,
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  special_conditions TEXT,
  
  -- C. Logistique
  pickup_address TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  pickup_date TIMESTAMP WITH TIME ZONE NOT NULL,
  pickup_time_slot TEXT,
  
  -- D. Validation
  validated_at TIMESTAMP WITH TIME ZONE,
  locked_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_logistics ENABLE ROW LEVEL SECURITY;

-- Clients can create and view their own order logistics
CREATE POLICY "Clients can insert their order logistics"
ON public.order_logistics FOR INSERT
TO authenticated
WITH CHECK (
  order_id IN (SELECT id FROM public.orders WHERE client_id = auth.uid())
);

CREATE POLICY "Clients can view their order logistics"
ON public.order_logistics FOR SELECT
TO authenticated
USING (
  order_id IN (SELECT id FROM public.orders WHERE client_id = auth.uid())
);

CREATE POLICY "Clients can update their order logistics if not locked"
ON public.order_logistics FOR UPDATE
TO authenticated
USING (
  order_id IN (SELECT id FROM public.orders WHERE client_id = auth.uid())
  AND locked_at IS NULL
);

-- GPs can view logistics for their assigned orders (only when validated)
CREATE POLICY "GPs can view validated order logistics"
ON public.order_logistics FOR SELECT
TO authenticated
USING (
  validated_at IS NOT NULL
  AND order_id IN (
    SELECT id FROM public.orders 
    WHERE gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid())
  )
);

-- Admins can view all logistics
CREATE POLICY "Admins can view all order logistics"
ON public.order_logistics FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_order_logistics_updated_at
BEFORE UPDATE ON public.order_logistics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add logistics_status to orders for tracking form completion
ALTER TABLE public.orders ADD COLUMN logistics_status TEXT NOT NULL DEFAULT 'pending_info';
-- Values: 'pending_info' (waiting for form), 'submitted' (form filled), 'accepted' (GP accepted)

-- Update existing orders to 'submitted' status (assuming they have info already)
UPDATE public.orders SET logistics_status = 'submitted' WHERE id IS NOT NULL;