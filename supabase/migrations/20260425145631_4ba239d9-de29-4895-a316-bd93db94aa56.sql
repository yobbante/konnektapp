-- Add admin_notes to transporter_interests
ALTER TABLE public.transporter_interests
  ADD COLUMN IF NOT EXISTS admin_notes text;

-- History table
CREATE TABLE IF NOT EXISTS public.transporter_interest_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interest_id uuid NOT NULL REFERENCES public.transporter_interests(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  comment text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tih_interest ON public.transporter_interest_history(interest_id);

ALTER TABLE public.transporter_interest_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view interest history" ON public.transporter_interest_history;
CREATE POLICY "Admins view interest history"
  ON public.transporter_interest_history FOR SELECT
  USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Admins insert interest history" ON public.transporter_interest_history;
CREATE POLICY "Admins insert interest history"
  ON public.transporter_interest_history FOR INSERT
  WITH CHECK (public.has_admin_access(auth.uid()));