ALTER TABLE public.transporteurs ADD COLUMN IF NOT EXISTS navettes text[] NOT NULL DEFAULT '{}';

GRANT SELECT ON public.transporteurs TO anon;
GRANT SELECT ON public.transporteurs TO authenticated;

CREATE POLICY "Transporteurs reference lookup public read"
ON public.transporteurs
FOR SELECT
TO anon
USING (true);