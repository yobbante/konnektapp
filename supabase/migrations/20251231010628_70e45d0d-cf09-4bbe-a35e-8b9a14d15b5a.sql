-- Drop existing INSERT policy for gp_offers to allow non-verified transporters to create offers
DROP POLICY IF EXISTS "gp_offers_insert_verified_only" ON public.gp_offers;

-- Allow any authenticated user with a GP profile to create offers
-- But the SELECT policies will filter out offers from non-verified transporters
CREATE POLICY "gp_offers_insert_gp_owner" ON public.gp_offers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gp_profiles
      WHERE gp_profiles.id = gp_id
      AND gp_profiles.user_id = auth.uid()
    )
  );

-- Ensure the SELECT policy for anon only shows offers from verified transporters
-- (This should already exist but let's make sure)
DROP POLICY IF EXISTS "gp_offers_public_select_active" ON public.gp_offers;

CREATE POLICY "gp_offers_public_select_active" ON public.gp_offers
  FOR SELECT
  USING (
    status = 'active'
    AND public.is_gp_verified(gp_id) = true
  );

-- Update authenticated SELECT policy
DROP POLICY IF EXISTS "gp_offers_auth_select" ON public.gp_offers;

CREATE POLICY "gp_offers_auth_select" ON public.gp_offers
  FOR SELECT
  USING (
    -- GP can see their own offers (all statuses)
    EXISTS (
      SELECT 1 FROM gp_profiles
      WHERE gp_profiles.id = gp_id
      AND gp_profiles.user_id = auth.uid()
    )
    OR
    -- Others can only see active offers from verified GPs
    (
      status = 'active'
      AND public.is_gp_verified(gp_id) = true
    )
  );