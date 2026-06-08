ALTER TABLE public.transporteurs ADD COLUMN IF NOT EXISTS welcome_sent_at timestamptz;
NOTIFY pgrst, 'reload schema';