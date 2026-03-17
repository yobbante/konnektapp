
-- GP Referral system: each GP gets a unique referral code
CREATE TABLE public.gp_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  total_referrals INTEGER DEFAULT 0,
  total_bonus_earned NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'XOF',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(gp_id)
);

-- Track individual referral conversions
CREATE TABLE public.gp_referral_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES public.gp_referrals(id) ON DELETE CASCADE,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id),
  client_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  bonus_amount NUMERIC DEFAULT 0,
  bonus_type TEXT DEFAULT 'commission_reduction',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Super GP levels gamification
CREATE TABLE public.gp_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE UNIQUE,
  current_level INTEGER DEFAULT 1,
  level_name TEXT DEFAULT 'Débutant',
  total_missions INTEGER DEFAULT 0,
  total_clients_referred INTEGER DEFAULT 0,
  xp_points INTEGER DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  next_level_threshold INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gp_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gp_referral_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gp_levels ENABLE ROW LEVEL SECURITY;

-- RLS: GP can read own referrals
CREATE POLICY "GP can view own referrals" ON public.gp_referrals
  FOR SELECT TO authenticated
  USING (gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "GP can insert own referrals" ON public.gp_referrals
  FOR INSERT TO authenticated
  WITH CHECK (gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "GP can view own conversions" ON public.gp_referral_conversions
  FOR SELECT TO authenticated
  USING (gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "GP can view own levels" ON public.gp_levels
  FOR SELECT TO authenticated
  USING (gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "GP can insert own levels" ON public.gp_levels
  FOR INSERT TO authenticated
  WITH CHECK (gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid()));

CREATE POLICY "GP can update own levels" ON public.gp_levels
  FOR UPDATE TO authenticated
  USING (gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid()));

-- Admin can view all
CREATE POLICY "Admin can view all referrals" ON public.gp_referrals
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admin can view all conversions" ON public.gp_referral_conversions
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admin can view all levels" ON public.gp_levels
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()));

-- Public can view levels (for public profiles)
CREATE POLICY "Public can view GP levels" ON public.gp_levels
  FOR SELECT TO anon
  USING (true);

-- Auto-create referral code and level on GP profile creation
CREATE OR REPLACE FUNCTION public.auto_create_gp_growth_records()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create referral record with unique code
  INSERT INTO public.gp_referrals (gp_id, referral_code)
  VALUES (NEW.id, 'KKT-' || UPPER(SUBSTRING(NEW.id::text, 1, 8)))
  ON CONFLICT (gp_id) DO NOTHING;
  
  -- Create level record
  INSERT INTO public.gp_levels (gp_id)
  VALUES (NEW.id)
  ON CONFLICT (gp_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_gp_growth
AFTER INSERT ON public.gp_profiles
FOR EACH ROW EXECUTE FUNCTION public.auto_create_gp_growth_records();

-- Function to update GP level based on deliveries
CREATE OR REPLACE FUNCTION public.update_gp_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deliveries INTEGER;
  v_level INTEGER;
  v_name TEXT;
  v_threshold INTEGER;
  v_badges TEXT[];
BEGIN
  v_deliveries := COALESCE(NEW.total_deliveries, 0);
  
  IF v_deliveries >= 500 THEN
    v_level := 5; v_name := 'Légende Konnekt'; v_threshold := 1000;
    v_badges := ARRAY['super_gp', 'ambassador', 'legend'];
  ELSIF v_deliveries >= 200 THEN
    v_level := 4; v_name := 'Ambassadeur'; v_threshold := 500;
    v_badges := ARRAY['super_gp', 'ambassador'];
  ELSIF v_deliveries >= 100 THEN
    v_level := 3; v_name := 'Super GP'; v_threshold := 200;
    v_badges := ARRAY['super_gp'];
  ELSIF v_deliveries >= 50 THEN
    v_level := 2; v_name := 'GP Confirmé'; v_threshold := 100;
    v_badges := ARRAY['confirmed'];
  ELSIF v_deliveries >= 10 THEN
    v_level := 1; v_name := 'GP Actif'; v_threshold := 50;
    v_badges := ARRAY['active'];
  ELSE
    v_level := 0; v_name := 'Débutant'; v_threshold := 10;
    v_badges := ARRAY[]::TEXT[];
  END IF;
  
  UPDATE public.gp_levels
  SET current_level = v_level,
      level_name = v_name,
      total_missions = v_deliveries,
      next_level_threshold = v_threshold,
      badges = v_badges,
      xp_points = v_deliveries * 10,
      updated_at = now()
  WHERE gp_id = NEW.id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_gp_level
AFTER UPDATE OF total_deliveries ON public.gp_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_gp_level();

-- Notify clients of urgent departures (within 48h)
CREATE OR REPLACE FUNCTION public.notify_urgent_departure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_hours_until NUMERIC;
  v_gp_name TEXT;
  saved_search RECORD;
BEGIN
  v_hours_until := EXTRACT(EPOCH FROM (NEW.departure_date::timestamptz - now())) / 3600;
  
  -- Only notify for departures within 48h
  IF v_hours_until > 0 AND v_hours_until <= 48 THEN
    SELECT business_name INTO v_gp_name FROM gp_profiles WHERE id = NEW.gp_id;
    
    -- Notify clients with matching saved searches
    FOR saved_search IN
      SELECT ss.user_id
      FROM saved_searches ss
      WHERE ss.notify_enabled = true
        AND (ss.origin_city IS NULL OR LOWER(ss.origin_city) = LOWER(NEW.origin_city))
        AND (ss.destination_city IS NULL OR LOWER(ss.destination_city) = LOWER(NEW.destination_city))
    LOOP
      INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
      VALUES (
        saved_search.user_id,
        'urgent_departure',
        '⚡ Départ imminent !',
        format('Un voyage %s → %s part dans moins de %sh. Réservez maintenant !', 
          NEW.origin_city, NEW.destination_city, FLOOR(v_hours_until)),
        NEW.id,
        'offer'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_urgent_departure
AFTER INSERT ON public.gp_offers
FOR EACH ROW EXECUTE FUNCTION public.notify_urgent_departure();
