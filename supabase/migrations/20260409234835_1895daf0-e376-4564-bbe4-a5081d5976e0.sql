-- Sync gp_wallets.currency with gp_profiles.default_currency
UPDATE public.gp_wallets gw
SET currency = CASE 
  WHEN gp.default_currency = 'XOF' THEN 'XOF'
  WHEN gp.default_currency = 'EUR' THEN 'EUR'
  WHEN gp.default_currency = 'USD' THEN 'USD'
  WHEN gp.default_currency = 'GBP' THEN 'GBP'
  WHEN gp.default_currency = 'XAF' THEN 'XAF'
  ELSE COALESCE(gp.default_currency, 'XOF')
END
FROM public.gp_profiles gp
WHERE gw.gp_id = gp.id;

-- Create trigger to auto-sync gp_wallets.currency when gp_profiles.default_currency changes
CREATE OR REPLACE FUNCTION public.sync_gp_wallet_currency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.default_currency IS DISTINCT FROM NEW.default_currency AND NEW.default_currency IS NOT NULL THEN
    UPDATE public.gp_wallets
    SET currency = NEW.default_currency, updated_at = now()
    WHERE gp_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_gp_wallet_currency ON public.gp_profiles;
CREATE TRIGGER trg_sync_gp_wallet_currency
  AFTER UPDATE OF default_currency ON public.gp_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_gp_wallet_currency();

-- Also ensure new gp_wallets inherit the correct currency
CREATE OR REPLACE FUNCTION public.set_gp_wallet_currency_on_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_currency TEXT;
BEGIN
  SELECT default_currency INTO v_currency FROM public.gp_profiles WHERE id = NEW.gp_id;
  IF v_currency IS NOT NULL AND v_currency != '' THEN
    NEW.currency := v_currency;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_gp_wallet_currency ON public.gp_wallets;
CREATE TRIGGER trg_set_gp_wallet_currency
  BEFORE INSERT ON public.gp_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_gp_wallet_currency_on_create();