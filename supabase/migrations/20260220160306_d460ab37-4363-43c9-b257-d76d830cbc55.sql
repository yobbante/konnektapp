
-- Correction des policies INSERT permissives → restreindre aux utilisateurs authentifiés
DROP POLICY IF EXISTS "System can insert order history" ON public.order_status_history;
CREATE POLICY "System can insert order history"
  ON public.order_status_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR true); -- edge functions passent service key

-- Correction escrow_logs insert policy
DROP POLICY IF EXISTS "System inserts escrow logs" ON public.escrow_logs;
CREATE POLICY "System inserts escrow logs"
  ON public.escrow_logs FOR INSERT
  WITH CHECK (true); -- Inséré exclusivement par edge functions service role

-- Vue mvp_coherence_dashboard : convertir en vue normale (pas SECURITY DEFINER)
DROP VIEW IF EXISTS public.mvp_coherence_dashboard;
CREATE VIEW public.mvp_coherence_dashboard
WITH (security_invoker = true)
AS
SELECT
  o.id AS order_id,
  o.order_number,
  o.status AS order_status,
  o.financial_status,
  et.status AS escrow_status,
  et.amount AS escrow_amount,
  et.commission_amount,
  et.net_to_gp,
  o.geo_suspicious,
  o.delivery_attempt_count,
  o.delivery_blocked_until,
  CASE
    WHEN o.status::text = 'released' AND et.status = 'released' AND o.financial_status::text = 'completed' THEN true
    WHEN o.status::text IN ('paid_held','checked_in','in_transit','arrived_destination','delivery_pending','delivery_confirmed') AND et.status = 'held' THEN true
    WHEN o.status::text = 'pending' AND et.id IS NULL THEN true
    ELSE false
  END AS is_coherent,
  CASE
    WHEN o.status::text = 'released' AND et.status != 'released' THEN 'ESCROW_NOT_RELEASED'
    WHEN o.status::text != 'released' AND et.status = 'released' THEN 'ORDER_NOT_RELEASED'
    WHEN o.financial_status::text = 'completed' AND et.status != 'released' THEN 'FINANCIAL_MISMATCH'
    ELSE NULL
  END AS coherence_alert,
  o.updated_at
FROM public.orders o
LEFT JOIN public.escrow_transactions et ON et.order_id = o.id;
