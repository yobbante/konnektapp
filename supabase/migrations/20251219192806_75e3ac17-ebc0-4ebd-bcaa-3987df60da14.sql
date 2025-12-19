-- Create enum for offer status
CREATE TYPE public.offer_status AS ENUM ('active', 'paused', 'expired', 'completed');

-- Create enum for order status
CREATE TYPE public.order_status AS ENUM ('pending', 'accepted', 'in_transit', 'delivered', 'cancelled', 'disputed');

-- Create enum for transaction type
CREATE TYPE public.transaction_type AS ENUM ('earning', 'withdrawal', 'commission', 'refund', 'bonus');

-- Create GP offers table
CREATE TABLE public.gp_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  -- Route info
  origin_city TEXT NOT NULL,
  origin_country TEXT NOT NULL DEFAULT 'SN',
  destination_city TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  -- Pricing
  price_per_kg INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'FCFA',
  min_weight NUMERIC(10,2) DEFAULT 0.5,
  max_weight NUMERIC(10,2),
  -- Schedule
  departure_date TIMESTAMP WITH TIME ZONE NOT NULL,
  arrival_date TIMESTAMP WITH TIME ZONE,
  -- Capacity
  total_capacity NUMERIC(10,2) NOT NULL,
  available_capacity NUMERIC(10,2) NOT NULL,
  -- Status
  status offer_status NOT NULL DEFAULT 'active',
  transport_type public.gp_type NOT NULL,
  -- Details
  description TEXT,
  conditions TEXT,
  -- Stats
  views_count INTEGER DEFAULT 0,
  bookings_count INTEGER DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on gp_offers
ALTER TABLE public.gp_offers ENABLE ROW LEVEL SECURITY;

-- GP Offers RLS policies
CREATE POLICY "GPs can manage their own offers"
ON public.gp_offers FOR ALL
USING (gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view active offers"
ON public.gp_offers FOR SELECT
USING (status = 'active');

-- Create orders/shipments table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  -- Parties
  client_id UUID NOT NULL REFERENCES auth.users(id),
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id),
  offer_id UUID REFERENCES public.gp_offers(id),
  -- Route
  origin_city TEXT NOT NULL,
  origin_country TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  -- Package details
  weight NUMERIC(10,2) NOT NULL,
  dimensions TEXT,
  description TEXT,
  declared_value INTEGER,
  -- Pricing
  price_per_kg INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  commission_amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'FCFA',
  -- Status
  status order_status NOT NULL DEFAULT 'pending',
  -- Insurance
  has_insurance BOOLEAN DEFAULT false,
  insurance_amount INTEGER DEFAULT 0,
  -- Tracking
  tracking_code TEXT,
  pickup_date TIMESTAMP WITH TIME ZONE,
  delivery_date TIMESTAMP WITH TIME ZONE,
  actual_delivery_date TIMESTAMP WITH TIME ZONE,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Orders RLS policies
CREATE POLICY "Clients can view their own orders"
ON public.orders FOR SELECT
USING (client_id = auth.uid());

CREATE POLICY "Clients can create orders"
ON public.orders FOR INSERT
WITH CHECK (client_id = auth.uid());

CREATE POLICY "GPs can view orders assigned to them"
ON public.orders FOR SELECT
USING (gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "GPs can update orders assigned to them"
ON public.orders FOR UPDATE
USING (gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid()));

-- Create GP wallet table
CREATE TABLE public.gp_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gp_id UUID NOT NULL UNIQUE REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  pending_balance INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_withdrawn INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'FCFA',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on gp_wallets
ALTER TABLE public.gp_wallets ENABLE ROW LEVEL SECURITY;

-- GP Wallets RLS policies
CREATE POLICY "GPs can view their own wallet"
ON public.gp_wallets FOR SELECT
USING (gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "GPs can update their own wallet"
ON public.gp_wallets FOR UPDATE
USING (gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid()));

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.gp_wallets(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  type transaction_type NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'FCFA',
  description TEXT,
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Transactions RLS policies
CREATE POLICY "GPs can view their own transactions"
ON public.transactions FOR SELECT
USING (wallet_id IN (
  SELECT id FROM public.gp_wallets 
  WHERE gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid())
));

-- Function to generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'YOB-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for order number
CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION public.generate_order_number();

-- Function to create wallet when GP profile is created
CREATE OR REPLACE FUNCTION public.create_gp_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.gp_wallets (gp_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for wallet creation
CREATE TRIGGER create_wallet_on_gp_profile
  AFTER INSERT ON public.gp_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_gp_wallet();

-- Update triggers for updated_at
CREATE TRIGGER update_gp_offers_updated_at
  BEFORE UPDATE ON public.gp_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gp_wallets_updated_at
  BEFORE UPDATE ON public.gp_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();