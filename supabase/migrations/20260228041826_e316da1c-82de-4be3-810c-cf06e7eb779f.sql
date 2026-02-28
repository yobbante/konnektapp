
-- 1. Unique constraint: prevent duplicate departures (same GP, same date, same route)
CREATE UNIQUE INDEX IF NOT EXISTS idx_gp_offers_unique_departure 
ON public.gp_offers (gp_id, departure_date, origin_city, destination_city) 
WHERE status = 'active';

-- 2. Trigger to decrement available_capacity when order is created
CREATE OR REPLACE FUNCTION public.decrement_offer_capacity_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only on new orders with an offer_id
  IF NEW.offer_id IS NOT NULL AND NEW.weight > 0 THEN
    UPDATE public.gp_offers
    SET available_capacity = GREATEST(0, available_capacity - NEW.weight),
        updated_at = now()
    WHERE id = NEW.offer_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_capacity_on_order ON public.orders;
CREATE TRIGGER trg_decrement_capacity_on_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_offer_capacity_on_order();

-- 3. Restore capacity when order is cancelled
CREATE OR REPLACE FUNCTION public.restore_offer_capacity_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.offer_id IS NOT NULL AND NEW.weight > 0 THEN
    UPDATE public.gp_offers
    SET available_capacity = LEAST(total_capacity, available_capacity + NEW.weight),
        updated_at = now()
    WHERE id = NEW.offer_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restore_capacity_on_cancel ON public.orders;
CREATE TRIGGER trg_restore_capacity_on_cancel
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_offer_capacity_on_cancel();
