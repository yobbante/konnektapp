-- Add unique constraint on gp_profiles.phone to enforce one phone per GP
ALTER TABLE public.gp_profiles ADD CONSTRAINT gp_profiles_phone_unique UNIQUE (phone);