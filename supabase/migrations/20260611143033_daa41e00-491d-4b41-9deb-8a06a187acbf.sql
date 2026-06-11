-- 1) escrow_logs: financial audit log must not accept public inserts.
-- All writes happen in edge functions via service_role (bypasses RLS), so dropping the public insert policy is safe.
DROP POLICY IF EXISTS "System inserts escrow logs" ON public.escrow_logs;

-- 2) order_status_history: remove the always-true public insert policies that allow
-- unauthenticated forging, and replace with an authenticated-participant-scoped insert.
DROP POLICY IF EXISTS "System can insert order history" ON public.order_status_history;
DROP POLICY IF EXISTS "System can insert status history" ON public.order_status_history;

CREATE POLICY "Participants can insert status history"
ON public.order_status_history
FOR INSERT
TO authenticated
WITH CHECK (
  order_id IN (
    SELECT o.id FROM public.orders o
    WHERE o.client_id = auth.uid()
       OR o.gp_id IN (SELECT gp.id FROM public.gp_profiles gp WHERE gp.user_id = auth.uid())
  )
  OR has_admin_access(auth.uid())
);

-- 3) gp_price_history: remove the anonymous insert branch.
DROP POLICY IF EXISTS "GPs can insert their price history" ON public.gp_price_history;

CREATE POLICY "GPs can insert their price history"
ON public.gp_price_history
FOR INSERT
TO authenticated
WITH CHECK (
  gp_id IN (SELECT gp_profiles.id FROM public.gp_profiles WHERE gp_profiles.user_id = auth.uid())
);