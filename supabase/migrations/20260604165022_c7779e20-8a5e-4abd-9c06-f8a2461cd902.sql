ALTER TYPE public.gp_status ADD VALUE IF NOT EXISTS 'pending_whatsapp';
ALTER TABLE public.gp_profiles ALTER COLUMN user_id DROP NOT NULL;