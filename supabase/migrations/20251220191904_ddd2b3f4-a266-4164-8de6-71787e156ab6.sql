-- Add city and address columns to profiles for client profile
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Create reviews table for GP ratings
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Clients can insert their own reviews (only for their delivered orders)
CREATE POLICY "Clients can create reviews for their orders"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  client_id = auth.uid() 
  AND order_id IN (
    SELECT id FROM orders 
    WHERE client_id = auth.uid() 
    AND status = 'delivered'
  )
);

-- Anyone can view reviews (public)
CREATE POLICY "Anyone can view reviews"
ON public.reviews
FOR SELECT
TO authenticated
USING (true);

-- Clients can update their own reviews
CREATE POLICY "Clients can update their own reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (client_id = auth.uid());

-- Create function to update GP rating after review
CREATE OR REPLACE FUNCTION public.update_gp_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE gp_profiles
  SET 
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM reviews
      WHERE gp_id = NEW.gp_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE gp_id = NEW.gp_id
    )
  WHERE id = NEW.gp_id;
  RETURN NEW;
END;
$$;

-- Create trigger for rating update
CREATE TRIGGER on_review_created
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gp_rating();

-- Create order status history table for tracking
CREATE TABLE public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_by UUID NOT NULL,
  changed_by_type TEXT NOT NULL CHECK (changed_by_type IN ('client', 'gp', 'admin')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- GPs can insert status updates for their orders
CREATE POLICY "GPs can create status history"
ON public.order_status_history
FOR INSERT
TO authenticated
WITH CHECK (
  changed_by = auth.uid()
  AND order_id IN (
    SELECT id FROM orders 
    WHERE gp_id IN (
      SELECT id FROM gp_profiles WHERE user_id = auth.uid()
    )
  )
);

-- Users can view status history for their orders
CREATE POLICY "Users can view their order status history"
ON public.order_status_history
FOR SELECT
TO authenticated
USING (
  order_id IN (
    SELECT id FROM orders 
    WHERE client_id = auth.uid()
    OR gp_id IN (SELECT id FROM gp_profiles WHERE user_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin')
);