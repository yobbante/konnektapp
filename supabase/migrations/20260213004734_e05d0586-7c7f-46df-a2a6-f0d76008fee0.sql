
-- Add client KYC fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_level integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cumulative_spent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS id_document_url text,
  ADD COLUMN IF NOT EXISTS selfie_url text,
  ADD COLUMN IF NOT EXISTS kyc_verified_at timestamp with time zone;

-- Comment for clarity
COMMENT ON COLUMN public.profiles.kyc_level IS 'Client KYC level: 0=Starter, 1=Vérifié, 2=Confirmé';
COMMENT ON COLUMN public.profiles.cumulative_spent IS 'Total cumulative spending in XOF for KYC threshold checks';
