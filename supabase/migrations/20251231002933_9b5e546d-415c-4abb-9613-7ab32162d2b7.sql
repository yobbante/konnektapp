-- Allow public (unauthenticated) access to active offers from verified GPs
CREATE POLICY "Public can view active offers from verified GPs"
ON public.gp_offers
FOR SELECT
TO anon
USING (
  status = 'active'
  AND public.is_gp_verified(gp_id)
);

-- Update the authenticated policy to also check for verified GPs
DROP POLICY IF EXISTS "gp_offers_select_active" ON public.gp_offers;
CREATE POLICY "Authenticated can view active offers from verified GPs"
ON public.gp_offers
FOR SELECT
TO authenticated
USING (
  (status = 'active' AND public.is_gp_verified(gp_id))
  OR owns_gp_offer(gp_id)
);

-- Also allow public access to public_gp_profiles view for anonymous users
-- (the view should already be accessible, but let's ensure the underlying gp_profiles has a SELECT policy for it)