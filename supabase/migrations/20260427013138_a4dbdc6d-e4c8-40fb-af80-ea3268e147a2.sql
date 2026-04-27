-- shipments: tracked Konnekt shipments
CREATE TABLE public.shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  konnekt_external_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'created',
  carrier TEXT,
  origin_city TEXT,
  destination_city TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_event_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shipments_external_id ON public.shipments(konnekt_external_id);
CREATE INDEX idx_shipments_status ON public.shipments(status);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view shipments"
ON public.shipments FOR SELECT
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can manage shipments"
ON public.shipments FOR ALL
USING (public.has_admin_access(auth.uid()))
WITH CHECK (public.has_admin_access(auth.uid()));

CREATE TRIGGER update_shipments_updated_at
BEFORE UPDATE ON public.shipments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- timeline_events: ordered tracking events per shipment
CREATE TABLE public.timeline_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  status TEXT,
  source TEXT NOT NULL DEFAULT 'konnekt',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_timeline_events_shipment ON public.timeline_events(shipment_id, occurred_at DESC);
CREATE INDEX idx_timeline_events_type ON public.timeline_events(event_type);

ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view timeline events"
ON public.timeline_events FOR SELECT
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can manage timeline events"
ON public.timeline_events FOR ALL
USING (public.has_admin_access(auth.uid()))
WITH CHECK (public.has_admin_access(auth.uid()));

-- Enable realtime
ALTER TABLE public.shipments REPLICA IDENTITY FULL;
ALTER TABLE public.timeline_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.timeline_events;