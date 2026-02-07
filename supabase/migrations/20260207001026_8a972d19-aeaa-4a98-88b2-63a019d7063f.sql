
-- ================================================
-- 1. SECURE PUBLIC TRACKING FUNCTION
-- Exposes ONLY non-sensitive order data for anonymous access
-- Used by /track/:orderId page (ScanTrack™)
-- ================================================
CREATE OR REPLACE FUNCTION public.get_public_tracking(p_order_identifier text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_order_id uuid;
BEGIN
  -- Try UUID first
  BEGIN
    v_order_id := p_order_identifier::uuid;
    SELECT json_build_object(
      'order_number', o.order_number,
      'status', o.status::text,
      'origin_country', o.origin_country,
      'destination_country', o.destination_country,
      'origin_city', o.origin_city,
      'destination_city', o.destination_city,
      'delivery_date', o.delivery_date,
      'created_at', o.created_at
    ) INTO result
    FROM orders o
    WHERE o.id = v_order_id;
  EXCEPTION WHEN invalid_text_representation THEN
    -- Not a UUID, try order_number
    SELECT json_build_object(
      'order_number', o.order_number,
      'status', o.status::text,
      'origin_country', o.origin_country,
      'destination_country', o.destination_country,
      'origin_city', o.origin_city,
      'destination_city', o.destination_city,
      'delivery_date', o.delivery_date,
      'created_at', o.created_at
    ) INTO result
    FROM orders o
    WHERE o.order_number = p_order_identifier;
  END;
  
  RETURN result;
END;
$$;

-- Grant anon access to this function ONLY
GRANT EXECUTE ON FUNCTION public.get_public_tracking(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_tracking(text) TO authenticated;

-- ================================================
-- 2. DUPLICATE SCAN PREVENTION FUNCTION
-- Checks if the same action was already performed by the same role
-- Returns false if action already exists (preventing duplicate)
-- ================================================
CREATE OR REPLACE FUNCTION public.can_perform_scan_action(
  p_order_id uuid,
  p_action text,
  p_user_role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 'view' actions are always allowed (read-only)
  IF p_action = 'view' THEN
    RETURN true;
  END IF;
  
  -- Check if this exact action was already performed for this order
  RETURN NOT EXISTS (
    SELECT 1 
    FROM scan_logs 
    WHERE order_id = p_order_id 
      AND action = p_action
      AND user_role = p_user_role
      AND action != 'view'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_perform_scan_action(uuid, text, text) TO authenticated;

-- ================================================
-- 3. AGENT LOGISTIQUE PERMISSIONS
-- Insert specific permissions for the new agent role
-- ================================================
INSERT INTO permissions (name, description, category)
VALUES 
  ('logistics.scan', 'Scanner les QR codes des colis', 'logistics'),
  ('logistics.pickup', 'Confirmer les enlèvements de colis', 'logistics'),
  ('logistics.deliver', 'Confirmer les livraisons de colis', 'logistics'),
  ('logistics.view_contact', 'Voir les contacts clients/GP', 'logistics'),
  ('logistics.stock_reception', 'Confirmer réception stock Yobbanté', 'logistics')
ON CONFLICT DO NOTHING;

-- Link permissions to agent_logistique role
INSERT INTO role_permissions (role, permission_id)
SELECT 'agent_logistique'::app_role, p.id
FROM permissions p
WHERE p.name IN ('logistics.scan', 'logistics.pickup', 'logistics.deliver', 'logistics.view_contact', 'logistics.stock_reception')
ON CONFLICT DO NOTHING;

-- ================================================
-- 4. SCAN_LOGS RLS - Allow agents to insert scan logs
-- ================================================
CREATE POLICY "Agents can insert scan logs"
ON scan_logs
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    has_role(auth.uid(), 'agent_logistique'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Allow agents to view their own scan logs
CREATE POLICY "Agents can view their scan logs"
ON scan_logs
FOR SELECT
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);
