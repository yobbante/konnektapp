-- Support multi-round routier negotiation history with hard cap of 3 counter-offers per side
CREATE TABLE public.mission_negotiation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id UUID NOT NULL REFERENCES public.mission_negotiations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'counter',
  offer_price NUMERIC NULL,
  message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mission_negotiation_events_negotiation_created_at
ON public.mission_negotiation_events (negotiation_id, created_at DESC);

ALTER TABLE public.mission_negotiation_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_mission_negotiation_participant(_negotiation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mission_negotiations mn
    JOIN public.routier_missions rm ON rm.id = mn.mission_id
    LEFT JOIN public.gp_profiles gp ON gp.id = mn.gp_id
    WHERE mn.id = _negotiation_id
      AND (
        rm.client_id = auth.uid()
        OR gp.user_id = auth.uid()
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.validate_mission_negotiation_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_gp_user_id UUID;
  v_existing_count INTEGER;
BEGIN
  SELECT rm.client_id, gp.user_id
  INTO v_client_id, v_gp_user_id
  FROM public.mission_negotiations mn
  JOIN public.routier_missions rm ON rm.id = mn.mission_id
  LEFT JOIN public.gp_profiles gp ON gp.id = mn.gp_id
  WHERE mn.id = NEW.negotiation_id;

  IF v_client_id IS NULL AND v_gp_user_id IS NULL THEN
    RAISE EXCEPTION 'NEGOTIATION_NOT_FOUND';
  END IF;

  NEW.sender_id := COALESCE(NEW.sender_id, auth.uid());

  IF NEW.sender_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'SENDER_MUST_MATCH_AUTH_USER';
  END IF;

  IF auth.uid() = v_client_id THEN
    IF NEW.sender_type <> 'client' THEN
      RAISE EXCEPTION 'INVALID_SENDER_TYPE_FOR_CLIENT';
    END IF;
  ELSIF auth.uid() = v_gp_user_id THEN
    IF NEW.sender_type <> 'gp' THEN
      RAISE EXCEPTION 'INVALID_SENDER_TYPE_FOR_GP';
    END IF;
  ELSE
    RAISE EXCEPTION 'NOT_NEGOTIATION_PARTICIPANT';
  END IF;

  IF NEW.event_type = 'counter' THEN
    SELECT COUNT(*)
    INTO v_existing_count
    FROM public.mission_negotiation_events
    WHERE negotiation_id = NEW.negotiation_id
      AND sender_type = NEW.sender_type
      AND event_type = 'counter';

    IF v_existing_count >= 3 THEN
      RAISE EXCEPTION 'NEGOTIATION_LIMIT_REACHED';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_mission_negotiation_event_trigger
BEFORE INSERT ON public.mission_negotiation_events
FOR EACH ROW
EXECUTE FUNCTION public.validate_mission_negotiation_event();

CREATE POLICY "Participants can view negotiation events"
ON public.mission_negotiation_events
FOR SELECT
TO authenticated
USING (public.is_mission_negotiation_participant(negotiation_id));

CREATE POLICY "Participants can create negotiation events"
ON public.mission_negotiation_events
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_mission_negotiation_participant(negotiation_id)
  AND sender_id = auth.uid()
);
