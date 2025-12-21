-- =====================================================
-- SUPPORT MODERATOR ROLE
-- Créer une fonction has_admin_access pour vérifier admin OU moderator
-- =====================================================

-- Fonction pour vérifier si l'utilisateur a accès admin (admin ou moderator)
CREATE OR REPLACE FUNCTION public.has_admin_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'moderator')
  )
$$;

-- Mettre à jour les politiques admin pour inclure moderators

-- gp_profiles admin policies
DROP POLICY IF EXISTS "gp_profiles_admin_select" ON public.gp_profiles;
DROP POLICY IF EXISTS "gp_profiles_admin_update" ON public.gp_profiles;

CREATE POLICY "gp_profiles_admin_select"
ON public.gp_profiles
FOR SELECT
TO authenticated
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "gp_profiles_admin_update"
ON public.gp_profiles
FOR UPDATE
TO authenticated
USING (public.has_admin_access(auth.uid()))
WITH CHECK (public.has_admin_access(auth.uid()));

-- orders admin policies
DROP POLICY IF EXISTS "orders_admin_select" ON public.orders;
DROP POLICY IF EXISTS "orders_admin_update" ON public.orders;

CREATE POLICY "orders_admin_select"
ON public.orders
FOR SELECT
TO authenticated
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "orders_admin_update"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.has_admin_access(auth.uid()))
WITH CHECK (public.has_admin_access(auth.uid()));

-- gp_wallets admin policy
DROP POLICY IF EXISTS "gp_wallets_admin_select" ON public.gp_wallets;

CREATE POLICY "gp_wallets_admin_select"
ON public.gp_wallets
FOR SELECT
TO authenticated
USING (public.has_admin_access(auth.uid()));

-- transactions admin policy
DROP POLICY IF EXISTS "transactions_admin_select" ON public.transactions;

CREATE POLICY "transactions_admin_select"
ON public.transactions
FOR SELECT
TO authenticated
USING (public.has_admin_access(auth.uid()));

-- user_roles admin policies (inchangées car elles utilisent has_role admin strict)
-- Les moderators ne peuvent PAS modifier les rôles, seuls les admins

-- Ajouter la valeur 'moderator' à l'enum si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'moderator' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'moderator';
  END IF;
END$$;