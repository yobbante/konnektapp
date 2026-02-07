
-- ============================================
-- GP Geolocation Tracking System
-- Passive country detection for auto-status updates
-- ============================================

-- Table to store GP geolocation consent and tracking state
CREATE TABLE IF NOT EXISTS public.gp_geolocation_consent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_given_at TIMESTAMP WITH TIME ZONE,
  tracking_active BOOLEAN NOT NULL DEFAULT false,
  last_detected_country TEXT,
  last_detected_city TEXT,
  last_position_lat DOUBLE PRECISION,
  last_position_lng DOUBLE PRECISION,
  last_check_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(gp_id)
);

-- Table to log geolocation checks and auto-status triggers
CREATE TABLE IF NOT EXISTS public.gp_geolocation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  detected_country TEXT NOT NULL,
  detected_city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  action_triggered TEXT, -- 'status_in_transit', 'status_arrived', null (no action)
  orders_affected UUID[], -- orders that were auto-updated
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gp_geolocation_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gp_geolocation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gp_geolocation_consent
CREATE POLICY "GP can view own consent" ON public.gp_geolocation_consent
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "GP can insert own consent" ON public.gp_geolocation_consent
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "GP can update own consent" ON public.gp_geolocation_consent
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admin can view all consent" ON public.gp_geolocation_consent
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for gp_geolocation_logs
CREATE POLICY "GP can view own logs" ON public.gp_geolocation_logs
  FOR SELECT USING (
    gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "GP can insert own logs" ON public.gp_geolocation_logs
  FOR INSERT WITH CHECK (
    gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin can view all logs" ON public.gp_geolocation_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Updated at trigger
CREATE TRIGGER update_gp_geolocation_consent_updated_at
  BEFORE UPDATE ON public.gp_geolocation_consent
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
