-- =====================================================
-- CORRECTION RÉCURSION INFINIE - gp_profiles
-- Le problème: les politiques de gp_wallets référencent gp_profiles
-- qui elle-même peut avoir des politiques circulaires
-- =====================================================

-- Supprimer les politiques problématiques sur gp_profiles
DROP POLICY IF EXISTS "GPs can view their own profile" ON public.gp_profiles;
DROP POLICY IF EXISTS "GPs can insert their own profile" ON public.gp_profiles;
DROP POLICY IF EXISTS "GPs can update their own profile" ON public.gp_profiles;
DROP POLICY IF EXISTS "Clients with active orders can see GP contact" ON public.gp_profiles;
DROP POLICY IF EXISTS "Admins can view all GP profiles" ON public.gp_profiles;
DROP POLICY IF EXISTS "Admins can update GP profiles" ON public.gp_profiles;

-- Recréer les politiques SANS récursion
-- SELECT: Un GP peut voir SON profil (simple, pas de sous-requête récursive)
CREATE POLICY "gp_profiles_select_own"
ON public.gp_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: Un GP peut créer SON profil
CREATE POLICY "gp_profiles_insert_own"
ON public.gp_profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: Un GP peut modifier SON profil
CREATE POLICY "gp_profiles_update_own"
ON public.gp_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admin SELECT: Utilise has_role (SECURITY DEFINER, donc pas de récursion)
CREATE POLICY "gp_profiles_admin_select"
ON public.gp_profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin UPDATE
CREATE POLICY "gp_profiles_admin_update"
ON public.gp_profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- CORRECTION gp_wallets - Éviter sous-requête vers gp_profiles
-- =====================================================

-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "gp_wallets_select_own" ON public.gp_wallets;
DROP POLICY IF EXISTS "gp_wallets_update_own" ON public.gp_wallets;
DROP POLICY IF EXISTS "gp_wallets_block_insert" ON public.gp_wallets;
DROP POLICY IF EXISTS "gp_wallets_block_delete" ON public.gp_wallets;
DROP POLICY IF EXISTS "gp_wallets_admin_select" ON public.gp_wallets;

-- Créer une fonction SECURITY DEFINER pour vérifier ownership du wallet
CREATE OR REPLACE FUNCTION public.owns_gp_wallet(wallet_gp_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gp_profiles
    WHERE id = wallet_gp_id AND user_id = auth.uid()
  )
$$;

-- SELECT: Utilise la fonction pour éviter récursion
CREATE POLICY "gp_wallets_select_own"
ON public.gp_wallets
FOR SELECT
TO authenticated
USING (public.owns_gp_wallet(gp_id));

-- UPDATE: Utilise la fonction
CREATE POLICY "gp_wallets_update_own"
ON public.gp_wallets
FOR UPDATE
TO authenticated
USING (public.owns_gp_wallet(gp_id))
WITH CHECK (public.owns_gp_wallet(gp_id));

-- INSERT: Bloqué (via trigger uniquement)
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
-- CORRECTION gp_offers - Éviter récursion
-- =====================================================

DROP POLICY IF EXISTS "GPs can manage their own offers" ON public.gp_offers;
DROP POLICY IF EXISTS "Anyone can view active offers" ON public.gp_offers;

-- Fonction pour vérifier ownership des offres
CREATE OR REPLACE FUNCTION public.owns_gp_offer(offer_gp_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gp_profiles
    WHERE id = offer_gp_id AND user_id = auth.uid()
  )
$$;

-- SELECT offres actives (public pour users authentifiés)
CREATE POLICY "gp_offers_select_active"
ON public.gp_offers
FOR SELECT
TO authenticated
USING (status = 'active');

-- SELECT propres offres
CREATE POLICY "gp_offers_select_own"
ON public.gp_offers
FOR SELECT
TO authenticated
USING (public.owns_gp_offer(gp_id));

-- INSERT propres offres
CREATE POLICY "gp_offers_insert_own"
ON public.gp_offers
FOR INSERT
TO authenticated
WITH CHECK (public.owns_gp_offer(gp_id));

-- UPDATE propres offres
CREATE POLICY "gp_offers_update_own"
ON public.gp_offers
FOR UPDATE
TO authenticated
USING (public.owns_gp_offer(gp_id))
WITH CHECK (public.owns_gp_offer(gp_id));

-- DELETE propres offres
CREATE POLICY "gp_offers_delete_own"
ON public.gp_offers
FOR DELETE
TO authenticated
USING (public.owns_gp_offer(gp_id));

-- =====================================================
-- CORRECTION orders - Éviter récursion
-- =====================================================

DROP POLICY IF EXISTS "Clients can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Clients can create orders" ON public.orders;
DROP POLICY IF EXISTS "GPs can view orders assigned to them" ON public.orders;
DROP POLICY IF EXISTS "GPs can update orders assigned to them" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;

-- Fonction pour vérifier si GP possède l'order
CREATE OR REPLACE FUNCTION public.is_order_gp(order_gp_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gp_profiles
    WHERE id = order_gp_id AND user_id = auth.uid()
  )
$$;

-- Clients SELECT leurs commandes
CREATE POLICY "orders_client_select"
ON public.orders
FOR SELECT
TO authenticated
USING (client_id = auth.uid());

-- Clients INSERT leurs commandes
CREATE POLICY "orders_client_insert"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (client_id = auth.uid());

-- GP SELECT commandes assignées
CREATE POLICY "orders_gp_select"
ON public.orders
FOR SELECT
TO authenticated
USING (public.is_order_gp(gp_id));

-- GP UPDATE commandes assignées
CREATE POLICY "orders_gp_update"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.is_order_gp(gp_id))
WITH CHECK (public.is_order_gp(gp_id));

-- Admin SELECT
CREATE POLICY "orders_admin_select"
ON public.orders
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin UPDATE
CREATE POLICY "orders_admin_update"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));