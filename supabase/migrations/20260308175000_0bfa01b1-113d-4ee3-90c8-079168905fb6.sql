
ALTER TABLE public.gp_navettes 
ADD COLUMN IF NOT EXISTS phone_secondary TEXT,
ADD COLUMN IF NOT EXISTS address_origin TEXT,
ADD COLUMN IF NOT EXISTS address_destination TEXT;
