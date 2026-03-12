
-- Mobility wallets table
CREATE TABLE public.mobility_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobility_profile_id UUID NOT NULL REFERENCES public.mobility_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  pending_balance NUMERIC NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC NOT NULL DEFAULT 8,
  currency TEXT NOT NULL DEFAULT 'XOF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(mobility_profile_id)
);

ALTER TABLE public.mobility_wallets ENABLE ROW LEVEL SECURITY;

-- Owner can view own wallet
CREATE POLICY "mobility_wallet_owner_select" ON public.mobility_wallets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Owner can update own wallet
CREATE POLICY "mobility_wallet_owner_update" ON public.mobility_wallets
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Admin can view all
CREATE POLICY "mobility_wallet_admin_select" ON public.mobility_wallets
  FOR SELECT TO authenticated
  USING (public.has_admin_access(auth.uid()));

-- Auto-create wallet on mobility profile creation
CREATE OR REPLACE FUNCTION public.create_mobility_wallet()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.mobility_wallets (mobility_profile_id, user_id)
  VALUES (NEW.id, NEW.user_id)
  ON CONFLICT (mobility_profile_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_mobility_wallet
  AFTER INSERT ON public.mobility_profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_mobility_wallet();

-- Mobility transactions log
CREATE TABLE public.mobility_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.mobility_wallets(id),
  booking_id UUID REFERENCES public.mobility_bookings(id),
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL, -- 'booking_credit', 'commission', 'withdrawal'
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mobility_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mobility_tx_owner_select" ON public.mobility_transactions
  FOR SELECT TO authenticated
  USING (wallet_id IN (SELECT id FROM mobility_wallets WHERE user_id = auth.uid()));

CREATE POLICY "mobility_tx_admin_select" ON public.mobility_transactions
  FOR SELECT TO authenticated
  USING (public.has_admin_access(auth.uid()));
