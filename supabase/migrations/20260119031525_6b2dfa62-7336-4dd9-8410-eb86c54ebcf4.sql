-- Add new GP type for international baggage transport
ALTER TYPE public.gp_type ADD VALUE IF NOT EXISTS 'bagages_international';

-- Add baggage-specific fields to gp_offers for international voyages
ALTER TABLE public.gp_offers 
ADD COLUMN IF NOT EXISTS baggage_types_accepted TEXT[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS baggage_restrictions TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS flight_number TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS airline TEXT DEFAULT NULL;