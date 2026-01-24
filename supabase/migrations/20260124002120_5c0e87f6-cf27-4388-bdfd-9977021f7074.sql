-- Fix security issues: Convert SECURITY DEFINER views to SECURITY INVOKER

-- Drop and recreate gp_contact_release view with SECURITY INVOKER
DROP VIEW IF EXISTS public.gp_contact_release;
CREATE VIEW public.gp_contact_release 
WITH (security_invoker = true)
AS
SELECT 
  o.id AS order_id,
  o.client_id,
  o.gp_id,
  o.status AS order_status,
  o.payment_status,
  gp.business_name,
  gp.rating,
  gp.verified_at,
  gp.city,
  gp.country_code,
  gp.default_currency,
  gp.explicit_restrictions,
  -- Infos visibles APRÈS paiement uniquement
  CASE 
    WHEN o.payment_status = 'paid' OR o.status IN ('accepted', 'collected', 'in_transit', 'delivered')
    THEN gp.deposit_address 
    ELSE NULL 
  END AS deposit_address,
  CASE 
    WHEN o.payment_status = 'paid' OR o.status IN ('accepted', 'collected', 'in_transit', 'delivered')
    THEN COALESCE(gp.whatsapp_phone, gp.whatsapp, gp.phone)
    ELSE NULL 
  END AS whatsapp_number,
  -- Infos visibles APRÈS confirmation GP (livraison)
  CASE 
    WHEN o.status = 'delivered'
    THEN COALESCE(gp.reception_address, gp.deposit_address, gp.address)
    ELSE NULL 
  END AS reception_address,
  CASE 
    WHEN o.status = 'delivered'
    THEN gp.phone_secondary
    ELSE NULL 
  END AS phone_secondary
FROM public.orders o
JOIN public.gp_profiles gp ON o.gp_id = gp.id;

-- Drop and recreate public_gp_profiles view with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_gp_profiles CASCADE;
CREATE VIEW public.public_gp_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  business_name,
  gp_type,
  city,
  country_code,
  description,
  rating,
  total_deliveries,
  total_reviews,
  years_experience,
  fleet_size,
  zones_covered,
  international_destinations,
  verified_at,
  created_at,
  default_currency,
  explicit_restrictions
FROM public.gp_profiles
WHERE status = 'verified';

-- Fix overly permissive RLS policy for gp_response_tracking
DROP POLICY IF EXISTS "System can insert response tracking" ON public.gp_response_tracking;
CREATE POLICY "Orders can have response tracking inserted" ON public.gp_response_tracking
FOR INSERT WITH CHECK (
  -- Allow insert only for orders where user is client or GP
  order_id IN (SELECT id FROM orders WHERE client_id = auth.uid())
  OR gp_id IN (SELECT id FROM gp_profiles WHERE user_id = auth.uid())
  OR has_admin_access(auth.uid())
);