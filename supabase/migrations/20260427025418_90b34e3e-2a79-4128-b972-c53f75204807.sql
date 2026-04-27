-- Add claimed tracking fields to gp_profiles
ALTER TABLE public.gp_profiles
  ADD COLUMN IF NOT EXISTS beta_claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS beta_claimed_email text;

-- Index to enforce uniqueness of claimed emails (only when set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_gp_profiles_beta_claimed_email
  ON public.gp_profiles (lower(beta_claimed_email))
  WHERE beta_claimed_email IS NOT NULL;
