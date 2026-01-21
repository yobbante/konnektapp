-- Add explicit_restrictions column to gp_profiles
ALTER TABLE public.gp_profiles 
ADD COLUMN IF NOT EXISTS explicit_restrictions TEXT[] DEFAULT '{}'::TEXT[];

-- Add comment for clarity
COMMENT ON COLUMN public.gp_profiles.explicit_restrictions IS 'List of restrictions the GP has accepted/applies to their service';