
-- Table for GP seasonal price adjustments (haute saison toggle)
-- GPs can toggle to a "haute saison" rate up to 3 times per year
CREATE TABLE public.gp_price_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  base_price_per_kg NUMERIC NOT NULL,
  haute_saison_price_per_kg NUMERIC NOT NULL,
  is_haute_saison BOOLEAN NOT NULL DEFAULT false,
  toggles_used_this_year INTEGER NOT NULL DEFAULT 0,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  last_toggled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(gp_id)
);

-- History of toggles for audit
CREATE TABLE public.gp_price_adjustment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'activate_haute_saison' or 'deactivate_haute_saison'
  old_price NUMERIC NOT NULL,
  new_price NUMERIC NOT NULL,
  toggles_remaining INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.gp_price_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gp_price_adjustment_history ENABLE ROW LEVEL SECURITY;

-- GP can read/update their own
CREATE POLICY "GP can read own adjustments" ON public.gp_price_adjustments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.gp_profiles WHERE id = gp_id AND user_id = auth.uid())
  );

CREATE POLICY "GP can insert own adjustments" ON public.gp_price_adjustments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.gp_profiles WHERE id = gp_id AND user_id = auth.uid())
  );

CREATE POLICY "GP can update own adjustments" ON public.gp_price_adjustments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.gp_profiles WHERE id = gp_id AND user_id = auth.uid())
  );

CREATE POLICY "GP can read own history" ON public.gp_price_adjustment_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.gp_profiles WHERE id = gp_id AND user_id = auth.uid())
  );

CREATE POLICY "GP can insert own history" ON public.gp_price_adjustment_history
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.gp_profiles WHERE id = gp_id AND user_id = auth.uid())
  );
