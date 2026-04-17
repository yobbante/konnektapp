-- 1. Enum app_source
DO $$ BEGIN
  CREATE TYPE public.app_source AS ENUM ('konnekt', 'yobbante', 'autre');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Ajouter la colonne app_source sur les tables clés (non destructif, défaut = konnekt)
ALTER TABLE public.orders               ADD COLUMN IF NOT EXISTS app_source public.app_source NOT NULL DEFAULT 'konnekt';
ALTER TABLE public.profiles             ADD COLUMN IF NOT EXISTS app_source public.app_source NOT NULL DEFAULT 'konnekt';
ALTER TABLE public.custom_requests      ADD COLUMN IF NOT EXISTS app_source public.app_source NOT NULL DEFAULT 'konnekt';
ALTER TABLE public.freight_requests     ADD COLUMN IF NOT EXISTS app_source public.app_source NOT NULL DEFAULT 'konnekt';
ALTER TABLE public.escrow_transactions  ADD COLUMN IF NOT EXISTS app_source public.app_source NOT NULL DEFAULT 'konnekt';
ALTER TABLE public.routier_missions     ADD COLUMN IF NOT EXISTS app_source public.app_source NOT NULL DEFAULT 'konnekt';
ALTER TABLE public.mobility_bookings    ADD COLUMN IF NOT EXISTS app_source public.app_source NOT NULL DEFAULT 'konnekt';

CREATE INDEX IF NOT EXISTS idx_orders_app_source           ON public.orders(app_source);
CREATE INDEX IF NOT EXISTS idx_custom_requests_app_source  ON public.custom_requests(app_source);
CREATE INDEX IF NOT EXISTS idx_freight_requests_app_source ON public.freight_requests(app_source);
CREATE INDEX IF NOT EXISTS idx_routier_missions_app_source ON public.routier_missions(app_source);

-- 3. RPC: calculate_price (estimation simple, réutilisable par toutes les apps)
CREATE OR REPLACE FUNCTION public.calculate_price(
  p_type     text,             -- 'ride' | 'shipment' | 'freight'
  p_distance numeric DEFAULT 0,
  p_weight   numeric DEFAULT 0,
  p_currency text    DEFAULT 'XOF'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base       numeric := 0;
  v_per_km     numeric := 0;
  v_per_kg     numeric := 0;
  v_subtotal   numeric;
  v_commission numeric;
  v_total      numeric;
BEGIN
  CASE lower(p_type)
    WHEN 'ride' THEN
      v_base := 500;  v_per_km := 250; v_per_kg := 0;
    WHEN 'shipment' THEN
      v_base := 1000; v_per_km := 50;  v_per_kg := 800;
    WHEN 'freight' THEN
      v_base := 5000; v_per_km := 80;  v_per_kg := 200;
    ELSE
      v_base := 1000; v_per_km := 100; v_per_kg := 500;
  END CASE;

  v_subtotal   := v_base + (COALESCE(p_distance,0) * v_per_km) + (COALESCE(p_weight,0) * v_per_kg);
  v_commission := ROUND(v_subtotal * 0.05);
  v_total      := v_subtotal + v_commission;

  RETURN jsonb_build_object(
    'type', p_type,
    'currency', p_currency,
    'base_fee', v_base,
    'distance_fee', COALESCE(p_distance,0) * v_per_km,
    'weight_fee', COALESCE(p_weight,0) * v_per_kg,
    'subtotal', v_subtotal,
    'commission', v_commission,
    'total', v_total
  );
END;
$$;

-- 4. RPC: create_shipment (utilise custom_requests existant)
CREATE OR REPLACE FUNCTION public.create_shipment(
  p_origin_city          text,
  p_destination_city     text,
  p_description          text,
  p_weight_estimate      numeric DEFAULT NULL,
  p_origin_country       text    DEFAULT 'SN',
  p_destination_country  text    DEFAULT 'SN',
  p_shipment_type        text    DEFAULT 'standard',
  p_app_source           public.app_source DEFAULT 'konnekt'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_request_id uuid;
  v_request_number text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  v_request_number := 'REQ-' || to_char(now(),'YYYYMMDD') || '-' || lpad(floor(random()*10000)::text,4,'0');

  INSERT INTO public.custom_requests(
    client_id, origin_city, origin_country, destination_city, destination_country,
    description, weight_estimate, shipment_type, request_number, app_source, status
  ) VALUES (
    v_user_id, p_origin_city, p_origin_country, p_destination_city, p_destination_country,
    p_description, p_weight_estimate, p_shipment_type, v_request_number, p_app_source, 'open'
  )
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object(
    'id', v_request_id,
    'request_number', v_request_number,
    'status', 'open',
    'app_source', p_app_source
  );
END;
$$;

-- 5. RPC: get_user_activity (agrégation cross-domaine, scoped à l'utilisateur appelant)
CREATE OR REPLACE FUNCTION public.get_user_activity(
  p_user_id    uuid DEFAULT NULL,
  p_app_source public.app_source DEFAULT NULL,
  p_limit      integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_target uuid := COALESCE(p_user_id, v_caller);
  v_orders   jsonb;
  v_requests jsonb;
  v_missions jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;
  -- Un utilisateur ne peut voir que sa propre activité (sauf admin)
  IF v_target <> v_caller AND NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(o.*) ORDER BY o.created_at DESC), '[]'::jsonb)
  INTO v_orders
  FROM (
    SELECT id, order_number, status, total_price, currency, origin_city, destination_city, app_source, created_at
    FROM public.orders
    WHERE client_id = v_target
      AND (p_app_source IS NULL OR app_source = p_app_source)
    ORDER BY created_at DESC
    LIMIT p_limit
  ) o;

  SELECT COALESCE(jsonb_agg(to_jsonb(r.*) ORDER BY r.created_at DESC), '[]'::jsonb)
  INTO v_requests
  FROM (
    SELECT id, request_number, status, origin_city, destination_city, app_source, created_at
    FROM public.custom_requests
    WHERE client_id = v_target
      AND (p_app_source IS NULL OR app_source = p_app_source)
    ORDER BY created_at DESC
    LIMIT p_limit
  ) r;

  SELECT COALESCE(jsonb_agg(to_jsonb(m.*) ORDER BY m.created_at DESC), '[]'::jsonb)
  INTO v_missions
  FROM (
    SELECT id, mission_number, status, origin_city, destination_city, app_source, created_at
    FROM public.routier_missions
    WHERE client_id = v_target
      AND (p_app_source IS NULL OR app_source = p_app_source)
    ORDER BY created_at DESC
    LIMIT p_limit
  ) m;

  RETURN jsonb_build_object(
    'user_id', v_target,
    'app_source_filter', p_app_source,
    'orders', v_orders,
    'shipment_requests', v_requests,
    'routier_missions', v_missions
  );
END;
$$;

-- 6. RPC: update_entity_status (sécurisé, vérifie ownership)
CREATE OR REPLACE FUNCTION public.update_entity_status(
  p_entity_type text,   -- 'order' | 'routier_mission' | 'custom_request'
  p_entity_id   uuid,
  p_new_status  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_owner uuid;
  v_gp_owner uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  CASE lower(p_entity_type)
    WHEN 'order' THEN
      SELECT o.client_id, gp.user_id
      INTO v_owner, v_gp_owner
      FROM public.orders o
      LEFT JOIN public.gp_profiles gp ON gp.id = o.gp_id
      WHERE o.id = p_entity_id;
      IF v_owner IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
      IF v_user <> v_owner AND v_user <> v_gp_owner AND NOT public.has_role(v_user,'admin') THEN
        RAISE EXCEPTION 'FORBIDDEN';
      END IF;
      UPDATE public.orders SET status = p_new_status::order_status, updated_at = now() WHERE id = p_entity_id;

    WHEN 'routier_mission' THEN
      SELECT client_id INTO v_owner FROM public.routier_missions WHERE id = p_entity_id;
      IF v_owner IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
      IF v_user <> v_owner AND NOT public.has_role(v_user,'admin') THEN
        RAISE EXCEPTION 'FORBIDDEN';
      END IF;
      UPDATE public.routier_missions SET status = p_new_status, updated_at = now() WHERE id = p_entity_id;

    WHEN 'custom_request' THEN
      SELECT client_id INTO v_owner FROM public.custom_requests WHERE id = p_entity_id;
      IF v_owner IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
      IF v_user <> v_owner AND NOT public.has_role(v_user,'admin') THEN
        RAISE EXCEPTION 'FORBIDDEN';
      END IF;
      UPDATE public.custom_requests SET status = p_new_status, updated_at = now() WHERE id = p_entity_id;

    ELSE
      RAISE EXCEPTION 'INVALID_ENTITY_TYPE: %', p_entity_type;
  END CASE;

  RETURN jsonb_build_object('entity_type', p_entity_type, 'entity_id', p_entity_id, 'new_status', p_new_status);
END;
$$;

-- 7. Permissions (clients authentifiés peuvent appeler)
GRANT EXECUTE ON FUNCTION public.calculate_price(text,numeric,numeric,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_shipment(text,text,text,numeric,text,text,text,public.app_source) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_activity(uuid,public.app_source,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_entity_status(text,uuid,text) TO authenticated;