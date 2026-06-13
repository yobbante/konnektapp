ALTER TABLE public.transporteurs
  ADD COLUMN IF NOT EXISTS beta_forfait_min integer,
  ADD COLUMN IF NOT EXISTS beta_devise text DEFAULT 'XOF';