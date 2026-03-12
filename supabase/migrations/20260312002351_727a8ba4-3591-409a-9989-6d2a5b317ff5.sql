
-- Allow admins to view ALL mobility profiles (including pending)
CREATE POLICY "Admins can view all mobility profiles"
ON public.mobility_profiles
FOR SELECT
TO authenticated
USING (public.has_admin_access(auth.uid()));

-- Allow admins to update mobility profiles (verify/suspend)
CREATE POLICY "Admins can update mobility profiles"
ON public.mobility_profiles
FOR UPDATE
TO authenticated
USING (public.has_admin_access(auth.uid()));

-- Allow admins to view all mobility offers
CREATE POLICY "Admins can view all mobility offers"
ON public.mobility_offers
FOR SELECT
TO authenticated
USING (public.has_admin_access(auth.uid()));
