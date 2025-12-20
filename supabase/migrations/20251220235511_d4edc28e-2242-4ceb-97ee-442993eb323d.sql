-- =====================================================
-- TRIGGER IDEMPOTENT - Création wallet GP
-- Vérifie si le wallet existe avant d'insérer
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_gp_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Vérifier si un wallet existe déjà pour ce GP
  IF NOT EXISTS (SELECT 1 FROM public.gp_wallets WHERE gp_id = NEW.id) THEN
    INSERT INTO public.gp_wallets (gp_id)
    VALUES (NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- S'assurer que le trigger existe (recréer proprement)
DROP TRIGGER IF EXISTS on_gp_profile_created ON public.gp_profiles;
CREATE TRIGGER on_gp_profile_created
  AFTER INSERT ON public.gp_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_gp_wallet();