-- Add explicit DENY policy for direct wallet insertion
-- Only the trigger (SECURITY DEFINER) can create wallets
CREATE POLICY "Block direct wallet insertion"
ON public.gp_wallets 
FOR INSERT
TO authenticated
WITH CHECK (false);