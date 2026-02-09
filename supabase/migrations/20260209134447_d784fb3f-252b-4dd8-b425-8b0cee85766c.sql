-- Step 1: Add recipient tracking fields to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS recipient_phone text,
  ADD COLUMN IF NOT EXISTS recipient_user_id uuid,
  ADD COLUMN IF NOT EXISTS delivery_code text,
  ADD COLUMN IF NOT EXISTS delivery_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_confirmed_by_phone text;

-- Step 2: Generate delivery code trigger
CREATE OR REPLACE FUNCTION public.generate_delivery_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.delivery_code IS NULL THEN
    NEW.delivery_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS set_delivery_code ON public.orders;
CREATE TRIGGER set_delivery_code
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_delivery_code();

-- Step 3: Create delivery confirmations table
CREATE TABLE IF NOT EXISTS public.delivery_confirmations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id),
  confirmed_by_phone text NOT NULL,
  confirmed_by_name text,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_account boolean DEFAULT false,
  created_user_id uuid
);

ALTER TABLE public.delivery_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can confirm delivery"
  ON public.delivery_confirmations FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all confirmations"
  ON public.delivery_confirmations FOR SELECT
  USING (has_admin_access(auth.uid()));

CREATE POLICY "Order participants can view confirmations"
  ON public.delivery_confirmations FOR SELECT
  USING (
    order_id IN (SELECT id FROM orders WHERE client_id = auth.uid())
    OR order_id IN (
      SELECT o.id FROM orders o JOIN gp_profiles gp ON o.gp_id = gp.id WHERE gp.user_id = auth.uid()
    )
  );

-- Step 4: Public read access for delivery page (limited fields via edge function)
CREATE POLICY "Public can view order for delivery"
  ON public.orders FOR SELECT
  USING (delivery_code IS NOT NULL AND status IN ('in_transit'::order_status, 'delivered'::order_status));