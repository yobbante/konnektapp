
-- Fix: Add a no-access policy on idempotency_keys (service role only)
CREATE POLICY "No direct access to idempotency_keys"
  ON public.idempotency_keys FOR SELECT
  USING (false);
