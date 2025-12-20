-- Fix GP sensitive data exposure by creating a secure public view
-- This restricts what data is visible to unauthenticated users

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view verified GPs" ON gp_profiles;

-- Create a view with only safe public fields (no contact info or documents)
CREATE OR REPLACE VIEW public.public_gp_profiles AS
SELECT 
  id,
  business_name,
  gp_type,
  city,
  country_code,
  description,
  zones_covered,
  international_destinations,
  rating,
  total_deliveries,
  total_reviews,
  years_experience,
  fleet_size,
  verified_at,
  created_at
FROM gp_profiles
WHERE status = 'verified';

-- Grant access to the view for anonymous and authenticated users
GRANT SELECT ON public.public_gp_profiles TO anon, authenticated;

-- Create policy for authenticated users with active orders to see GP contact details
CREATE POLICY "Clients with active orders can see GP contact" 
ON gp_profiles FOR SELECT
TO authenticated
USING (
  status = 'verified' AND (
    -- User is the GP owner
    auth.uid() = user_id
    OR
    -- User has an order with this GP
    id IN (SELECT gp_id FROM orders WHERE client_id = auth.uid())
  )
);

-- Block temp folder uploads to storage (defense in depth)
CREATE POLICY "Block temp folder uploads" 
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id != 'gp-documents' 
  OR (storage.foldername(name))[1] != 'temp'
);