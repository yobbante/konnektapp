
-- 1. Financial status enum for orders
CREATE TYPE public.financial_status AS ENUM (
  'pending_payment',
  'escrow_locked',
  'adjustment_required',
  'adjustment_paid',
  'completed',
  'cancelled',
  'refunded'
);

-- 2. Add financial_status to orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS financial_status public.financial_status DEFAULT 'pending_payment',
  ADD COLUMN IF NOT EXISTS commission_amount integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adjustment_amount integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_amount integer DEFAULT 0;

-- 3. Add debt_balance to gp_wallets
ALTER TABLE public.gp_wallets
  ADD COLUMN IF NOT EXISTS debt_balance integer NOT NULL DEFAULT 0;

-- 4. Client wallets table
CREATE TABLE IF NOT EXISTS public.client_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  available_balance integer NOT NULL DEFAULT 0,
  escrow_balance integer NOT NULL DEFAULT 0,
  credit_bonus integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'XOF',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client wallet"
  ON public.client_wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own client wallet"
  ON public.client_wallets FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-create client wallet on profile creation
CREATE OR REPLACE FUNCTION public.create_client_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.client_wallets (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_client_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_client_wallet();

-- 5. Konnekt platform wallet (singleton)
CREATE TABLE IF NOT EXISTS public.platform_wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_commission integer NOT NULL DEFAULT 0,
  total_escrow_held integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'XOF',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_wallet ENABLE ROW LEVEL SECURITY;

-- Only admins can view platform wallet
CREATE POLICY "Admins can view platform wallet"
  ON public.platform_wallet FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed the singleton platform wallet
INSERT INTO public.platform_wallet (id) VALUES (gen_random_uuid());

-- 6. Idempotency keys table for payment safety
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key text PRIMARY KEY,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
-- No direct user access, only edge functions via service role

-- 7. Make konnekt_ledger truly immutable: deny UPDATE and DELETE
CREATE POLICY "Ledger is append-only no update"
  ON public.konnekt_ledger FOR UPDATE
  USING (false);

CREATE POLICY "Ledger is append-only no delete"
  ON public.konnekt_ledger FOR DELETE
  USING (false);
