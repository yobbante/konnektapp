
-- Recipients / Saved contacts table
CREATE TABLE public.recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  recipient_user_id uuid,
  full_name text NOT NULL,
  phone text,
  email text,
  nickname text,
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(owner_id, phone)
);

ALTER TABLE public.recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own recipients"
ON public.recipients FOR ALL
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Recipient requests (when someone wants to add you)
CREATE TABLE public.recipient_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  requester_name text,
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(requester_id, target_user_id)
);

ALTER TABLE public.recipient_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create recipient requests"
ON public.recipient_requests FOR INSERT
WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can view their sent and received requests"
ON public.recipient_requests FOR SELECT
USING (requester_id = auth.uid() OR target_user_id = auth.uid());

CREATE POLICY "Target users can update request status"
ON public.recipient_requests FOR UPDATE
USING (target_user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_recipients_updated_at
BEFORE UPDATE ON public.recipients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipient_requests_updated_at
BEFORE UPDATE ON public.recipient_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
