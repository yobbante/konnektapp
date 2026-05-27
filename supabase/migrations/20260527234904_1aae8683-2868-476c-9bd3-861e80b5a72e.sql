ALTER TABLE public.gp_profiles ADD COLUMN IF NOT EXISTS beta_source TEXT;
CREATE INDEX IF NOT EXISTS idx_gp_profiles_beta_source ON public.gp_profiles(beta_source) WHERE beta_source IS NOT NULL;