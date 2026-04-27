// Redirige automatiquement les transporteurs beta non réclamés depuis /gp/apercu
// vers leur mini-dashboard /t/dashboard, tant que la plateforme n'est pas lancée.
//
// Anti-loop : 2 vérifications consécutives positives requises avant redirection,
// cooldown 60s côté session pour éviter les bascules en boucle si /t/dashboard
// se trouve aussi à rediriger en sens inverse en cas de latence réseau.
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const BETA_EMAIL_PATTERN = /^t\d+@konnekt\.beta$/i;
const REDIRECT_COOLDOWN_MS = 60_000;

export function useBetaRedirectGuard() {
  const nav = useNavigate();
  const confirmRef = useRef(0);
  const lastRedirectAtRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const safeRedirect = () => {
      const now = Date.now();
      const lastClient = (() => {
        try {
          return Number(sessionStorage.getItem("kkt_beta_back_redirect_at") || "0");
        } catch {
          return 0;
        }
      })();
      if (now - lastRedirectAtRef.current < REDIRECT_COOLDOWN_MS) return;
      if (now - lastClient < REDIRECT_COOLDOWN_MS) return;
      lastRedirectAtRef.current = now;
      try {
        sessionStorage.setItem("kkt_beta_back_redirect_at", String(now));
      } catch {}
      nav("/t/dashboard", { replace: true });
    };

    const check = async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (cancelled || !u.user) return;

        const email = u.user.email || "";
        const isBetaEmail = BETA_EMAIL_PATTERN.test(email);
        if (!isBetaEmail) return; // Compte normal : ne jamais rediriger

        // Vérifier que le compte n'est pas déjà réclamé
        const { data: gp } = await supabase
          .from("gp_profiles")
          .select("beta_claimed_at")
          .eq("user_id", u.user.id)
          .maybeSingle();
        if (cancelled) return;
        if (gp?.beta_claimed_at) return; // Compte réclamé → accès complet GP

        // Vérifier que la plateforme est encore verrouillée
        const { data: lock } = await supabase
          .from("app_lock_settings" as any)
          .select("is_locked, launch_at")
          .maybeSingle();
        if (cancelled) return;
        if (!lock) {
          confirmRef.current = 0;
          return;
        }
        const cfg = lock as unknown as { is_locked: boolean; launch_at: string };
        const stillLocked =
          cfg.is_locked && new Date(cfg.launch_at).getTime() > Date.now();

        if (stillLocked) {
          confirmRef.current += 1;
          if (confirmRef.current >= 2) safeRedirect();
        } else {
          confirmRef.current = 0;
        }
      } catch {
        confirmRef.current = 0;
      }
    };

    void check();
    const id = window.setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [nav]);
}
