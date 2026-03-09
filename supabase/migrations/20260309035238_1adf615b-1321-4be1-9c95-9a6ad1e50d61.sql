
-- Table for storing GP-specific routier pricing grids
CREATE TABLE IF NOT EXISTS public.routier_gp_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gp_id uuid NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  min_price numeric NOT NULL DEFAULT 0,
  price_per_km numeric NOT NULL DEFAULT 0,
  price_per_kg numeric NOT NULL DEFAULT 0,
  price_per_m3 numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'XOF',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(gp_id)
);

ALTER TABLE public.routier_gp_pricing ENABLE ROW LEVEL SECURITY;

-- GP can read/write their own pricing
CREATE POLICY "GP can read own pricing" ON public.routier_gp_pricing
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gp_profiles WHERE id = gp_id AND user_id = auth.uid()));

CREATE POLICY "GP can insert own pricing" ON public.routier_gp_pricing
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.gp_profiles WHERE id = gp_id AND user_id = auth.uid()));

CREATE POLICY "GP can update own pricing" ON public.routier_gp_pricing
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gp_profiles WHERE id = gp_id AND user_id = auth.uid()));

-- Admins full access
CREATE POLICY "Admins manage routier pricing" ON public.routier_gp_pricing
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));
