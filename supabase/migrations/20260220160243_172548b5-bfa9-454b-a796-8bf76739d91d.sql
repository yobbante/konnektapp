
-- ════════════════════════════════════════════════════════════════════════
-- SECTION XI — CONSOLIDATION FINALE MVP
-- Correction des gaps critiques identifiés lors de l'audit I→X
-- ════════════════════════════════════════════════════════════════════════

-- ── GAP #1 : Enregistrer les triggers manquants sur orders ───────────

-- Trigger state machine guard (bloque transitions illégales)
DROP TRIGGER IF EXISTS trg_guard_order_state ON public.orders;
CREATE TRIGGER trg_guard_order_state
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_order_state_transition();

-- Trigger protection escrow (bloque double release)
DROP TRIGGER IF EXISTS trg_protect_escrow_release ON public.escrow_transactions;
CREATE TRIGGER trg_protect_escrow_release
  BEFORE UPDATE ON public.escrow_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_escrow_release();

-- ── GAP #2 : Mettre à jour is_valid_state_transition avec le nouvel enum ─
-- La fonction existante est mise à jour pour inclure tous les nouveaux états
CREATE OR REPLACE FUNCTION public.is_valid_state_transition(p_current_status text, p_target_status text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- États terminaux absolus : aucune mutation possible
  IF p_current_status IN ('released', 'cancelled', 'disputed') THEN
    RETURN false;
  END IF;

  RETURN CASE p_current_status
    -- Flow standard
    WHEN 'pending'                THEN p_target_status IN ('accepted', 'paid_held', 'collected', 'cancelled')
    WHEN 'accepted'               THEN p_target_status IN ('paid_held', 'collected', 'checked_in', 'cancelled')
    WHEN 'paid_held'              THEN p_target_status IN ('checked_in', 'cancelled')
    WHEN 'checked_in'             THEN p_target_status IN ('weight_pending_payment', 'scheduled_departure', 'in_transit')
    WHEN 'weight_pending_payment' THEN p_target_status IN ('checked_in')  -- Retour après paiement supplément
    WHEN 'scheduled_departure'    THEN p_target_status IN ('in_transit')
    WHEN 'collected'              THEN p_target_status IN ('checked_in', 'in_transit', 'scheduled_departure', 'cancelled')
    -- Transit → Arrivée
    WHEN 'in_transit'             THEN p_target_status IN ('arrived_destination', 'delivery_pending', 'delivery_confirmed', 'delivered')
    WHEN 'arrived_destination'    THEN p_target_status IN ('delivery_pending', 'delivery_confirmed', 'delivered')
    WHEN 'delivery_pending'       THEN p_target_status IN ('delivery_confirmed', 'delivered')
    -- Livraison → Release
    WHEN 'delivery_confirmed'     THEN p_target_status IN ('delivered', 'released')
    WHEN 'delivered'              THEN p_target_status IN ('released')
    ELSE false
  END;
END;
$$;

-- ── GAP #3 : guard_order_state_transition — mettre à jour les états immutables ──
CREATE OR REPLACE FUNCTION public.guard_order_state_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- État released : toute mutation est interdite
  IF OLD.status::text = 'released' THEN
    RAISE EXCEPTION 'ORDER_IMMUTABLE: order % is in released state, no mutations allowed', OLD.id;
  END IF;

  -- Vérification machine d'états
  IF NOT public.is_valid_state_transition(OLD.status::text, NEW.status::text) THEN
    -- Logger la tentative dans security_audit_log
    BEGIN
      INSERT INTO public.security_audit_log (event_type, order_id, details, severity)
      VALUES (
        'unauthorized_state_mutation',
        OLD.id,
        jsonb_build_object('from', OLD.status, 'to', NEW.status, 'at', now()),
        'critical'
      );
    EXCEPTION WHEN OTHERS THEN NULL; END;

    RAISE EXCEPTION 'INVALID_TRANSITION: cannot move order % from % to %',
      OLD.id, OLD.status, NEW.status;
  END IF;

  -- Logger chaque transition dans order_status_history si non déjà fait par le code
  BEGIN
    INSERT INTO public.order_status_history (order_id, status, changed_by_type, notes)
    VALUES (OLD.id, NEW.status::text, 'trigger', 'Auto-log: ' || OLD.status || ' → ' || NEW.status);
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN NEW;
END;
$$;

-- ── Trigger update commissions GP au moment release ──────────────────
CREATE OR REPLACE FUNCTION public.update_gp_deliveries_on_release()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Incrémente total_deliveries quand une commande passe à 'released'
  IF NEW.status::text = 'released' AND OLD.status::text != 'released' THEN
    UPDATE public.gp_profiles
    SET total_deliveries = COALESCE(total_deliveries, 0) + 1,
        updated_at = now()
    WHERE id = NEW.gp_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_gp_deliveries ON public.orders;
CREATE TRIGGER trg_update_gp_deliveries
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gp_deliveries_on_release();

-- ── Assurer que order_status_history existe avec les bonnes colonnes ──
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  status text NOT NULL,
  changed_by uuid,
  changed_by_type text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "GP can view their order history" ON public.order_status_history;
CREATE POLICY "GP can view their order history"
  ON public.order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.gp_profiles gp ON gp.id = o.gp_id
      WHERE o.id = order_id AND gp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Client can view their order history" ON public.order_status_history;
CREATE POLICY "Client can view their order history"
  ON public.order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin can view all order history" ON public.order_status_history;
CREATE POLICY "Admin can view all order history"
  ON public.order_status_history FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "System can insert order history" ON public.order_status_history;
CREATE POLICY "System can insert order history"
  ON public.order_status_history FOR INSERT
  WITH CHECK (true);

-- ── Sécuriser escrow_logs (audit immuable) ───────────────────────────
ALTER TABLE public.escrow_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "GP can view their escrow logs" ON public.escrow_logs;
CREATE POLICY "GP can view their escrow logs"
  ON public.escrow_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.gp_profiles gp ON gp.id = o.gp_id
      WHERE o.id = order_id AND gp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admin can view all escrow logs" ON public.escrow_logs;
CREATE POLICY "Admin can view all escrow logs"
  ON public.escrow_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "System inserts escrow logs" ON public.escrow_logs;
CREATE POLICY "System inserts escrow logs"
  ON public.escrow_logs FOR INSERT
  WITH CHECK (true);

-- Bloquer toute mise à jour / suppression sur escrow_logs (immuabilité totale)
DROP POLICY IF EXISTS "No updates on escrow_logs" ON public.escrow_logs;
CREATE POLICY "No updates on escrow_logs"
  ON public.escrow_logs FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "No deletes on escrow_logs" ON public.escrow_logs;
CREATE POLICY "No deletes on escrow_logs"
  ON public.escrow_logs FOR DELETE
  USING (false);

-- ── Index de performance sur tables critiques ────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_gp_id ON public.orders(gp_id);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON public.orders(client_id);
CREATE INDEX IF NOT EXISTS idx_escrow_order_id ON public.escrow_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON public.escrow_transactions(status);
CREATE INDEX IF NOT EXISTS idx_idempotency_key ON public.idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_scan_logs_order ON public.scan_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_order ON public.security_audit_log(order_id);

-- ── Vue matérialisée MVP : tableau de bord coherence ────────────────
CREATE OR REPLACE VIEW public.mvp_coherence_dashboard AS
SELECT
  o.id AS order_id,
  o.order_number,
  o.status AS order_status,
  o.financial_status,
  et.status AS escrow_status,
  et.amount AS escrow_amount,
  et.commission_amount,
  et.net_to_gp,
  o.geo_suspicious,
  o.delivery_attempt_count,
  o.delivery_blocked_until,
  -- Coherence flag: TRUE si tout est en ordre
  CASE
    WHEN o.status::text = 'released' AND et.status = 'released' AND o.financial_status::text = 'completed' THEN true
    WHEN o.status::text IN ('paid_held','checked_in','in_transit','arrived_destination','delivery_pending','delivery_confirmed') AND et.status = 'held' THEN true
    WHEN o.status::text = 'pending' AND et.id IS NULL THEN true
    ELSE false
  END AS is_coherent,
  -- Alerte si incohérence
  CASE
    WHEN o.status::text = 'released' AND et.status != 'released' THEN 'ESCROW_NOT_RELEASED'
    WHEN o.status::text != 'released' AND et.status = 'released' THEN 'ORDER_NOT_RELEASED'
    WHEN o.financial_status::text = 'completed' AND et.status != 'released' THEN 'FINANCIAL_MISMATCH'
    ELSE NULL
  END AS coherence_alert,
  o.updated_at
FROM public.orders o
LEFT JOIN public.escrow_transactions et ON et.order_id = o.id;
