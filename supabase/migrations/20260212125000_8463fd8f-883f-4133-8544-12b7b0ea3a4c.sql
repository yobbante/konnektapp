
-- Add 'starter' and 'premium' to gp_status enum
ALTER TYPE gp_status ADD VALUE IF NOT EXISTS 'starter' BEFORE 'pending';
ALTER TYPE gp_status ADD VALUE IF NOT EXISTS 'premium' AFTER 'verified';

-- Add KYC columns to gp_profiles
ALTER TABLE public.gp_profiles
  ADD COLUMN IF NOT EXISTS kyc_level integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS withdrawal_limit integer NOT NULL DEFAULT 300000,
  ADD COLUMN IF NOT EXISTS selfie_url text;

-- Comment for clarity
COMMENT ON COLUMN public.gp_profiles.kyc_level IS '0=Starter, 1=Verified (ID+selfie), 2=Premium (address+bank)';
COMMENT ON COLUMN public.gp_profiles.kyc_status IS 'none, pending, approved, rejected';
COMMENT ON COLUMN public.gp_profiles.withdrawal_limit IS 'Max withdrawal in FCFA. 300000 default, 0 = unlimited';
