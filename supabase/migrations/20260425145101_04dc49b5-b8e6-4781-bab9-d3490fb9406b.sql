-- Table d'intérêts transporteur ↔ demandes clients (lean beta supply layer)
CREATE TABLE public.transporter_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gp_id uuid NOT NULL REFERENCES public.gp_profiles(id) ON DELETE CASCADE,
  custom_request_id uuid NOT NULL REFERENCES public.custom_requests(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','validated','in_progress','completed','declined')),
  message text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gp_id, custom_request_id)
);

CREATE INDEX idx_transporter_interests_gp ON public.transporter_interests(gp_id, status);
CREATE INDEX idx_transporter_interests_request ON public.transporter_interests(custom_request_id);

ALTER TABLE public.transporter_interests ENABLE ROW LEVEL SECURITY;

-- Le transporteur voit ses propres intérêts
CREATE POLICY "GP can view own interests"
  ON public.transporter_interests FOR SELECT
  USING (public.owns_gp_offer(gp_id));

-- Le transporteur peut créer un intérêt pour lui-même
CREATE POLICY "GP can create own interests"
  ON public.transporter_interests FOR INSERT
  WITH CHECK (public.owns_gp_offer(gp_id));

-- Le client propriétaire de la demande voit les intérêts
CREATE POLICY "Client can view interests on own requests"
  ON public.transporter_interests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.custom_requests cr
    WHERE cr.id = custom_request_id AND cr.client_id = auth.uid()
  ));

-- Admin voit tout
CREATE POLICY "Admins can view all interests"
  ON public.transporter_interests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin peut tout mettre à jour (validation manuelle)
CREATE POLICY "Admins can update interests"
  ON public.transporter_interests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_transporter_interests_updated_at
  BEFORE UPDATE ON public.transporter_interests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();