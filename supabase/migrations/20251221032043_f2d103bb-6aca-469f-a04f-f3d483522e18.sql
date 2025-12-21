-- Table pour les demandes de support et litiges
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  type TEXT NOT NULL DEFAULT 'support', -- 'support', 'dispute', 'complaint'
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Messages du ticket de support
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL, -- 'client', 'gp', 'admin'
  content TEXT NOT NULL,
  attachments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Trigger pour générer le numéro de ticket
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
    LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION generate_ticket_number();

-- Trigger pour updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies pour support_tickets
CREATE POLICY "Users can view their own tickets"
  ON public.support_tickets
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create tickets"
  ON public.support_tickets
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tickets"
  ON public.support_tickets
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all tickets"
  ON public.support_tickets
  FOR SELECT
  USING (has_admin_access(auth.uid()));

CREATE POLICY "Admins can update all tickets"
  ON public.support_tickets
  FOR UPDATE
  USING (has_admin_access(auth.uid()));

-- RLS Policies pour support_messages
CREATE POLICY "Users can view messages in their tickets"
  ON public.support_messages
  FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM public.support_tickets WHERE user_id = auth.uid()
    ) OR has_admin_access(auth.uid())
  );

CREATE POLICY "Users can send messages in their tickets"
  ON public.support_messages
  FOR INSERT
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM public.support_tickets WHERE user_id = auth.uid()
    ) OR has_admin_access(auth.uid())
  );

-- Table pour les demandes personnalisées (custom requests)
CREATE TABLE public.custom_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL,
  origin_city TEXT NOT NULL,
  origin_country TEXT NOT NULL DEFAULT 'SN',
  destination_city TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  transport_type TEXT, -- null = tous types
  shipment_type TEXT NOT NULL, -- 'colis', 'demenagement', 'marchandise', 'vehicule', 'autre'
  weight_estimate NUMERIC,
  volume_estimate TEXT,
  description TEXT NOT NULL,
  pickup_date_from TIMESTAMP WITH TIME ZONE,
  pickup_date_to TIMESTAMP WITH TIME ZONE,
  budget_min INTEGER,
  budget_max INTEGER,
  is_urgent BOOLEAN DEFAULT false,
  is_fragile BOOLEAN DEFAULT false,
  additional_services TEXT[],
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'has_responses', 'accepted', 'expired', 'cancelled'
  accepted_offer_id UUID,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Réponses des transporteurs aux demandes personnalisées
CREATE TABLE public.custom_request_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.custom_requests(id) ON DELETE CASCADE,
  gp_id UUID NOT NULL REFERENCES public.gp_profiles(id),
  price_proposed INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'FCFA',
  message TEXT,
  estimated_delivery_days INTEGER,
  available_pickup_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_request_responses ENABLE ROW LEVEL SECURITY;

-- Trigger pour générer le numéro de demande
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.request_number := 'REQ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
    LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_request_number
  BEFORE INSERT ON public.custom_requests
  FOR EACH ROW
  EXECUTE FUNCTION generate_request_number();

CREATE TRIGGER update_custom_requests_updated_at
  BEFORE UPDATE ON public.custom_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies pour custom_requests
CREATE POLICY "Clients can view their own requests"
  ON public.custom_requests
  FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Clients can create requests"
  ON public.custom_requests
  FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients can update their own requests"
  ON public.custom_requests
  FOR UPDATE
  USING (client_id = auth.uid());

CREATE POLICY "GPs can view open requests"
  ON public.custom_requests
  FOR SELECT
  USING (status = 'open' OR status = 'has_responses');

CREATE POLICY "Admins can view all requests"
  ON public.custom_requests
  FOR SELECT
  USING (has_admin_access(auth.uid()));

-- RLS Policies pour custom_request_responses
CREATE POLICY "Clients can view responses to their requests"
  ON public.custom_request_responses
  FOR SELECT
  USING (
    request_id IN (SELECT id FROM public.custom_requests WHERE client_id = auth.uid())
  );

CREATE POLICY "GPs can view their own responses"
  ON public.custom_request_responses
  FOR SELECT
  USING (
    gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "GPs can create responses"
  ON public.custom_request_responses
  FOR INSERT
  WITH CHECK (
    gp_id IN (SELECT id FROM public.gp_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Clients can update response status"
  ON public.custom_request_responses
  FOR UPDATE
  USING (
    request_id IN (SELECT id FROM public.custom_requests WHERE client_id = auth.uid())
  );

-- Fonction pour notifier les GPs quand une nouvelle demande est créée
CREATE OR REPLACE FUNCTION notify_gps_new_request()
RETURNS TRIGGER AS $$
DECLARE
  gp_record RECORD;
BEGIN
  -- Notifier tous les GPs vérifiés
  FOR gp_record IN 
    SELECT gp.user_id 
    FROM gp_profiles gp 
    WHERE gp.status = 'verified'
  LOOP
    INSERT INTO notifications (user_id, title, message, type, related_type, related_id)
    VALUES (
      gp_record.user_id,
      'Nouvelle demande de transport',
      'Un client recherche un transport de ' || NEW.origin_city || ' vers ' || NEW.destination_city,
      'info',
      'custom_request',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_gps_on_new_request
  AFTER INSERT ON public.custom_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_gps_new_request();

-- Fonction pour notifier le client quand un GP répond
CREATE OR REPLACE FUNCTION notify_client_new_response()
RETURNS TRIGGER AS $$
DECLARE
  request_record RECORD;
  gp_name TEXT;
BEGIN
  SELECT cr.client_id, cr.origin_city, cr.destination_city INTO request_record
  FROM custom_requests cr WHERE cr.id = NEW.request_id;
  
  SELECT gp.business_name INTO gp_name
  FROM gp_profiles gp WHERE gp.id = NEW.gp_id;
  
  INSERT INTO notifications (user_id, title, message, type, related_type, related_id)
  VALUES (
    request_record.client_id,
    'Nouvelle offre reçue',
    gp_name || ' a proposé ' || NEW.price_proposed || ' FCFA pour votre demande',
    'info',
    'custom_request_response',
    NEW.id
  );
  
  -- Mettre à jour le statut de la demande
  UPDATE custom_requests SET status = 'has_responses' WHERE id = NEW.request_id AND status = 'open';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_client_on_new_response
  AFTER INSERT ON public.custom_request_responses
  FOR EACH ROW
  EXECUTE FUNCTION notify_client_new_response();