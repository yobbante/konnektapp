
CREATE TABLE IF NOT EXISTS public.konnekt_beta_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gp_ref text NOT NULL,
  registered_user_id uuid NOT NULL,
  registered_gp_id uuid,
  source text DEFAULT 'beta_landing',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_konnekt_beta_referrals_ref ON public.konnekt_beta_referrals(gp_ref);
CREATE INDEX IF NOT EXISTS idx_konnekt_beta_referrals_user ON public.konnekt_beta_referrals(registered_user_id);

ALTER TABLE public.konnekt_beta_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referral entry"
ON public.konnekt_beta_referrals
FOR SELECT
TO authenticated
USING (registered_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage referrals"
ON public.konnekt_beta_referrals
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
