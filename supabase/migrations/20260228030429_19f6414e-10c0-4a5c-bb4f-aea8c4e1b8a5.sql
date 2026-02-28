-- Add unique partial index on profiles.phone (only where phone is not null and not empty)
-- This prevents two users from registering with the same phone number
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique 
ON public.profiles (phone) 
WHERE phone IS NOT NULL AND phone != '';

-- Add unique partial index on gp_profiles.phone (only where phone is not null and not empty)
CREATE UNIQUE INDEX IF NOT EXISTS idx_gp_profiles_phone_unique 
ON public.gp_profiles (phone) 
WHERE phone IS NOT NULL AND phone != '';