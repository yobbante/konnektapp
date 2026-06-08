ALTER TABLE public.transporteurs
  ADD COLUMN IF NOT EXISTS form_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS whatsapp_confirmed_at timestamptz;