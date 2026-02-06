
-- Create scan_logs table for complete audit trail
CREATE TABLE public.scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  user_id UUID NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  scan_type TEXT NOT NULL DEFAULT 'qr',
  previous_status TEXT,
  new_status TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;

-- RLS: Users can insert their own scan logs
CREATE POLICY "Users can insert their own scan logs"
ON public.scan_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS: Users can view scans on their own orders
CREATE POLICY "Users can view scans on their orders"
ON public.scan_logs FOR SELECT
USING (
  order_id IN (SELECT id FROM orders WHERE client_id = auth.uid())
  OR order_id IN (SELECT id FROM orders WHERE gp_id IN (SELECT id FROM gp_profiles WHERE user_id = auth.uid()))
  OR user_id = auth.uid()
  OR has_admin_access(auth.uid())
  OR has_role(auth.uid(), 'agent_logistique')
);

-- RLS: Admins can manage all scan logs
CREATE POLICY "Admins can manage all scan logs"
ON public.scan_logs FOR ALL
USING (has_admin_access(auth.uid()));

-- Indexes
CREATE INDEX idx_scan_logs_order ON public.scan_logs(order_id);
CREATE INDEX idx_scan_logs_user ON public.scan_logs(user_id);
CREATE INDEX idx_scan_logs_created ON public.scan_logs(created_at DESC);

-- Permissions for agent_logistique
INSERT INTO public.permissions (name, description, category) VALUES
  ('logistics.scan', 'Scanner les QR codes pour enlèvement/livraison', 'logistics'),
  ('logistics.pickup', 'Effectuer les enlèvements de colis', 'logistics'),
  ('logistics.deliver', 'Effectuer les livraisons de colis', 'logistics'),
  ('logistics.view_contact', 'Voir les coordonnées destinataire', 'logistics')
ON CONFLICT DO NOTHING;

-- Link permissions to agent_logistique role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'agent_logistique'::app_role, id FROM public.permissions 
WHERE name IN ('logistics.scan', 'logistics.pickup', 'logistics.deliver', 'logistics.view_contact')
ON CONFLICT DO NOTHING;

-- Enable realtime on scan_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.scan_logs;
