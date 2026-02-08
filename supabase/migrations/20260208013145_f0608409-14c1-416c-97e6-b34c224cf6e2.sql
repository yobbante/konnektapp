
-- Table for GP navette (route) change requests
CREATE TABLE public.gp_navette_change_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  old_origin_city TEXT NOT NULL,
  old_origin_country TEXT NOT NULL DEFAULT 'SN',
  old_destination_city TEXT NOT NULL,
  old_destination_country TEXT NOT NULL DEFAULT 'FR',
  new_origin_city TEXT NOT NULL,
  new_origin_country TEXT NOT NULL DEFAULT 'SN',
  new_destination_city TEXT NOT NULL,
  new_destination_country TEXT NOT NULL DEFAULT 'FR',
  justification TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gp_navette_change_requests ENABLE ROW LEVEL SECURITY;

-- GPs can view their own requests
CREATE POLICY "GPs can view their own navette requests"
ON public.gp_navette_change_requests
FOR SELECT
USING (gp_id IN (
  SELECT id FROM gp_profiles WHERE user_id = auth.uid()
));

-- GPs can create requests
CREATE POLICY "GPs can create navette change requests"
ON public.gp_navette_change_requests
FOR INSERT
WITH CHECK (gp_id IN (
  SELECT id FROM gp_profiles WHERE user_id = auth.uid()
));

-- Admins can manage all requests
CREATE POLICY "Admins can manage navette requests"
ON public.gp_navette_change_requests
FOR ALL
USING (has_admin_access(auth.uid()));

-- Add locked fields to gp_profiles for price and navette enforcement
ALTER TABLE public.gp_profiles 
  ADD COLUMN IF NOT EXISTS base_price_per_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS base_origin_city TEXT,
  ADD COLUMN IF NOT EXISTS base_origin_country TEXT,
  ADD COLUMN IF NOT EXISTS base_destination_city TEXT,
  ADD COLUMN IF NOT EXISTS base_destination_country TEXT,
  ADD COLUMN IF NOT EXISTS price_locked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS navette_locked_at TIMESTAMP WITH TIME ZONE;
