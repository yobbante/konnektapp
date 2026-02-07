
-- =============================================
-- KONNEKT TRAVEL PASS (KTP) — DATABASE SCHEMA
-- =============================================

-- KTP Status table: stores pass status, snapshot metrics, and financial rules
CREATE TABLE public.ktp_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  ktp_level TEXT NOT NULL DEFAULT 'inactive' CHECK (ktp_level IN ('inactive', 'basic', 'verified', 'pro')),
  trust_score INTEGER NOT NULL DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 100),
  
  -- Trust Score breakdown (cached for display)
  scan_compliance_score INTEGER NOT NULL DEFAULT 0,     -- 40% weight
  delivery_punctuality_score INTEGER NOT NULL DEFAULT 0, -- 20% weight
  delivery_history_score INTEGER NOT NULL DEFAULT 0,     -- 20% weight
  client_satisfaction_score INTEGER NOT NULL DEFAULT 0,   -- 10% weight
  platform_discipline_score INTEGER NOT NULL DEFAULT 0,   -- 10% weight
  
  -- Financial effects
  commission_rate NUMERIC(4,2) NOT NULL DEFAULT 5.00,  -- %
  payment_release_rule TEXT NOT NULL DEFAULT 'after_delivery' 
    CHECK (payment_release_rule IN ('after_delivery', 'after_arrival', 'after_transit', 'instant')),
  insurance_coefficient NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  
  -- Suspension tracking
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT,
  
  -- Evaluation metadata
  total_scans INTEGER NOT NULL DEFAULT 0,
  total_expected_scans INTEGER NOT NULL DEFAULT 0,
  total_deliveries_evaluated INTEGER NOT NULL DEFAULT 0,
  total_on_time_deliveries INTEGER NOT NULL DEFAULT 0,
  
  last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(gp_id)
);

-- KTP history: logs every level change for audit
CREATE TABLE public.ktp_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  old_level TEXT NOT NULL,
  new_level TEXT NOT NULL,
  old_trust_score INTEGER NOT NULL DEFAULT 0,
  new_trust_score INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  triggered_by TEXT NOT NULL DEFAULT 'system' CHECK (triggered_by IN ('system', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ktp_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ktp_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for ktp_status
CREATE POLICY "GPs can view their own KTP status"
  ON public.ktp_status FOR SELECT
  USING (gp_id IN (SELECT id FROM gp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Public can view KTP level and trust score"
  ON public.ktp_status FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage all KTP statuses"
  ON public.ktp_status FOR ALL
  USING (has_admin_access(auth.uid()));

-- System insert policy (for auto-creation)
CREATE POLICY "System can insert KTP status"
  ON public.ktp_status FOR INSERT
  WITH CHECK (gp_id IN (SELECT id FROM gp_profiles WHERE user_id = auth.uid()) OR has_admin_access(auth.uid()));

CREATE POLICY "System can update KTP status"
  ON public.ktp_status FOR UPDATE
  USING (gp_id IN (SELECT id FROM gp_profiles WHERE user_id = auth.uid()) OR has_admin_access(auth.uid()));

-- RLS policies for ktp_history
CREATE POLICY "GPs can view their own KTP history"
  ON public.ktp_history FOR SELECT
  USING (gp_id IN (SELECT id FROM gp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all KTP history"
  ON public.ktp_history FOR ALL
  USING (has_admin_access(auth.uid()));

CREATE POLICY "System can insert KTP history"
  ON public.ktp_history FOR INSERT
  WITH CHECK (gp_id IN (SELECT id FROM gp_profiles WHERE user_id = auth.uid()) OR has_admin_access(auth.uid()));

-- Enable realtime for ktp_status (GP dashboard needs live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.ktp_status;

-- Function to auto-create KTP status when GP profile is created
CREATE OR REPLACE FUNCTION public.auto_create_ktp_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ktp_status (gp_id, ktp_level, trust_score)
  VALUES (NEW.id, 'basic', 50)
  ON CONFLICT (gp_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_create_ktp
  AFTER INSERT ON public.gp_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_ktp_status();

-- Function to calculate KTP level from trust score
CREATE OR REPLACE FUNCTION public.evaluate_ktp_level(p_trust_score INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_trust_score >= 90 THEN RETURN 'pro';
  ELSIF p_trust_score >= 75 THEN RETURN 'verified';
  ELSIF p_trust_score >= 0 THEN RETURN 'basic';
  ELSE RETURN 'inactive';
  END IF;
END;
$$;

-- Function to get commission rate from trust score
CREATE OR REPLACE FUNCTION public.get_ktp_commission_rate(p_trust_score INTEGER)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_trust_score >= 90 THEN RETURN 2.00;
  ELSIF p_trust_score >= 85 THEN RETURN 3.00;
  ELSIF p_trust_score >= 75 THEN RETURN 4.00;
  ELSE RETURN 5.00;
  END IF;
END;
$$;

-- Function to get payment release rule from trust score
CREATE OR REPLACE FUNCTION public.get_ktp_payment_rule(p_trust_score INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_trust_score >= 90 THEN RETURN 'instant';
  ELSIF p_trust_score >= 85 THEN RETURN 'after_transit';
  ELSIF p_trust_score >= 75 THEN RETURN 'after_arrival';
  ELSE RETURN 'after_delivery';
  END IF;
END;
$$;

-- Function to get insurance coefficient from trust score
CREATE OR REPLACE FUNCTION public.get_ktp_insurance_coefficient(p_trust_score INTEGER)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_trust_score >= 90 THEN RETURN 0.60;
  ELSIF p_trust_score >= 85 THEN RETURN 0.80;
  ELSIF p_trust_score >= 75 THEN RETURN 0.90;
  ELSE RETURN 1.00;
  END IF;
END;
$$;

-- Timestamp trigger
CREATE TRIGGER update_ktp_status_updated_at
  BEFORE UPDATE ON public.ktp_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
