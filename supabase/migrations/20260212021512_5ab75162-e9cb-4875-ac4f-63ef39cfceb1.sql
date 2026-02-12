
-- 1. Add new transaction types
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'order_payment';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'manual_commission';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'release';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'insurance_hold';

-- 2. Add columns to gp_wallets
ALTER TABLE public.gp_wallets
  ADD COLUMN IF NOT EXISTS locked_balance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) NOT NULL DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS commission_due integer NOT NULL DEFAULT 0;

-- 3. Create konnekt_ledger table
CREATE TABLE IF NOT EXISTS public.konnekt_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('payment','commission','release','manual_commission','refund','insurance_hold')),
  order_id uuid REFERENCES public.orders(id),
  gp_id uuid REFERENCES public.gp_profiles(id),
  amount_fcfa integer NOT NULL,
  currency_display text NOT NULL DEFAULT 'XOF',
  amount_display numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','reversed')),
  description text,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.konnekt_ledger ENABLE ROW LEVEL SECURITY;

-- Admin can see all ledger entries
CREATE POLICY "Admins can view ledger"
  ON public.konnekt_ledger FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- GP can view their own ledger entries
CREATE POLICY "GP can view own ledger"
  ON public.konnekt_ledger FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gp_profiles
      WHERE id = konnekt_ledger.gp_id AND user_id = auth.uid()
    )
  );

-- Only server/admin can insert ledger entries
CREATE POLICY "Admin can insert ledger"
  ON public.konnekt_ledger FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gp_id uuid NOT NULL REFERENCES public.gp_profiles(id),
  amount_fcfa integer NOT NULL,
  amount_display numeric(12,2) NOT NULL DEFAULT 0,
  currency_display text NOT NULL DEFAULT 'XOF',
  method text NOT NULL CHECK (method IN ('wave','orange_money','bank_transfer')),
  phone_or_account text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','rejected')),
  admin_notes text,
  processed_at timestamptz,
  processed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- GP can view/create own withdrawal requests
CREATE POLICY "GP can view own withdrawals"
  ON public.withdrawal_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gp_profiles
      WHERE id = withdrawal_requests.gp_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "GP can create withdrawal"
  ON public.withdrawal_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gp_profiles
      WHERE id = withdrawal_requests.gp_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage withdrawals"
  ON public.withdrawal_requests FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Progressive commission function
CREATE OR REPLACE FUNCTION public.get_progressive_commission_rate(p_total_deliveries integer)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF p_total_deliveries >= 1000 THEN RETURN 10.00;
  ELSIF p_total_deliveries >= 600 THEN RETURN 9.00;
  ELSIF p_total_deliveries >= 300 THEN RETURN 8.00;
  ELSIF p_total_deliveries >= 150 THEN RETURN 7.00;
  ELSIF p_total_deliveries >= 50 THEN RETURN 6.00;
  ELSE RETURN 5.00;
  END IF;
END;
$$;

-- 6. Function to update commission rate after delivery
CREATE OR REPLACE FUNCTION public.update_gp_commission_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total integer;
  v_new_rate numeric;
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    SELECT COALESCE(total_deliveries, 0) INTO v_total
    FROM gp_profiles WHERE id = NEW.gp_id;
    
    v_new_rate := get_progressive_commission_rate(v_total);
    
    UPDATE gp_wallets
    SET commission_rate = v_new_rate, updated_at = now()
    WHERE gp_id = NEW.gp_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_commission_rate
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gp_commission_rate();

-- 7. Enable realtime for wallet-related tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.konnekt_ledger;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests;

-- 8. Timestamp trigger for withdrawal_requests
CREATE TRIGGER update_withdrawal_requests_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
