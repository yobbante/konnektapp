// Force le passage par /t/dashboard pour les transporteurs beta non réclamés.
// Le "blocage" (verrouillage dur) est désactivé, mais on conserve la redirection
// vers le mini-dashboard tant que le compte beta n'a pas été réclamé ET que la
// plateforme est encore verrouillée (pré-lancement).
//
// L'utilisateur peut revenir manuellement sur /gp/apercu via le bouton "Voir
// l'aperçu GP" présent dans /t/dashboard. La redirection se redéclenche alors
// uniquement au prochain montage de /gp/apercu, sans forcer en boucle (un flag
// session permet de "snoozer" la redirection pendant la session courante).
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const BETA_EMAIL_PATTERN = /^t\d+@konnekt\.beta$/i;
const SNOOZE_KEY = "kkt_beta_redirect_snoozed";

export function snoozeBetaRedirect() {
  try { sessionStorage.setItem(SNOOZE_KEY, "1"); } catch { /* noop */ }
}

export function useBetaRedirectGuard() {
  const nav = useNavigate();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Snooze actif pour la session : laisser l'utilisateur sur /gp/apercu
        if (sessionStorage.getItem(SNOOZE_KEY) === "1") return;

        const { data: u } = await supabase.auth.getUser();
        if (cancelled || !u.user) return;

        // Critère 1 : email beta synthétique
        const email = u.user.email || "";
        if (!BETA_EMAIL_PATTERN.test(email)) return;

        // Critère 2 : profil GP non réclamé
        const { data: gp } = await supabase
          .from("gp_profiles")
          .select("beta_claimed_at")
          .eq("user_id", u.user.id)
          .maybeSingle();
        if (cancelled || gp?.beta_claimed_at) return;

        // Critère 3 : plateforme encore verrouillée (pré-lancement)
        const { data: lock } = await supabase
          .from("app_lock_settings" as any)
          .select("is_locked, launch_at")
          .maybeSingle();
        if (cancelled || !lock) return;
        const cfg = lock as unknown as { is_locked: boolean; launch_at: string };
        const stillLocked =
          cfg.is_locked && new Date(cfg.launch_at).getTime() > Date.now();
        if (!stillLocked) return;

        nav("/t/dashboard", { replace: true });
      } catch {
        // silencieux
      }
    })();

    return () => { cancelled = true; };
  }, [nav]);
}
