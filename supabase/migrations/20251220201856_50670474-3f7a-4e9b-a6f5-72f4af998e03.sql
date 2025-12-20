-- Fix infinite recursion in user_roles RLS policies
-- The has_role function queries user_roles, but user_roles policies also call has_role = recursion

-- Drop the problematic policies on user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Create simple non-recursive policies for user_roles
-- Users can view their own roles (no recursion)
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Only service role can manage roles (no RLS policy needed, service role bypasses RLS)
-- For admin management, we'll create a secure function instead