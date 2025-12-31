-- Create a helper function to check if a GP is verified
CREATE OR REPLACE FUNCTION public.is_gp_verified(gp_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.gp_profiles
    WHERE id = gp_id
      AND status = 'verified'
  )
$$;

-- Drop existing policies for gp_offers that allow insert/update
DROP POLICY IF EXISTS "GPs can create own offers" ON public.gp_offers;
DROP POLICY IF EXISTS "GPs can update own offers" ON public.gp_offers;

-- Create new policies that require verified status
CREATE POLICY "Verified GPs can create offers"
ON public.gp_offers
FOR INSERT
TO authenticated
WITH CHECK (
  public.owns_gp_offer(gp_id) 
  AND public.is_gp_verified(gp_id)
);

CREATE POLICY "Verified GPs can update own offers"
ON public.gp_offers
FOR UPDATE
TO authenticated
USING (public.owns_gp_offer(gp_id))
WITH CHECK (
  public.owns_gp_offer(gp_id) 
  AND public.is_gp_verified(gp_id)
);

-- Also restrict custom_request_responses to verified GPs only
DROP POLICY IF EXISTS "GPs can respond to custom requests" ON public.custom_request_responses;
DROP POLICY IF EXISTS "GPs can insert responses" ON public.custom_request_responses;

CREATE POLICY "Verified GPs can respond to custom requests"
ON public.custom_request_responses
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gp_profiles
    WHERE id = gp_id 
      AND user_id = auth.uid()
      AND status = 'verified'
  )
);

-- Allow GPs to view their own responses
DROP POLICY IF EXISTS "GPs can view their responses" ON public.custom_request_responses;
CREATE POLICY "GPs can view their responses"
ON public.custom_request_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gp_profiles
    WHERE id = gp_id AND user_id = auth.uid()
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.custom_requests
    WHERE id = request_id AND client_id = auth.uid()
  )
);