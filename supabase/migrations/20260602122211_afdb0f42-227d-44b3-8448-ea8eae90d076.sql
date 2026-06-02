CREATE TABLE public.whatsapp_inbound_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_phone TEXT NOT NULL,
  message_body TEXT,
  tag TEXT,
  is_known_gp BOOLEAN NOT NULL DEFAULT false,
  bot_reply TEXT,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_inbound_messages TO authenticated;
GRANT ALL ON public.whatsapp_inbound_messages TO service_role;

ALTER TABLE public.whatsapp_inbound_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view inbound messages"
ON public.whatsapp_inbound_messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_whatsapp_inbound_tag ON public.whatsapp_inbound_messages (tag);
CREATE INDEX idx_whatsapp_inbound_phone ON public.whatsapp_inbound_messages (sender_phone);