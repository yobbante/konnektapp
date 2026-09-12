CREATE TABLE public.external_partners (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), app_source public.app_source NOT NULL UNIQUE, name text NOT NULL, is_active boolean NOT NULL DEFAULT false, allowed_endpoints text[] NOT NULL DEFAULT '{}', rate_limit_per_min integer NOT NULL DEFAULT 60 CHECK(rate_limit_per_min > 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.external_partners TO authenticated;
GRANT ALL ON public.external_partners TO service_role;
ALTER TABLE public.external_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY external_partners_admin_read ON public.external_partners FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE TRIGGER external_partners_updated BEFORE UPDATE ON public.external_partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.partner_api_keys (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), partner_id uuid NOT NULL REFERENCES public.external_partners(id), key_hash text NOT NULL UNIQUE CHECK(key_hash ~ '^[a-f0-9]{64}$'), revoked_at timestamptz, expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.partner_api_keys TO service_role;
ALTER TABLE public.partner_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY partner_keys_server_only ON public.partner_api_keys FOR ALL TO service_role USING(true) WITH CHECK(true);
CREATE TRIGGER partner_api_keys_updated BEFORE UPDATE ON public.partner_api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.partner_webhooks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), partner_id uuid NOT NULL REFERENCES public.external_partners(id), endpoint_url text NOT NULL CHECK(endpoint_url LIKE 'https://%'), event_types text[] NOT NULL DEFAULT '{}', is_active boolean NOT NULL DEFAULT false, signing_secret_reference text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.partner_webhooks TO service_role;
ALTER TABLE public.partner_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY partner_webhooks_server_only ON public.partner_webhooks FOR ALL TO service_role USING(true) WITH CHECK(true);
CREATE TRIGGER partner_webhooks_updated BEFORE UPDATE ON public.partner_webhooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TABLE public.audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entity_type text NOT NULL, entity_id uuid NOT NULL, event_type text NOT NULL, actor_id uuid, payload jsonb NOT NULL DEFAULT '{}', source_table text, source_id uuid, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(source_table,source_id)
);
GRANT SELECT ON public.audit_events TO authenticated;
GRANT SELECT,INSERT ON public.audit_events TO service_role;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_events_admin_read ON public.audit_events FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE INDEX audit_events_entity_idx ON public.audit_events(entity_type,entity_id,created_at DESC);
CREATE FUNCTION public.capture_backend_status_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  INSERT INTO public.audit_events(entity_type,entity_id,event_type,actor_id,payload) VALUES(TG_TABLE_NAME,NEW.id,'created',auth.uid(),jsonb_build_object('status',to_jsonb(NEW)->>'status'));
 ELSIF (to_jsonb(OLD)->>'status') IS DISTINCT FROM (to_jsonb(NEW)->>'status') THEN
  INSERT INTO public.audit_events(entity_type,entity_id,event_type,actor_id,payload) VALUES(TG_TABLE_NAME,NEW.id,'status_changed',auth.uid(),jsonb_build_object('old_status',to_jsonb(OLD)->>'status','new_status',to_jsonb(NEW)->>'status'));
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.capture_backend_status_event() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER orders_unified_audit AFTER INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.capture_backend_status_event();
CREATE TRIGGER disputes_unified_audit AFTER INSERT OR UPDATE OF status ON public.disputes FOR EACH ROW EXECUTE FUNCTION public.capture_backend_status_event();