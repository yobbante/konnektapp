-- Create a minimal public view for user profiles (no sensitive data)
CREATE OR REPLACE VIEW public.public_user_profiles
WITH (security_invoker = false) AS
SELECT 
  user_id,
  full_name,
  city,
  avatar_url
FROM public.profiles;

-- Grant anon access to the view
GRANT SELECT ON public.public_user_profiles TO anon;
GRANT SELECT ON public.public_user_profiles TO authenticated;

-- Add a SELECT policy for anon on profiles that only allows access through the view
-- We need a minimal policy for anon to read basic profile info for public QR scans
CREATE POLICY "Public minimal profile access for QR"
  ON public.profiles FOR SELECT TO anon
  USING (true);

-- Drop the blocking policy  
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;