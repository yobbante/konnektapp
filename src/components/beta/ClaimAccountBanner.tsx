// Bannière persistante affichée dans /t/dashboard tant que le transporteur beta
// n'a pas réclamé son compte avec un vrai email + mot de passe ou Google.
// Le compte beta est créé par l'edge function avec un email synthétique
// `t{phone}@konnekt.beta` — on détecte ce pattern pour savoir si réclamation requise.
//
// Server-side guarantees via the `claim-beta-account` edge function:
//   - Email uniqueness across GP profiles
//   - Idempotent: once claimed, banner never shows again (even after refresh)
//
// Analytics: dismiss · click_google · click_email · claim_success · claim_error · password_reset_sent
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Mail, Loader2, CheckCircle2, X, ChevronRight, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const BETA_EMAIL_SUFFIX = "@konnekt.beta";
const DISMISS_KEY = "kkt_claim_dismissed_at";
const REMIND_AFTER_MS = 24 * 60 * 60 * 1000;

type Mode = "choose" | "email" | "reset";

function getSessionId() {
  try {
    let id = localStorage.getItem("kkt_beta_sid");
    if (!id) {
      id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("kkt_beta_sid", id);
    }
    return id;
  } catch { return `s_${Date.now()}`; }
}

function track(event_type: string, extra: Record<string, any> = {}) {
  void supabase.from("beta_tracking_events" as any).insert({
    event_type,
    session_id: getSessionId(),
    metadata: { surface: "claim_banner", ...extra },
  } as any);
}

export function ClaimAccountBanner() {
  const [needsClaim, setNeedsClaim] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dismissedAt, setDismissedAt] = useState<number>(() => {
    try { return Number(localStorage.getItem(DISMISS_KEY) || "0"); } catch { return 0; }
  });

  // Detect whether the current user still needs to claim their beta account.
  // Authoritative source: gp_profiles.beta_claimed_at (server-side flag).
  // Fallback: email pattern (covers users without a profile yet).
  const refreshClaimStatus = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    if (!u) { setNeedsClaim(false); return; }
    const isBetaEmail = !!u.email?.endsWith(BETA_EMAIL_SUFFIX);

    const { data: gp } = await supabase
      .from("gp_profiles")
      .select("beta_claimed_at")
      .eq("user_id", u.id)
      .maybeSingle();

    const alreadyClaimed = !!(gp as any)?.beta_claimed_at;
    setNeedsClaim(isBetaEmail && !alreadyClaimed);
  }, []);

  useEffect(() => {
    void refreshClaimStatus();
    // Re-check on auth changes (after Google OAuth callback / updateUser)
    const { data: sub } = supabase.auth.onAuthStateChange(() => { void refreshClaimStatus(); });
    return () => { sub.subscription.unsubscribe(); };
  }, [refreshClaimStatus]);

  // After Google sign-in callback returns to /t/dashboard the user has a real
  // email — call the edge function to link & flag the profile as claimed.
  useEffect(() => {
    if (!needsClaim) return;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (!email || email.endsWith(BETA_EMAIL_SUFFIX)) return;
      // User has real email but profile isn't flagged yet → finalize claim
      try {
        const { data: res, error } = await supabase.functions.invoke("claim-beta-account", { body: {} });
        if (!error && (res as any)?.claimed) {
          track("claim_success", { method: "auto_link", email });
          setNeedsClaim(false);
        }
      } catch { /* silent — user will still see the banner */ }
    })();
  }, [needsClaim]);

  const visible = needsClaim && (Date.now() - dismissedAt > REMIND_AFTER_MS);
  if (!visible) return null;

  const dismiss = () => {
    track("dismiss");
    const now = Date.now();
    try { localStorage.setItem(DISMISS_KEY, String(now)); } catch {}
    setDismissedAt(now);
  };

  const finalizeClaim = async (method: string): Promise<boolean> => {
    try {
      const { data: res, error } = await supabase.functions.invoke("claim-beta-account", { body: {} });
      if (error) throw new Error(error.message);
      if ((res as any)?.error) {
        const code = (res as any).code;
        if (code === "EMAIL_ALREADY_CLAIMED") {
          track("claim_error", { method, code });
          toast.error("Email déjà utilisé", {
            description: "Cet email est lié à un autre compte transporteur.",
          });
          return false;
        }
        throw new Error((res as any).error);
      }
      track("claim_success", { method });
      toast.success("Compte sécurisé", { description: "Votre historique est maintenant relié à votre nouveau compte." });
      setNeedsClaim(false);
      setOpen(false);
      return true;
    } catch (e: any) {
      track("claim_error", { method, error: e?.message });
      toast.error("Réclamation impossible", { description: e?.message || "Réessayez dans un instant." });
      return false;
    }
  };

  const handleGoogle = async () => {
    track("click_google");
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/t/dashboard` },
      });
      if (error) throw error;
      // Page redirects → finalize on return via the auto-link useEffect above
    } catch (e: any) {
      track("claim_error", { method: "google", error: e?.message });
      toast.error("Google indisponible", { description: e?.message || "Réessayez dans un instant." });
      setSubmitting(false);
    }
  };

  const handleEmailClaim = async () => {
    if (!email.includes("@") || password.length < 8) {
      toast.error("Email valide et mot de passe ≥ 8 caractères requis");
      return;
    }
    track("click_email");
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim(), password });
      if (error) throw error;
      // Edge function does the server-side uniqueness check + linking
      const ok = await finalizeClaim("email");
      if (ok) {
        toast.message("Vérifiez votre boîte mail", {
          description: "Un lien de confirmation vient d'être envoyé à votre nouvelle adresse.",
        });
      }
    } catch (e: any) {
      track("claim_error", { method: "email", error: e?.message });
      toast.error("Impossible de mettre à jour", { description: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail.includes("@")) {
      toast.error("Email valide requis");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      track("password_reset_sent", { email: resetEmail.trim() });
      toast.success("Email envoyé", {
        description: "Suivez le lien reçu pour définir un nouveau mot de passe.",
      });
      setMode("choose");
      setResetEmail("");
    } catch (e: any) {
      toast.error("Envoi impossible", { description: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-secondary/40 bg-gradient-to-br from-secondary/15 via-secondary/5 to-transparent p-4 relative overflow-hidden"
    >
      <button
        onClick={dismiss}
        aria-label="Plus tard"
        className="absolute top-2 right-2 h-7 w-7 rounded-full text-muted-foreground hover:text-foreground/85 hover:bg-foreground/5 flex items-center justify-center transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-secondary/20 border border-secondary/40 flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4 text-secondary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">Sécurisez votre compte</div>
          <p className="text-xs text-foreground/75 mt-0.5 leading-relaxed">
            Votre historique sera transféré sur votre dashboard GP complet à l'ouverture officielle.
          </p>

          <AnimatePresence mode="wait">
            {!open ? (
              <motion.div key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3">
                <Button
                  size="sm"
                  onClick={() => setOpen(true)}
                  className="h-9 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 text-xs font-semibold"
                >
                  Réclamer mon compte
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-2.5 overflow-hidden"
              >
                {mode === "choose" && (
                  <>
                    <Button
                      onClick={handleGoogle}
                      disabled={submitting}
                      className="w-full h-10 rounded-xl bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold gap-2"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
                      Continuer avec Google
                    </Button>
                    <Button
                      onClick={() => setMode("email")}
                      variant="outline"
                      className="w-full h-10 rounded-xl border-foreground/15 hover:bg-foreground/5 text-xs font-semibold gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      Utiliser un email
                    </Button>
                  </>
                )}

                {mode === "email" && (
                  <div className="space-y-2.5">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Email</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="vous@exemple.com"
                        className="h-10 rounded-xl bg-foreground/8 border-foreground/10 mt-1"
                        autoComplete="email"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Mot de passe (≥ 8 caractères)</Label>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-10 rounded-xl bg-foreground/8 border-foreground/10 mt-1"
                        autoComplete="new-password"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setMode("reset")}
                      className="text-[11px] text-secondary hover:text-secondary/80 inline-flex items-center gap-1"
                    >
                      <KeyRound className="w-3 h-3" /> Mot de passe oublié ?
                    </button>
                    <div className="flex gap-2">
                      <Button onClick={() => setMode("choose")} variant="ghost" size="sm" className="h-9 text-xs text-foreground/75">
                        Retour
                      </Button>
                      <Button
                        onClick={handleEmailClaim}
                        disabled={submitting}
                        size="sm"
                        className="flex-1 h-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Sécuriser</>}
                      </Button>
                    </div>
                  </div>
                )}

                {mode === "reset" && (
                  <div className="space-y-2.5">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Email du compte</Label>
                      <Input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="vous@exemple.com"
                        className="h-10 rounded-xl bg-foreground/8 border-foreground/10 mt-1"
                        autoComplete="email"
                      />
                      <p className="text-[10px] text-foreground/40 mt-1.5 leading-relaxed">
                        Vous recevrez un lien pour définir un nouveau mot de passe.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setMode("email")} variant="ghost" size="sm" className="h-9 text-xs text-foreground/75">
                        Retour
                      </Button>
                      <Button
                        onClick={handlePasswordReset}
                        disabled={submitting}
                        size="sm"
                        className="flex-1 h-9 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 text-xs font-semibold"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-3.5 h-3.5 mr-1" /> Envoyer le lien</>}
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.5 29.3 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.5 29.3 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.1z"/>
      <path fill="#4CAF50" d="M24 43.5c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.3-7.2 2.3-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 38.9 16.3 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C40.8 36.2 43.5 30.5 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
