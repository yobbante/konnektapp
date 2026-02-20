
-- ═══════════════════════════════════════════════════════════════
-- ESCROW V2 — CONSOLIDATION STRUCTURELLE (NON DESTRUCTIVE)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Enrichir escrow_transactions ──────────────────────────────
-- Ajouter les champs manquants (commission_amount, net_to_gp)
-- status et released_at existent déjà — on ne les recrée pas

ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS commission_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_to_gp numeric NOT NULL DEFAULT 0;

-- ── 2. Ajouter nouveaux états order_status sans supprimer existants ──
-- Existants : pending, accepted, collected, in_transit, delivered, cancelled, disputed
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'paid_held';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'checked_in';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'weight_pending_payment';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'scheduled_departure';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'arrived_destination';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'delivery_pending';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'delivery_confirmed';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'released';

-- ── 3. Créer table d'audit escrow_logs ─────────────────────────
CREATE TABLE IF NOT EXISTS public.escrow_logs (
  id             uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id       uuid NOT NULL,
  action         text NOT NULL CHECK (action IN ('created', 'adjusted', 'released')),
  previous_amount numeric NOT NULL DEFAULT 0,
  new_amount     numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  actor          text NOT NULL DEFAULT 'system',
  created_at     timestamp with time zone NOT NULL DEFAULT now()
);

-- Index pour recherches rapides par commande
CREATE INDEX IF NOT EXISTS idx_escrow_logs_order_id ON public.escrow_logs(order_id);

-- RLS — lecture seule pour admin, écriture uniquement service_role
ALTER TABLE public.escrow_logs ENABLE ROW LEVEL SECURITY;

-- Admins peuvent lire les logs
CREATE POLICY "admins_read_escrow_logs"
  ON public.escrow_logs FOR SELECT
  USING (public.has_admin_access(auth.uid()));

-- GPs peuvent lire les logs de leurs propres commandes
CREATE POLICY "gp_read_own_escrow_logs"
  ON public.escrow_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      INNER JOIN public.gp_profiles gp ON gp.id = o.gp_id
      WHERE o.id = escrow_logs.order_id
        AND gp.user_id = auth.uid()
    )
  );

-- Clients peuvent lire les logs de leurs propres commandes
CREATE POLICY "client_read_own_escrow_logs"
  ON public.escrow_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = escrow_logs.order_id
        AND o.client_id = auth.uid()
    )
  );

-- ── 4. Protéger escrow_transactions : bloquer UPDATE direct sur status='released' ──
-- Une fonction trigger vérifie qu'aucune mutation directe ne contourne le module centralisé
CREATE OR REPLACE FUNCTION public.protect_escrow_release()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Si on tente de mettre released sur une ligne déjà released → bloquer
  IF OLD.status = 'released' AND NEW.status = 'released' THEN
    RAISE EXCEPTION 'ESCROW_ALREADY_RELEASED: double release attempt blocked on order %', OLD.order_id;
  END IF;
  -- Si on passe à released alors que l'ancienne valeur était déjà released → bloquer
  IF OLD.status = 'released' AND NEW.status != OLD.status THEN
    RAISE EXCEPTION 'ESCROW_IMMUTABLE: cannot modify released escrow for order %', OLD.order_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_escrow_release ON public.escrow_transactions;
CREATE TRIGGER trg_protect_escrow_release
  BEFORE UPDATE ON public.escrow_transactions
  FOR EACH ROW EXECUTE FUNCTION public.protect_escrow_release();
