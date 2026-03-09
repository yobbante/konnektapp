-- Harden client_wallets with strict RLS (prevent self-crediting)
ALTER TABLE public.client_wallets ENABLE ROW LEVEL SECURITY;

-- Remove overly-permissive policies (if present)
DROP POLICY IF EXISTS "Users can view own client wallet" ON public.client_wallets;
DROP POLICY IF EXISTS "Users can update own client wallet" ON public.client_wallets;
DROP POLICY IF EXISTS "client_wallets_select_own" ON public.client_wallets;
DROP POLICY IF EXISTS "client_wallets_select_admin" ON public.client_wallets;
DROP POLICY IF EXISTS "client_wallets_block_insert" ON public.client_wallets;
DROP POLICY IF EXISTS "client_wallets_block_update" ON public.client_wallets;
DROP POLICY IF EXISTS "client_wallets_block_delete" ON public.client_wallets;

-- Allow users to view their own wallet
CREATE POLICY "client_wallets_select_own"
ON public.client_wallets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow admins/moderators to view all wallets
CREATE POLICY "client_wallets_select_admin"
ON public.client_wallets
FOR SELECT
TO authenticated
USING (public.has_admin_access(auth.uid()));

-- Block direct wallet creation (wallet rows are created by server/trigger)
CREATE POLICY "client_wallets_block_insert"
ON public.client_wallets
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Block direct balance edits from client
CREATE POLICY "client_wallets_block_update"
ON public.client_wallets
FOR UPDATE
TO authenticated
USING (false);

-- Block deletion
CREATE POLICY "client_wallets_block_delete"
ON public.client_wallets
FOR DELETE
TO authenticated
USING (false);
