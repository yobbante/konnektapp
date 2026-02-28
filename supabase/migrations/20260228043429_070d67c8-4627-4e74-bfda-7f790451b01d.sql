
-- Update KTP trust score when a review is submitted
-- Satisfaction client pillar = 10% of trust score
CREATE OR REPLACE FUNCTION public.update_ktp_on_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_avg_rating NUMERIC;
  v_current_score INTEGER;
  v_satisfaction_component INTEGER;
  v_new_score INTEGER;
  v_new_level TEXT;
BEGIN
  -- Calculate average rating for this GP
  SELECT COALESCE(AVG(rating), 3) INTO v_avg_rating
  FROM reviews WHERE gp_id = NEW.gp_id;

  -- Satisfaction component: maps 1-5 stars to 0-10 points (10% of total 100)
  v_satisfaction_component := ROUND((v_avg_rating / 5.0) * 10);

  -- Get current trust score
  SELECT trust_score INTO v_current_score
  FROM ktp_status WHERE gp_id = NEW.gp_id;

  IF v_current_score IS NULL THEN
    RETURN NEW;
  END IF;

  -- Recalculate: replace the satisfaction portion (10%) of the score
  -- We adjust by removing old satisfaction and adding new
  -- Simple approach: nudge score toward satisfaction reflection
  v_new_score := LEAST(100, GREATEST(0,
    v_current_score + (v_satisfaction_component - ROUND(v_current_score * 0.10))
  ));

  v_new_level := public.evaluate_ktp_level(v_new_score);

  UPDATE ktp_status
  SET trust_score = v_new_score,
      ktp_level = v_new_level,
      last_evaluated_at = now(),
      updated_at = now()
  WHERE gp_id = NEW.gp_id;

  RETURN NEW;
END;
$$;

-- Trigger after review insert
DROP TRIGGER IF EXISTS trg_update_ktp_on_review ON public.reviews;
CREATE TRIGGER trg_update_ktp_on_review
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ktp_on_review();
