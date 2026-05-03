// Bannière affichée dans /t/dashboard pour les transporteurs beta non réclamés.
// Propose un CTA optionnel "Voir l'aperçu GP" qui pose un snooze pour la session
// afin que `useBetaRedirectGuard` ne re-redirige pas immédiatement vers /t/dashboard.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, ArrowUpRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { snoozeBetaRedirect } from "@/hooks/useBetaRedirectGuard";

const BETA_EMAIL_PATTERN = /^t\d+@konnekt\.beta$/i;

export function BetaApercuLinkBanner() {
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
        if (cancelled || gp?.beta_claimed_at) return;
        setShow(true);
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!show || dismissed) return null;

  const goApercu = () => {
    snoozeBetaRedirect();
    nav("/gp/apercu");
  };

  return (
    <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 to-transparent p-4 flex items-start gap-3 relative">
      <button
        onClick={() => setDismissed(true)}
        aria-label="Fermer"
        className="absolute top-2 right-2 h-7 w-7 rounded-full text-muted-foreground hover:text-foreground/85 hover:bg-foreground/5 flex items-center justify-center transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
        <Eye className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0 pr-6">
        <div className="text-sm font-semibold text-foreground">
          Curieux du dashboard GP complet ?
        </div>
        <p className="text-xs text-foreground/70 mt-0.5 leading-relaxed">
          Vous pouvez consulter l'aperçu de votre futur dashboard GP dès maintenant.
          Vous reviendrez automatiquement ici à la prochaine connexion.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={goApercu}
          className="mt-3 h-8 rounded-full text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
        >
          Voir l'aperçu GP
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
