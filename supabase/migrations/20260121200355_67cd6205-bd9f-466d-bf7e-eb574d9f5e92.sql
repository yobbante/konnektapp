-- Add RLS policy to allow public access to verified GP profiles via the public view
-- This enables anonymous users to view transporter profiles

-- First, create a policy for public SELECT access on gp_profiles for verified GPs
CREATE POLICY "Public can view verified GP profiles" 
ON public.gp_profiles 
FOR SELECT 
TO anon, authenticated
USING (status = 'verified'::gp_status);