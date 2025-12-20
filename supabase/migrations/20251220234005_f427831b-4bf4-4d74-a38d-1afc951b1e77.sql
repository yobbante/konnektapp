-- Le trigger create_gp_wallet doit être SECURITY DEFINER pour pouvoir 
-- insérer dans gp_wallets lors de la création d'un gp_profile
-- tout en gardant la politique restrictive pour les insertions directes

-- Recréer la fonction avec SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.create_gp_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.gp_wallets (gp_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- S'assurer que le trigger existe
DROP TRIGGER IF EXISTS on_gp_profile_created ON public.gp_profiles;
CREATE TRIGGER on_gp_profile_created
  AFTER INSERT ON public.gp_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_gp_wallet();