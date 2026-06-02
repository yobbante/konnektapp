-- Bridge Konnekt <-> Yobbante : tables miroir cote Konnekt
-- 1) transporteurs (carriers Yobbante)
CREATE TABLE IF NOT EXISTS public.transporteurs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telephone_1 TEXT,
  telephone_2 TEXT,
  prenom TEXT,
  nom TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transporteurs TO authenticated;
GRANT ALL ON public.transporteurs TO service_role;
ALTER TABLE public.transporteurs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transporteurs readable by authenticated"
  ON public.transporteurs FOR SELECT TO authenticated USING (true);

-- 2) dossiers (missions/colis Yobbante)
CREATE TABLE IF NOT EXISTS public.dossiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ref TEXT NOT NULL,
  assigned_transporteur_ref TEXT,
  ville TEXT,
  poids NUMERIC,
  status TEXT NOT NULL DEFAULT 'CREATED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dossiers TO authenticated;
GRANT ALL ON public.dossiers TO service_role;
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dossiers readable by authenticated"
  ON public.dossiers FOR SELECT TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_dossiers_assigned_ref ON public.dossiers (assigned_transporteur_ref);

-- 3) manual_departures (departs declares par bot WhatsApp)
CREATE TABLE IF NOT EXISTS public.manual_departures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gp_reference TEXT,
  gp_profile_id UUID,
  destination TEXT,
  date_depart TEXT,
  poids_kg NUMERIC,
  source TEXT NOT NULL DEFAULT 'whatsapp_926',
  sender_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_departures TO authenticated;
GRANT ALL ON public.manual_departures TO service_role;
ALTER TABLE public.manual_departures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manual departures readable by authenticated"
  ON public.manual_departures FOR SELECT TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_manual_departures_gp ON public.manual_departures (gp_profile_id);