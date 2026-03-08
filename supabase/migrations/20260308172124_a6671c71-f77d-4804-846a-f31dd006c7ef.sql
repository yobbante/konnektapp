
-- Table for multiple navettes per GP
CREATE TABLE public.gp_navettes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  origin_city TEXT NOT NULL,
  origin_country TEXT NOT NULL DEFAULT 'France',
  destination_city TEXT NOT NULL,
  destination_country TEXT NOT NULL DEFAULT 'Sénégal',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(gp_id, origin_city, origin_country, destination_city, destination_country)
);

-- Enable RLS
ALTER TABLE public.gp_navettes ENABLE ROW LEVEL SECURITY;

-- GP can manage their own navettes
CREATE POLICY "gp_navettes_select" ON public.gp_navettes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gp_profiles WHERE id = gp_id AND user_id = auth.uid()));

CREATE POLICY "gp_navettes_insert" ON public.gp_navettes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.gp_profiles WHERE id = gp_id AND user_id = auth.uid()));

CREATE POLICY "gp_navettes_update" ON public.gp_navettes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gp_profiles WHERE id = gp_id AND user_id = auth.uid()));

CREATE POLICY "gp_navettes_delete" ON public.gp_navettes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gp_profiles WHERE id = gp_id AND user_id = auth.uid()));

-- Public read for search matching
CREATE POLICY "gp_navettes_public_read" ON public.gp_navettes FOR SELECT TO anon
  USING (is_active = true);

-- Admin read all
CREATE POLICY "gp_navettes_admin_select" ON public.gp_navettes FOR SELECT TO authenticated
  USING (public.has_admin_access(auth.uid()));

-- Update navette change requests: add auto_approved flag
ALTER TABLE public.gp_navette_change_requests ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT false;

-- Function to get max navettes by subscription
CREATE OR REPLACE FUNCTION public.get_max_navettes(p_subscription text)
RETURNS integer
LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF p_subscription = 'pro' THEN RETURN 5;
  ELSIF p_subscription = 'premium' THEN RETURN 3;
  ELSE RETURN 1;
  END IF;
END;
$$;
