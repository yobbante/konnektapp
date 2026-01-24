-- ============================================
-- MVP GP VIA BAGAGES - SCHEMA COMPLET
-- ============================================

-- 1. EXTENSION gp_profiles avec champs obligatoires V1
ALTER TABLE public.gp_profiles 
ADD COLUMN IF NOT EXISTS deposit_address TEXT, -- Adresse 1 (dépôt)
ADD COLUMN IF NOT EXISTS reception_address TEXT, -- Adresse 2 (réception)
ADD COLUMN IF NOT EXISTS phone_secondary TEXT, -- Téléphone 2
ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT, -- WhatsApp (1 ou 2)
ADD COLUMN IF NOT EXISTS max_response_delay_hours INTEGER DEFAULT 24, -- Délai max réponse
ADD COLUMN IF NOT EXISTS auto_accept_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS consecutive_no_responses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_warning_at TIMESTAMP WITH TIME ZONE;

-- 2. TABLE paliers de poids pour tarification au kilo
CREATE TABLE IF NOT EXISTS public.gp_weight_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  min_weight NUMERIC NOT NULL,
  max_weight NUMERIC NOT NULL,
  price_per_kg NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(gp_id, min_weight, max_weight)
);

-- Enable RLS
ALTER TABLE public.gp_weight_tiers ENABLE ROW LEVEL SECURITY;

-- Policies for weight tiers
CREATE POLICY "Anyone can view active weight tiers" ON public.gp_weight_tiers
FOR SELECT USING (is_active = true);

CREATE POLICY "GPs can manage their own weight tiers" ON public.gp_weight_tiers
FOR ALL USING (
  EXISTS (SELECT 1 FROM gp_profiles gp WHERE gp.id = gp_weight_tiers.gp_id AND gp.user_id = auth.uid())
);

-- 3. TABLE assurance interne Yobbanté (administrable)
CREATE TABLE IF NOT EXISTS public.insurance_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL UNIQUE, -- alimentaire, vetements, documents, telephone, ordinateur, autres
  label TEXT NOT NULL,
  max_declared_value INTEGER NOT NULL,
  insurance_fee INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.insurance_tiers ENABLE ROW LEVEL SECURITY;

-- Policies for insurance tiers
CREATE POLICY "Anyone can view active insurance tiers" ON public.insurance_tiers
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage insurance tiers" ON public.insurance_tiers
FOR ALL USING (has_admin_access(auth.uid()));

-- Insert default insurance tiers (from PRD)
INSERT INTO public.insurance_tiers (category, label, max_declared_value, insurance_fee, sort_order) VALUES
  ('alimentaire', 'Alimentaire / Vêtements', 50000, 1000, 1),
  ('vetements', 'Vêtements / Tissus', 50000, 1000, 2),
  ('documents', 'Documents administratifs', 100000, 2000, 3),
  ('telephone', 'Téléphone', 300000, 5000, 4),
  ('ordinateur', 'Ordinateur', 600000, 10000, 5),
  ('autres', 'Autres articles', 200000, 3000, 6)
ON CONFLICT (category) DO NOTHING;

-- 4. TABLE templates de messages prédéfinis
CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('gp', 'client', 'both')),
  category TEXT NOT NULL, -- status_update, question, info, issue
  template_key TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Policies for message templates
CREATE POLICY "Anyone can view active message templates" ON public.message_templates
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage message templates" ON public.message_templates
FOR ALL USING (has_admin_access(auth.uid()));

-- Insert default message templates
INSERT INTO public.message_templates (sender_type, category, template_key, content, icon, sort_order) VALUES
  -- GP templates
  ('gp', 'status_update', 'colis_recu', 'Colis reçu et conforme. Merci !', 'check-circle', 1),
  ('gp', 'status_update', 'colis_non_conforme', 'Attention : écart constaté (poids/quantité). Un ajustement sera appliqué.', 'alert-triangle', 2),
  ('gp', 'status_update', 'en_route', 'Votre colis est en route vers la destination.', 'truck', 3),
  ('gp', 'status_update', 'arrive_destination', 'Colis arrivé à destination. Prêt pour récupération.', 'map-pin', 4),
  ('gp', 'status_update', 'livre', 'Colis livré avec succès. Merci de votre confiance !', 'package-check', 5),
  ('gp', 'question', 'besoin_info', 'J''ai besoin d''informations complémentaires sur votre colis.', 'help-circle', 6),
  ('gp', 'issue', 'retard_prevu', 'Un léger retard est prévu. Nouvelle date estimée communiquée bientôt.', 'clock', 7),
  -- Client templates
  ('client', 'question', 'ou_deposer', 'Où puis-je déposer mon colis ?', 'map-pin', 1),
  ('client', 'question', 'date_depart', 'Quelle est votre prochaine date de départ ?', 'calendar', 2),
  ('client', 'question', 'suivi_colis', 'Pouvez-vous me donner des nouvelles de mon colis ?', 'search', 3),
  ('client', 'info', 'merci', 'Merci pour votre service !', 'heart', 4),
  ('client', 'issue', 'probleme_colis', 'J''ai un souci concernant mon colis.', 'alert-circle', 5)
ON CONFLICT (template_key) DO NOTHING;

-- 5. Extension orders avec champs détaillés
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS content_nature TEXT[], -- alimentaire, vetements, tissus, autres
ADD COLUMN IF NOT EXISTS content_nature_other TEXT, -- détail si "autres"
ADD COLUMN IF NOT EXISTS weight_tier_applied TEXT, -- palier appliqué
ADD COLUMN IF NOT EXISTS flat_rate_items JSONB DEFAULT '[]'::jsonb, -- articles forfaitaires
ADD COLUMN IF NOT EXISTS insurance_tier_id UUID REFERENCES public.insurance_tiers(id),
ADD COLUMN IF NOT EXISTS gp_response_deadline TIMESTAMP WITH TIME ZONE, -- deadline réponse GP
ADD COLUMN IF NOT EXISTS client_disclaimer_accepted_at TIMESTAMP WITH TIME ZONE;

-- 6. TABLE pour suivre les délais de réponse GP
CREATE TABLE IF NOT EXISTS public.gp_response_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  deadline_at TIMESTAMP WITH TIME ZONE NOT NULL,
  responded_at TIMESTAMP WITH TIME ZONE,
  auto_cancelled_at TIMESTAMP WITH TIME ZONE,
  warning_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gp_response_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their response tracking" ON public.gp_response_tracking
FOR SELECT USING (
  order_id IN (SELECT id FROM orders WHERE client_id = auth.uid())
  OR gp_id IN (SELECT id FROM gp_profiles WHERE user_id = auth.uid())
  OR has_admin_access(auth.uid())
);

CREATE POLICY "System can insert response tracking" ON public.gp_response_tracking
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage response tracking" ON public.gp_response_tracking
FOR ALL USING (has_admin_access(auth.uid()));

-- 7. Fonction pour créer les paliers de poids par défaut
CREATE OR REPLACE FUNCTION public.create_default_weight_tiers(p_gp_id UUID, p_currency TEXT DEFAULT 'XOF')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.gp_weight_tiers (gp_id, min_weight, max_weight, price_per_kg, currency) VALUES
    (p_gp_id, 0, 1, 0, p_currency),
    (p_gp_id, 1, 5, 0, p_currency),
    (p_gp_id, 5, 10, 0, p_currency),
    (p_gp_id, 10, 15, 0, p_currency),
    (p_gp_id, 15, 20, 0, p_currency)
  ON CONFLICT (gp_id, min_weight, max_weight) DO NOTHING;
END;
$$;

-- 8. Vue pour release progressive des infos GP
CREATE OR REPLACE VIEW public.gp_contact_release AS
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

-- 9. Mettre à jour la vue publique GP
DROP VIEW IF EXISTS public.public_gp_profiles;
CREATE VIEW public.public_gp_profiles AS
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

-- 10. Trigger pour auto-annulation après délai
CREATE OR REPLACE FUNCTION public.check_gp_response_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deadline TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculer deadline (24h par défaut)
  v_deadline := NEW.created_at + INTERVAL '24 hours';
  NEW.gp_response_deadline := v_deadline;
  
  -- Créer tracking record
  INSERT INTO public.gp_response_tracking (order_id, gp_id, deadline_at)
  SELECT NEW.id, NEW.gp_id, v_deadline
  WHERE NEW.status = 'pending';
  
  RETURN NEW;
END;
$$;

-- Appliquer trigger sur nouvelles commandes
DROP TRIGGER IF EXISTS set_gp_response_deadline ON public.orders;
CREATE TRIGGER set_gp_response_deadline
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.check_gp_response_deadline();

-- 11. Trigger pour tracker réponse GP
CREATE OR REPLACE FUNCTION public.track_gp_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si le GP accepte ou refuse, enregistrer la réponse
  IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'cancelled') THEN
    UPDATE public.gp_response_tracking
    SET responded_at = now()
    WHERE order_id = NEW.id AND responded_at IS NULL;
    
    -- Reset compteur de non-réponses si répondu
    IF NEW.status = 'accepted' THEN
      UPDATE public.gp_profiles
      SET consecutive_no_responses = 0
      WHERE id = NEW.gp_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS track_gp_order_response ON public.orders;
CREATE TRIGGER track_gp_order_response
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.track_gp_response();