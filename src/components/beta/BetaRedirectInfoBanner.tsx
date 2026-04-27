// Bandeau affiché sur /gp/apercu pour informer un transporteur beta non réclamé
// que son compte sera redirigé vers le mini-dashboard /t/dashboard jusqu'au lancement.
// Le bouton "Continuer" permet de rester temporairement sur /gp/apercu (le guard
// pourra de toute façon redéclencher la redirection après quelques secondes).
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const BETA_EMAIL_PATTERN = /^t\d+@konnekt\.beta$/i;

export function BetaRedirectInfoBanner() {
  const nav = useNavigate();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (cancelled || !u.user) return;
        const email = u.user.email || "";
        if (!BETA_EMAIL_PATTERN.test(email)) return;

        const { data: gp } = await supabase
          .from("gp_profiles")
          .select("beta_claimed_at")
          .eq("user_id", u.user.id)
          .maybeSingle();
        if (cancelled) return;
        if (gp?.beta_claimed_at) return;

        const { data: lock } = await supabase
          .from("app_lock_settings" as any)
          .select("is_locked, launch_at")
          .maybeSingle();
        if (cancelled || !lock) return;
        const cfg = lock as unknown as { is_locked: boolean; launch_at: string };
        const stillLocked =
          cfg.is_locked && new Date(cfg.launch_at).getTime() > Date.now();
        if (stillLocked) setShow(true);
      } catch {
        // silencieux
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!show || dismissed) return null;

  return (
    <div className="rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/10 to-transparent p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-secondary" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground">
          Compte beta — accès limité
        </h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Votre compte transporteur beta sera automatiquement redirigé vers
          votre mini-dashboard jusqu'au lancement officiel de la plateforme.
          Vous y retrouverez vos départs, demandes attribuées et paramètres.
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Button
            size="sm"
            className="h-8 rounded-full text-xs gap-1.5"
            onClick={() => nav("/t/dashboard")}
          >
            Aller au mini-dashboard
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 rounded-full text-xs text-muted-foreground"
            onClick={() => setDismissed(true)}
          >
            Continuer ici
          </Button>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground p-1"
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
