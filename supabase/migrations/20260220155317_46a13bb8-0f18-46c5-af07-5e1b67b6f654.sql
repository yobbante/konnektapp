
-- ═══════════════════════════════════════════════════════════════
-- SECTION IX — SÉCURITÉ MINIMALE MVP (corrigé)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Enrichir idempotency_keys avec contexte d'audit ──────────
ALTER TABLE public.idempotency_keys
  ADD COLUMN IF NOT EXISTS actor_id uuid,
  ADD COLUMN IF NOT EXISTS action text,
  ADD COLUMN IF NOT EXISTS order_id uuid,
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone DEFAULT (now() + interval '7 days');

CREATE INDEX IF NOT EXISTS idx_idempotency_actor_order
  ON public.idempotency_keys(actor_id, order_id, action);

-- ── 2. Enrichir orders : champs sécurité ───────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS declared_weight numeric,
  ADD COLUMN IF NOT EXISTS weight_adjustment_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_blocked_until timestamp with time zone,
  ADD COLUMN IF NOT EXISTS geo_suspicious boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS security_flags text[] DEFAULT '{}';

-- ── 3. Table weight_adjustment_log ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.weight_adjustment_log (
  id                uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id          uuid NOT NULL,
  actor_id          uuid NOT NULL,
  actor_role        text NOT NULL,
  original_weight   numeric NOT NULL,
  declared_weight   numeric NOT NULL,
  delta_amount      numeric NOT NULL DEFAULT 0,
  justification     text,
  blocked           boolean NOT NULL DEFAULT false,
  block_reason      text,
  created_at        timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weight_adj_order ON public.weight_adjustment_log(order_id);

ALTER TABLE public.weight_adjustment_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gp_read_own_weight_logs" ON public.weight_adjustment_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      INNER JOIN public.gp_profiles gp ON gp.id = o.gp_id
      WHERE o.id = weight_adjustment_log.order_id AND gp.user_id = auth.uid()
    )
  );

CREATE POLICY "client_read_own_weight_logs" ON public.weight_adjustment_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = weight_adjustment_log.order_id AND o.client_id = auth.uid()
    )
  );

CREATE POLICY "admin_read_weight_logs" ON public.weight_adjustment_log FOR SELECT
  USING (public.has_admin_access(auth.uid()));

-- ── 4. Table security_audit_log ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id            uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type    text NOT NULL,
  order_id      uuid,
  actor_id      uuid,
  actor_role    text,
  details       jsonb,
  severity      text NOT NULL DEFAULT 'warn' CHECK (severity IN ('info', 'warn', 'critical')),
  created_at    timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_order ON public.security_audit_log(order_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_event ON public.security_audit_log(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_severity ON public.security_audit_log(severity, created_at DESC);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_security_audit" ON public.security_audit_log FOR SELECT
  USING (public.has_admin_access(auth.uid()));

-- ── 5. Fonction : vérifier si state transition est autorisée ───
CREATE OR REPLACE FUNCTION public.is_valid_state_transition(
  p_current_status text,
  p_target_status text
) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_current_status IN ('released', 'cancelled', 'disputed') THEN
    RETURN false;
  END IF;

  RETURN CASE p_current_status
    WHEN 'pending'               THEN p_target_status IN ('accepted', 'paid_held', 'cancelled')
    WHEN 'accepted'              THEN p_target_status IN ('paid_held', 'collected', 'cancelled')
    WHEN 'paid_held'             THEN p_target_status IN ('checked_in', 'cancelled')
    WHEN 'checked_in'            THEN p_target_status IN ('weight_pending_payment', 'scheduled_departure')
    WHEN 'weight_pending_payment' THEN p_target_status IN ('checked_in')
    WHEN 'scheduled_departure'   THEN p_target_status IN ('in_transit')
    WHEN 'collected'             THEN p_target_status IN ('in_transit', 'scheduled_departure', 'cancelled')
    WHEN 'in_transit'            THEN p_target_status IN ('arrived_destination', 'delivered', 'delivery_confirmed')
    WHEN 'arrived_destination'   THEN p_target_status IN ('delivery_pending', 'delivered')
    WHEN 'delivery_pending'      THEN p_target_status IN ('delivery_confirmed')
    WHEN 'delivery_confirmed'    THEN p_target_status IN ('delivered', 'released')
    WHEN 'delivered'             THEN p_target_status IN ('released')
    ELSE false
  END;
END;
$$;

-- ── 6. Trigger : guard state machine + post-release lock ────────
CREATE OR REPLACE FUNCTION public.guard_order_state_transition()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
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
    -- Logger la tentative
    INSERT INTO public.security_audit_log (event_type, order_id, details, severity)
    VALUES (
      'unauthorized_state_mutation',
      OLD.id,
      jsonb_build_object('from', OLD.status, 'to', NEW.status),
      'critical'
    );
    RAISE EXCEPTION 'INVALID_TRANSITION: cannot move order % from % to %', OLD.id, OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_order_state ON public.orders;
CREATE TRIGGER trg_guard_order_state
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_order_state_transition();

-- ── 7. Fonction : logguer tentative code livraison échouée ─────
CREATE OR REPLACE FUNCTION public.log_delivery_attempt_failed(
  p_order_id uuid,
  p_actor_id uuid,
  p_attempt_count integer
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (event_type, order_id, actor_id, details, severity)
  VALUES (
    'delivery_attempt_failed',
    p_order_id,
    p_actor_id,
    jsonb_build_object('attempt_count', p_attempt_count),
    CASE WHEN p_attempt_count >= 3 THEN 'critical' ELSE 'warn' END
  );
END;
$$;
