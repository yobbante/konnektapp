-- =====================================================
-- AUDIT SÉCURITÉ COMPLET - Yobbanté GP
-- Production-ready RLS policies
-- =====================================================

-- =====================================================
-- 1. TABLE gp_wallets - Portefeuilles GP
-- =====================================================

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "GPs can view their own wallet" ON public.gp_wallets;
DROP POLICY IF EXISTS "GPs can update their own wallet" ON public.gp_wallets;
DROP POLICY IF EXISTS "Block direct wallet insertion" ON public.gp_wallets;

-- SELECT: Un GP peut voir uniquement SON portefeuille
CREATE POLICY "gp_wallets_select_own"
ON public.gp_wallets
FOR SELECT
TO authenticated
USING (
  gp_id IN (
    SELECT id FROM public.gp_profiles 
    WHERE user_id = auth.uid()
  )
);

-- UPDATE: Un GP peut mettre à jour uniquement SON portefeuille (mais pas les montants directement)
-- Note: Les montants doivent être mis à jour via des triggers/fonctions backend
CREATE POLICY "gp_wallets_update_own"
ON public.gp_wallets
FOR UPDATE
TO authenticated
USING (
  gp_id IN (
    SELECT id FROM public.gp_profiles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  gp_id IN (
    SELECT id FROM public.gp_profiles 
    WHERE user_id = auth.uid()
  )
);

-- INSERT: Bloqué pour les utilisateurs - uniquement via trigger SECURITY DEFINER
CREATE POLICY "gp_wallets_block_insert"
ON public.gp_wallets
FOR INSERT
TO authenticated
WITH CHECK (false);

-- DELETE: Interdit
CREATE POLICY "gp_wallets_block_delete"
ON public.gp_wallets
FOR DELETE
TO authenticated
USING (false);

-- Admin SELECT
CREATE POLICY "gp_wallets_admin_select"
ON public.gp_wallets
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 2. TABLE transactions - Historique des transactions
-- =====================================================

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "GPs can view their own transactions" ON public.transactions;

-- SELECT: Un GP peut voir uniquement SES transactions
CREATE POLICY "transactions_select_own"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  wallet_id IN (
    SELECT gw.id FROM public.gp_wallets gw
    INNER JOIN public.gp_profiles gp ON gw.gp_id = gp.id
    WHERE gp.user_id = auth.uid()
  )
);

-- INSERT: Bloqué pour les utilisateurs - uniquement via fonctions backend
CREATE POLICY "transactions_block_insert"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (false);

-- UPDATE: Interdit - les transactions sont immuables
CREATE POLICY "transactions_block_update"
ON public.transactions
FOR UPDATE
TO authenticated
USING (false);

-- DELETE: Interdit
CREATE POLICY "transactions_block_delete"
ON public.transactions
FOR DELETE
TO authenticated
USING (false);

-- Admin SELECT
CREATE POLICY "transactions_admin_select"
ON public.transactions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 3. TABLE user_roles - Rôles utilisateurs
-- =====================================================

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- SELECT: Un utilisateur peut voir uniquement SES rôles
CREATE POLICY "user_roles_select_own"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: Uniquement les admins peuvent assigner des rôles
CREATE POLICY "user_roles_admin_insert"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- UPDATE: Uniquement les admins peuvent modifier des rôles
CREATE POLICY "user_roles_admin_update"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- DELETE: Uniquement les admins peuvent supprimer des rôles
CREATE POLICY "user_roles_admin_delete"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin SELECT all
CREATE POLICY "user_roles_admin_select"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 4. FONCTION SÉCURISÉE - Créer une transaction
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_transaction(
  p_wallet_id uuid,
  p_amount integer,
  p_type transaction_type,
  p_order_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_reference text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transaction_id uuid;
  v_gp_user_id uuid;
BEGIN
  -- Vérifier que le wallet appartient à l'utilisateur authentifié
  SELECT gp.user_id INTO v_gp_user_id
  FROM gp_wallets gw
  INNER JOIN gp_profiles gp ON gw.gp_id = gp.id
  WHERE gw.id = p_wallet_id;
  
  IF v_gp_user_id IS NULL OR v_gp_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: wallet does not belong to user';
  END IF;
  
  -- Créer la transaction
  INSERT INTO transactions (wallet_id, amount, type, order_id, description, reference)
  VALUES (p_wallet_id, p_amount, p_type, p_order_id, p_description, p_reference)
  RETURNING id INTO v_transaction_id;
  
  -- Mettre à jour le solde du wallet selon le type
  IF p_type IN ('order_payment', 'commission') THEN
    UPDATE gp_wallets 
    SET balance = balance + p_amount,
        total_earned = total_earned + p_amount,
        updated_at = now()
    WHERE id = p_wallet_id;
  ELSIF p_type = 'withdrawal' THEN
    UPDATE gp_wallets 
    SET balance = balance - p_amount,
        total_withdrawn = total_withdrawn + p_amount,
        updated_at = now()
    WHERE id = p_wallet_id;
  END IF;
  
  RETURN v_transaction_id;
END;
$$;

-- =====================================================
-- 5. FONCTION ADMIN - Créer transaction pour n'importe quel wallet
-- =====================================================

CREATE OR REPLACE FUNCTION public.admin_create_transaction(
  p_wallet_id uuid,
  p_amount integer,
  p_type transaction_type,
  p_order_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_reference text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transaction_id uuid;
BEGIN
  -- Vérifier que l'utilisateur est admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;
  
  -- Créer la transaction
  INSERT INTO transactions (wallet_id, amount, type, order_id, description, reference)
  VALUES (p_wallet_id, p_amount, p_type, p_order_id, p_description, p_reference)
  RETURNING id INTO v_transaction_id;
  
  -- Mettre à jour le solde du wallet selon le type
  IF p_type IN ('order_payment', 'commission') THEN
    UPDATE gp_wallets 
    SET balance = balance + p_amount,
        total_earned = total_earned + p_amount,
        updated_at = now()
    WHERE id = p_wallet_id;
  ELSIF p_type = 'withdrawal' THEN
    UPDATE gp_wallets 
    SET balance = balance - p_amount,
        total_withdrawn = total_withdrawn + p_amount,
        updated_at = now()
    WHERE id = p_wallet_id;
  END IF;
  
  RETURN v_transaction_id;
END;
$$;

-- =====================================================
-- 6. VÉRIFICATION - S'assurer que RLS est activé
-- =====================================================

ALTER TABLE public.gp_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;