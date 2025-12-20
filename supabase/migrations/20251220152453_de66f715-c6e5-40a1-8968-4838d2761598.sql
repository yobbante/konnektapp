-- Fix security definer view issue by recreating as SECURITY INVOKER
DROP VIEW IF EXISTS public.public_gp_profiles;

CREATE VIEW public.public_gp_profiles 
WITH (security_invoker = true) AS
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

-- Re-grant access to the view
GRANT SELECT ON public.public_gp_profiles TO anon, authenticated;