-- Fix: recreate view with security_invoker=on
DROP VIEW IF EXISTS public.public_user_profiles;

CREATE VIEW public.public_user_profiles
WITH (security_invoker = on) AS
SELECT 
  user_id,
  full_name,
  city,
  avatar_url
FROM public.profiles;

GRANT SELECT ON public.public_user_profiles TO anon;
GRANT SELECT ON public.public_user_profiles TO authenticated;