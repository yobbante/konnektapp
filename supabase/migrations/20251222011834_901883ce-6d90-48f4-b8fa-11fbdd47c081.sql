
-- Enum pour les catégories de litiges
CREATE TYPE public.dispute_category AS ENUM (
  'delay_unjustified',
  'partial_loss',
  'total_loss',
  'deterioration',
  'non_conformity',
  'transporter_silence',
  'client_fault'
);

-- Enum pour les statuts de litiges
CREATE TYPE public.dispute_status AS ENUM (
  'open',
  'under_review',
  'awaiting_response',
  'provisional_decision',
  'closed'
);

-- Enum pour les types de sanctions
CREATE TYPE public.sanction_type AS ENUM (
  'warning',
  'financial_compensation',
  'full_refund',
  'temporary_suspension',
  'permanent_exclusion'
);

-- Enum pour les statuts de réputation transporteur
CREATE TYPE public.reputation_status AS ENUM (
  'verified',
  'under_observation',
  'suspended',
  'excluded'
);

-- Enum pour les rôles utilisateur étendus
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_extended') THEN
    CREATE TYPE public.user_role_extended AS ENUM (
      'super_admin',
      'moderator_arbitrage',
      'transporter_verified',
      'transporter_observation',
      'transporter_suspended',
      'client_standard',
      'client_premium'
    );
  END IF;
END $$;

-- Table principale des litiges
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_number TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  initiated_by UUID NOT NULL,
  initiated_by_type TEXT NOT NULL CHECK (initiated_by_type IN ('client', 'admin', 'system')),
  category dispute_category NOT NULL,
  description TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  status dispute_status NOT NULL DEFAULT 'open',
  assigned_moderator UUID,
  responsible_party TEXT CHECK (responsible_party IN ('client', 'transporter', 'platform', 'undetermined')),
  provisional_decision TEXT,
  final_decision TEXT,
  sanction_applied sanction_type,
  compensation_amount INTEGER DEFAULT 0,
  deadline_response TIMESTAMPTZ,
  deadline_resolution TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Historique des actions sur les litiges (audit trail)
CREATE TABLE public.dispute_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_status dispute_status,
  new_status dispute_status,
  actor_id UUID NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('client', 'transporter', 'moderator', 'admin', 'system')),
  notes TEXT,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des sanctions appliquées
CREATE TABLE public.sanctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID REFERENCES public.disputes(id) ON DELETE SET NULL,
  target_user_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('client', 'transporter')),
  sanction_type sanction_type NOT NULL,
  reason TEXT NOT NULL,
  applied_by UUID NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  is_permanent BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table de réputation des transporteurs
CREATE TABLE public.transporter_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE UNIQUE,
  internal_score INTEGER NOT NULL DEFAULT 100 CHECK (internal_score >= 0 AND internal_score <= 100),
  reputation_status reputation_status NOT NULL DEFAULT 'verified',
  total_disputes INTEGER DEFAULT 0,
  disputes_won INTEGER DEFAULT 0,
  disputes_lost INTEGER DEFAULT 0,
  total_warnings INTEGER DEFAULT 0,
  total_suspensions INTEGER DEFAULT 0,
  last_incident_at TIMESTAMPTZ,
  observation_reason TEXT,
  observation_started_at TIMESTAMPTZ,
  suspended_until TIMESTAMPTZ,
  excluded_at TIMESTAMPTZ,
  exclusion_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des incidents de réputation
CREATE TABLE public.reputation_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  dispute_id UUID REFERENCES public.disputes(id) ON DELETE SET NULL,
  incident_type TEXT NOT NULL,
  score_impact INTEGER NOT NULL DEFAULT 0,
  previous_score INTEGER NOT NULL,
  new_score INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sanctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transporter_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_incidents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for disputes
CREATE POLICY "Admins can manage all disputes"
ON public.disputes FOR ALL
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Clients can view their disputes"
ON public.disputes FOR SELECT
USING (
  order_id IN (
    SELECT id FROM public.orders WHERE client_id = auth.uid()
  )
);

CREATE POLICY "Clients can create disputes for their orders"
ON public.disputes FOR INSERT
WITH CHECK (
  initiated_by = auth.uid() AND
  order_id IN (
    SELECT id FROM public.orders WHERE client_id = auth.uid()
  )
);

CREATE POLICY "Transporters can view disputes on their orders"
ON public.disputes FOR SELECT
USING (
  order_id IN (
    SELECT id FROM public.orders WHERE gp_id IN (
      SELECT id FROM public.gp_profiles WHERE user_id = auth.uid()
    )
  )
);

-- RLS Policies for dispute_history
CREATE POLICY "Admins can manage dispute history"
ON public.dispute_history FOR ALL
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Participants can view dispute history"
ON public.dispute_history FOR SELECT
USING (
  dispute_id IN (
    SELECT d.id FROM public.disputes d
    JOIN public.orders o ON d.order_id = o.id
    WHERE o.client_id = auth.uid() OR o.gp_id IN (
      SELECT id FROM public.gp_profiles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Participants can add to dispute history"
ON public.dispute_history FOR INSERT
WITH CHECK (
  actor_id = auth.uid() AND
  dispute_id IN (
    SELECT d.id FROM public.disputes d
    JOIN public.orders o ON d.order_id = o.id
    WHERE o.client_id = auth.uid() OR o.gp_id IN (
      SELECT id FROM public.gp_profiles WHERE user_id = auth.uid()
    )
  )
);

-- RLS Policies for sanctions
CREATE POLICY "Admins can manage sanctions"
ON public.sanctions FOR ALL
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Users can view their own sanctions"
ON public.sanctions FOR SELECT
USING (target_user_id = auth.uid());

-- RLS Policies for transporter_reputation
CREATE POLICY "Admins can manage reputation"
ON public.transporter_reputation FOR ALL
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Transporters can view their own reputation"
ON public.transporter_reputation FOR SELECT
USING (
  gp_id IN (
    SELECT id FROM public.gp_profiles WHERE user_id = auth.uid()
  )
);

-- RLS Policies for reputation_incidents
CREATE POLICY "Admins can manage reputation incidents"
ON public.reputation_incidents FOR ALL
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Transporters can view their own incidents"
ON public.reputation_incidents FOR SELECT
USING (
  gp_id IN (
    SELECT id FROM public.gp_profiles WHERE user_id = auth.uid()
  )
);

-- Function to generate dispute number
CREATE OR REPLACE FUNCTION public.generate_dispute_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.dispute_number := 'DIS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(NEW.id::text, 1, 6));
  RETURN NEW;
END;
$$;

-- Trigger for dispute number
CREATE TRIGGER set_dispute_number
  BEFORE INSERT ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_dispute_number();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_dispute_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_disputes_timestamp
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_dispute_timestamp();

CREATE TRIGGER update_reputation_timestamp
  BEFORE UPDATE ON public.transporter_reputation
  FOR EACH ROW
  EXECUTE FUNCTION public.update_dispute_timestamp();

-- Function to create reputation record for new GPs
CREATE OR REPLACE FUNCTION public.create_gp_reputation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.transporter_reputation (gp_id)
  VALUES (NEW.id)
  ON CONFLICT (gp_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to auto-create reputation for new GPs
CREATE TRIGGER create_reputation_for_gp
  AFTER INSERT ON public.gp_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_gp_reputation();

-- Function to log dispute status changes
CREATE OR REPLACE FUNCTION public.log_dispute_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.dispute_history (
      dispute_id,
      action,
      old_status,
      new_status,
      actor_id,
      actor_type,
      notes
    ) VALUES (
      NEW.id,
      'status_change',
      OLD.status,
      NEW.status,
      auth.uid(),
      'system',
      'Status changed from ' || OLD.status || ' to ' || NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for dispute status logging
CREATE TRIGGER log_dispute_changes
  AFTER UPDATE ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.log_dispute_status_change();

-- Function to update transporter reputation on dispute resolution
CREATE OR REPLACE FUNCTION public.update_reputation_on_dispute()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gp_id UUID;
  v_score_impact INTEGER;
  v_current_score INTEGER;
  v_new_score INTEGER;
BEGIN
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    -- Get the transporter ID from the order
    SELECT o.gp_id INTO v_gp_id
    FROM public.orders o
    WHERE o.id = NEW.order_id;
    
    IF v_gp_id IS NOT NULL AND NEW.responsible_party = 'transporter' THEN
      -- Calculate score impact based on sanction
      v_score_impact := CASE NEW.sanction_applied
        WHEN 'warning' THEN -5
        WHEN 'financial_compensation' THEN -10
        WHEN 'full_refund' THEN -15
        WHEN 'temporary_suspension' THEN -25
        WHEN 'permanent_exclusion' THEN -100
        ELSE 0
      END;
      
      -- Get current score
      SELECT internal_score INTO v_current_score
      FROM public.transporter_reputation
      WHERE gp_id = v_gp_id;
      
      v_new_score := GREATEST(0, COALESCE(v_current_score, 100) + v_score_impact);
      
      -- Update reputation
      UPDATE public.transporter_reputation
      SET 
        internal_score = v_new_score,
        total_disputes = total_disputes + 1,
        disputes_lost = disputes_lost + 1,
        last_incident_at = NOW(),
        reputation_status = CASE
          WHEN v_new_score <= 0 THEN 'excluded'
          WHEN v_new_score < 40 THEN 'suspended'
          WHEN v_new_score < 70 THEN 'under_observation'
          ELSE reputation_status
        END,
        total_warnings = total_warnings + CASE WHEN NEW.sanction_applied = 'warning' THEN 1 ELSE 0 END,
        total_suspensions = total_suspensions + CASE WHEN NEW.sanction_applied = 'temporary_suspension' THEN 1 ELSE 0 END
      WHERE gp_id = v_gp_id;
      
      -- Log the incident
      INSERT INTO public.reputation_incidents (
        gp_id,
        dispute_id,
        incident_type,
        score_impact,
        previous_score,
        new_score,
        description
      ) VALUES (
        v_gp_id,
        NEW.id,
        NEW.category::text,
        v_score_impact,
        COALESCE(v_current_score, 100),
        v_new_score,
        'Dispute resolved against transporter: ' || NEW.final_decision
      );
    ELSIF v_gp_id IS NOT NULL AND NEW.responsible_party != 'transporter' THEN
      -- Transporter won the dispute
      UPDATE public.transporter_reputation
      SET 
        total_disputes = total_disputes + 1,
        disputes_won = disputes_won + 1
      WHERE gp_id = v_gp_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for reputation update
CREATE TRIGGER update_reputation_on_dispute_close
  AFTER UPDATE ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reputation_on_dispute();

-- Create indexes for performance
CREATE INDEX idx_disputes_order_id ON public.disputes(order_id);
CREATE INDEX idx_disputes_status ON public.disputes(status);
CREATE INDEX idx_disputes_category ON public.disputes(category);
CREATE INDEX idx_disputes_initiated_by ON public.disputes(initiated_by);
CREATE INDEX idx_dispute_history_dispute_id ON public.dispute_history(dispute_id);
CREATE INDEX idx_sanctions_target_user ON public.sanctions(target_user_id);
CREATE INDEX idx_sanctions_active ON public.sanctions(is_active);
CREATE INDEX idx_reputation_gp_id ON public.transporter_reputation(gp_id);
CREATE INDEX idx_reputation_status ON public.transporter_reputation(reputation_status);
CREATE INDEX idx_reputation_incidents_gp ON public.reputation_incidents(gp_id);

-- Create existing GP reputation records
INSERT INTO public.transporter_reputation (gp_id)
SELECT id FROM public.gp_profiles
ON CONFLICT (gp_id) DO NOTHING;
