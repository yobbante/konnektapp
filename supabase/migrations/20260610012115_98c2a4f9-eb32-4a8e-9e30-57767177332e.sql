-- Beta GP dashboard (no-auth, accessed by direct URL /gp/[ref_gp])
-- Source table = public.transporteurs (referred to as "gp_transporteurs").

-- 1) New beta columns on transporteurs
ALTER TABLE public.transporteurs
  ADD COLUMN IF NOT EXISTS residence_city text,
  ADD COLUMN IF NOT EXISTS beta_wizard_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS beta_tarif_defaut integer,
  ADD COLUMN IF NOT EXISTS beta_notes_conditions text,
  ADD COLUMN IF NOT EXISTS beta_migrated_at timestamptz;

-- 2) New columns on manual_departures for richer beta departures
ALTER TABLE public.manual_departures
  ADD COLUMN IF NOT EXISTS ville_depart text,
  ADD COLUMN IF NOT EXISTS ville_arrivee text,
  ADD COLUMN IF NOT EXISTS capacite_kg numeric,
  ADD COLUMN IF NOT EXISTS tarif_par_kg integer,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'XOF';

-- 3) Missions link on shipments
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS assigned_gp text,
  ADD COLUMN IF NOT EXISTS client_prenom text,
  ADD COLUMN IF NOT EXISTS poids_reel numeric,
  ADD COLUMN IF NOT EXISTS tracking_id text;

-- 4) GRANTs for anon (beta has no auth)
GRANT SELECT, UPDATE ON public.transporteurs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_departures TO anon;
GRANT SELECT ON public.shipments TO anon;

-- 5) RLS policies for anon access (prototype: open beta access by direct link)
DROP POLICY IF EXISTS "Beta anon can update transporteurs" ON public.transporteurs;
CREATE POLICY "Beta anon can update transporteurs"
  ON public.transporteurs FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Beta anon can read manual_departures" ON public.manual_departures;
CREATE POLICY "Beta anon can read manual_departures"
  ON public.manual_departures FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Beta anon can insert manual_departures" ON public.manual_departures;
CREATE POLICY "Beta anon can insert manual_departures"
  ON public.manual_departures FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Beta anon can update manual_departures" ON public.manual_departures;
CREATE POLICY "Beta anon can update manual_departures"
  ON public.manual_departures FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Beta anon can delete manual_departures" ON public.manual_departures;
CREATE POLICY "Beta anon can delete manual_departures"
  ON public.manual_departures FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "Beta anon can read shipments" ON public.shipments;
CREATE POLICY "Beta anon can read shipments"
  ON public.shipments FOR SELECT TO anon USING (true);