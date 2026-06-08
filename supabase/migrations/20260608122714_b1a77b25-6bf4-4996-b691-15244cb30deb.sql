CREATE TABLE public.gp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_gp TEXT,
  telephone TEXT NOT NULL,
  message TEXT,
  direction TEXT NOT NULL DEFAULT 'in',
  lu BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gp_messages TO authenticated;
GRANT ALL ON public.gp_messages TO service_role;

ALTER TABLE public.gp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage gp_messages"
ON public.gp_messages
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));