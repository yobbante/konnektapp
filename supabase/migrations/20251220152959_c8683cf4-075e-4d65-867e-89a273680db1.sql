-- Add admin RLS policies to enforce server-side authorization
-- These policies use the existing has_role() SECURITY DEFINER function

-- Allow admins to view all GP profiles
CREATE POLICY "Admins can view all GP profiles"
ON gp_profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update any GP profile (for status changes, verification, etc.)
CREATE POLICY "Admins can update GP profiles"
ON gp_profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all orders
CREATE POLICY "Admins can view all orders"
ON orders FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update any order (for dispute resolution, status changes, etc.)
CREATE POLICY "Admins can update orders"
ON orders FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));