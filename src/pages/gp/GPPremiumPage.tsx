/**
 * GPPremiumPage — Dedicated pricing page for GP Premium subscription
 * Inspired by Lovable pricing: clean cards, feature lists, clear CTAs
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown, Zap, Star, TrendingUp, BarChart3, Eye, Percent,
  CheckCircle2, Bell, Package, Rocket, Shield, ArrowLeft,
  Loader2, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useGPProfile } from "@/hooks/useGPProfile";
import { isGPPremium } from "@/lib/premiumGating";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STANDARD_FEATURES = [
  "Publier des trajets",
  "Recevoir des demandes",
  "Accepter manuellement",
  "Visibilité standard",
  "Réservations fermées 24h avant départ",
  "Portefeuille basique",
];

const PREMIUM_FEATURES = [
  { label: "Tout Standard, plus :", highlight: false, separator: true },
  { label: "Réservations clients jusqu'à 12h avant départ", highlight: true },
  { label: "Heure de départ précise sur vos voyages", highlight: true },
  { label: "Priorité dans les résultats de recherche", highlight: true },
  { label: "Auto-acceptation des commandes", highlight: true },
  { label: "Dashboard performances avancé", highlight: true },
  { label: "Badge Premium visible par les clients", highlight: true },
  { label: "Statistiques revenus détaillées", highlight: false },
  { label: "Notifications prioritaires", highlight: false },
];

const PRO_FEATURES = [
  { label: "Tout Premium, plus :", separator: true },
  { label: "Réservations clients jusqu'à 4h avant départ", highlight: true },
  { label: "Visibilité maximale + boost auto" },
  { label: "Commission réduite de 40%" },
  { label: "Analytics avancés" },
  { label: "Support prioritaire dédié" },
];

type FlowStep = "plans" | "confirm" | "processing" | "success";

export default function GPPremiumPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { gpProfile, loading } = useGPProfile();
  const [step, setStep] = useState<FlowStep>("plans");
  const [upgrading, setUpgrading] = useState(false);
  const [downgrading, setDowngrading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"premium" | "pro">("premium");

  if (loading) return <PageLoader message="Chargement..." />;
  if (!gpProfile) return null;

  const currentSub = (gpProfile as any).subscription || "free";
  const isPremium = isGPPremium(currentSub);
  const isPro = currentSub === "pro";

  const handleConfirmUpgrade = async () => {
    setStep("processing");
    setUpgrading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const { error } = await supabase
        .from("gp_profiles")
        .update({ subscription: selectedPlan as any, auto_accept_enabled: true })
        .eq("id", gpProfile.id);
      if (error) throw error;
      setStep("success");
      setTimeout(() => {
        window.location.href = "/gp/apercu";
      }, 2500);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
      setStep("plans");
    } finally {
      setUpgrading(false);
    }
  };

  const handleDowngrade = async (targetPlan: "free" | "premium" = "free") => {
    setDowngrading(true);
    try {
      const { error } = await supabase
        .from("gp_profiles")
        .update({ 
          subscription: targetPlan as any, 
          auto_accept_enabled: targetPlan === "premium" 
        })
        .eq("id", gpProfile.id);
      if (error) throw error;
      const label = targetPlan === "free" ? "Standard" : "Premium";
      toast({ title: "Plan modifié", description: `Vous êtes passé au plan ${label}.` });
      setTimeout(() => { window.location.href = "/gp/apercu"; }, 1200);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setDowngrading(false);
    }
  };

  // ── SUCCESS SCREEN ──
  if (step === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 max-w-sm"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/15 flex items-center justify-center mx-auto"
          >
            <CheckCircle2 className="w-10 h-10 text-amber-500" />
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold">🎉 Bienvenue {selectedPlan === "pro" ? "Pro" : "Premium"} !</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Votre compte a été mis à niveau. Profitez de tous les avantages {selectedPlan === "pro" ? "Pro" : "Premium"}.
            </p>
          </div>
          <Badge className="bg-amber-500 text-white border-none gap-1.5 text-sm px-4 py-1.5">
            <Crown className="w-4 h-4" /> GP {selectedPlan === "pro" ? "Pro" : "Premium"}
          </Badge>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "70%" }}
            transition={{ duration: 2, delay: 0.2 }}
            className="h-1 rounded-full bg-amber-500 mx-auto"
          />
        </motion.div>
      </div>
    );
  }

  // ── PROCESSING SCREEN ──
  if (step === "processing") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-12 h-12 text-amber-500 mx-auto" />
          </motion.div>
          <p className="text-base font-bold">Traitement en cours...</p>
          <p className="text-sm text-muted-foreground">Activation de votre abonnement Premium</p>
        </motion.div>
      </div>
    );
  }

  // ── CONFIRM SCREEN ──
  if (step === "confirm") {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep("plans")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-sm font-bold">Confirmer l'abonnement</h1>
        </div>

        <div className="max-w-md mx-auto px-5 py-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/25">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold">GP {selectedPlan === "pro" ? "Pro" : "Premium"}</h2>
          </div>

          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Abonnement mensuel</span>
                <span className="text-lg font-bold text-amber-600">{selectedPlan === "pro" ? "19 900" : "9 900"} FCFA</span>
              </div>
              <Separator className="bg-amber-500/15" />
              <div className="space-y-2">
                {[
                  { label: "Fréquence", value: "Mensuel" },
                  { label: "Engagement", value: "Sans engagement", accent: true },
                  { label: "Activation", value: "Immédiate" },
                  { label: "Résiliation", value: "À tout moment" },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className={cn("text-xs font-medium", row.accent && "text-accent")}>{row.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <p className="text-xs font-semibold">Inclus dans {selectedPlan === "pro" ? "Pro" : "Premium"} :</p>
            <div className="grid grid-cols-1 gap-1.5">
              {(selectedPlan === "pro" ? PRO_FEATURES.filter(f => !f.separator) : PREMIUM_FEATURES.filter(f => f.highlight)).map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                  {f.label}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              className="w-full gap-2 h-12 text-sm bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-lg shadow-amber-500/20"
              onClick={handleConfirmUpgrade}
              disabled={upgrading}
            >
              <Crown className="w-4 h-4" />
              Confirmer — {selectedPlan === "pro" ? "19 900" : "9 900"} FCFA/mois
            </Button>
            <Button
              variant="ghost"
              className="w-full text-xs text-muted-foreground"
              onClick={() => setStep("plans")}
            >
              Retour aux formules
            </Button>
          </div>

          <p className="text-[10px] text-center text-muted-foreground">
            En confirmant, vous acceptez les conditions d'abonnement Premium.
            Résiliable à tout moment depuis vos paramètres.
          </p>
        </div>
      </div>
    );
  }

  // ── PLANS PAGE (main view) ──
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-sm font-bold">Formules & Tarifs</h1>
      </div>

      {/* Hero */}
      <div className="text-center px-6 pt-8 pb-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/25"
        >
          <Crown className="w-7 h-7 text-white" />
        </motion.div>
        <h1 className="text-2xl font-bold tracking-tight">Tarifs</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
          Choisissez la formule qui correspond à vos ambitions de transporteur.
        </p>
      </div>

      <div className="px-4 pb-10 space-y-4 max-w-lg mx-auto">
        {/* ── STANDARD CARD ── */}
        <Card className="border-border/60">
          <CardContent className="p-5 space-y-4">
            <div>
              <h3 className="text-lg font-bold">Standard</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                L'essentiel pour démarrer votre activité
              </p>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">0</span>
              <span className="text-sm text-muted-foreground">FCFA / mois</span>
            </div>

            <p className="text-[11px] text-muted-foreground">Gratuit pour toujours</p>

            {isPremium ? (
              <Button
                variant="outline"
                className="w-full h-10 text-xs text-muted-foreground"
                onClick={() => handleDowngrade("free")}
                disabled={downgrading}
              >
                {downgrading ? "Changement..." : "Revenir au plan Standard"}
              </Button>
            ) : (
              <div className="h-10 flex items-center justify-center rounded-lg border border-accent text-xs font-medium text-accent">
                <Check className="w-3.5 h-3.5 mr-1.5" /> Votre plan actuel
              </div>
            )}

            <Separator />

            <div className="space-y-2.5">
              <p className="text-xs font-semibold">Inclus :</p>
              {STANDARD_FEATURES.map((feat, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                  {feat}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── PREMIUM CARD ── */}
        <Card className="border-amber-500/40 shadow-md shadow-amber-500/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">Premium</h3>
                  <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[9px] h-4">
                    Recommandé
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pour les transporteurs ambitieux
                </p>
              </div>
              <Crown className="w-6 h-6 text-amber-500 flex-shrink-0" />
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-amber-600">9 900</span>
              <span className="text-sm text-muted-foreground">FCFA / mois</span>
            </div>

            <p className="text-[11px] text-muted-foreground">Sans engagement · Résiliable à tout moment</p>

            {currentSub === "premium" ? (
              <div className="h-11 flex items-center justify-center rounded-xl border-2 border-amber-500/50 text-sm font-semibold text-amber-600 gap-1.5">
                <Crown className="w-4 h-4" /> Votre plan actuel
              </div>
            ) : isPro ? (
              <Button
                variant="outline"
                className="w-full h-11 text-xs text-muted-foreground"
                onClick={() => handleDowngrade("premium")}
                disabled={downgrading}
              >
                {downgrading ? "Changement..." : "Revenir à Premium"}
              </Button>
            ) : (
              <Button
                className="w-full gap-2 h-11 text-sm bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-lg shadow-amber-500/20"
                onClick={() => { setSelectedPlan("premium"); setStep("confirm"); }}
              >
                <Crown className="w-4 h-4" />
                Passer Premium
              </Button>
            )}

            <Separator className="bg-amber-500/15" />

            <div className="space-y-2.5">
              {PREMIUM_FEATURES.map((feat, i) => (
                <div key={i}>
                  {feat.separator ? (
                    <p className="text-xs font-semibold text-foreground/80">{feat.label}</p>
                  ) : (
                    <div className="flex items-center gap-2.5 text-xs">
                      <Check className={cn(
                        "w-3.5 h-3.5 flex-shrink-0",
                        feat.highlight ? "text-amber-500" : "text-muted-foreground/60"
                      )} />
                      <span className={feat.highlight ? "text-foreground font-medium" : "text-muted-foreground"}>
                        {feat.label}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!isPremium && (
              <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 text-center">
                <p className="text-[11px] font-semibold text-accent">
                  💡 1 seul colis supplémentaire par mois rembourse l'abonnement
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  En moyenne, les GP Premium reçoivent 3x plus de demandes
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── PRO CARD ── */}
        <Card className={cn("relative overflow-hidden", isPro ? "border-primary/40 shadow-md shadow-primary/10" : "border-border/60")}>
          {isPro && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-blue-600" />}
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">Pro</h3>
                  {isPro && <Badge className="bg-primary/15 text-primary border-primary/30 text-[9px] h-4">Actif</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Le maximum pour votre activité
                </p>
              </div>
              <Rocket className="w-5 h-5 text-primary flex-shrink-0" />
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">19 900</span>
              <span className="text-sm text-muted-foreground">FCFA / mois</span>
            </div>

            {isPro ? (
              <div className="h-11 flex items-center justify-center rounded-xl border-2 border-primary/50 text-sm font-semibold text-primary gap-1.5">
                <Rocket className="w-4 h-4" /> Votre plan actuel
              </div>
            ) : (
              <Button
                className="w-full gap-2 h-11 text-sm font-semibold"
                onClick={() => { setSelectedPlan("pro"); setStep("confirm"); }}
              >
                <Rocket className="w-4 h-4" />
                {isPremium ? "Passer à Pro" : "Choisir Pro"}
              </Button>
            )}

            <Separator />

            <div className="space-y-2.5">
              {PRO_FEATURES.map((feat, i) => (
                <div key={i}>
                  {feat.separator ? (
                    <p className="text-xs font-semibold text-foreground/80">{feat.label}</p>
                  ) : (
                    <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                      <Check className={cn("w-3.5 h-3.5 flex-shrink-0", isPro ? "text-primary" : "text-muted-foreground/40")} />
                      {feat.label}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-[10px] text-center text-muted-foreground pt-4 pb-6">
          Paiement sécurisé · Résiliable à tout moment · Sans engagement
        </p>
      </div>
    </div>
  );
}
