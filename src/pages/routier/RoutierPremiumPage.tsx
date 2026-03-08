/**
 * RoutierPremiumPage — Abonnements Routier Standard / Premium / Pro
 * 
 * Structure tarifaire complète selon le modèle Konnekt Routier.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown, Rocket, CheckCircle2, ArrowLeft, Loader2, Check, Truck,
  Eye, Zap, BarChart3, Bell, Shield, Users, Route, FileText,
  Headphones, TrendingUp, Car, MapPin, Star, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ── Feature definitions ──
interface Feature {
  icon?: any;
  label: string;
  highlight?: boolean;
  separator?: boolean;
}

const STANDARD_FEATURES: Feature[] = [
  { icon: Route, label: "Publier des trajets" },
  { icon: Bell, label: "Recevoir des demandes de transport" },
  { icon: Check, label: "Accepter ou refuser manuellement" },
  { icon: Eye, label: "Visibilité standard dans les résultats" },
  { icon: FileText, label: "Historique simple des commandes" },
  { icon: MapPin, label: "Tracking de base" },
];

const PREMIUM_FEATURES: Feature[] = [
  { label: "Tout Standard, plus :", separator: true },
  { icon: Eye, label: "Visibilité prioritaire", highlight: true },
  { icon: Zap, label: "Auto-acceptation des commandes", highlight: true },
  { icon: BarChart3, label: "Dashboard performances avancé", highlight: true },
  { icon: Bell, label: "Notifications prioritaires", highlight: true },
  { icon: Star, label: "Badge Premium visible", highlight: true },
];

const PREMIUM_STATS: string[] = [
  "Revenus mensuels",
  "Taux de remplissage des trajets",
  "Volume transporté",
  "Historique détaillé",
];

const PRO_FEATURES: Feature[] = [
  { label: "Tout Premium, plus :", separator: true },
  { icon: Rocket, label: "Visibilité maximale (avant Premium)", highlight: true },
  { icon: TrendingUp, label: "Commission réduite", highlight: true },
  { icon: Car, label: "Gestion de flotte multi-véhicules", highlight: true },
  { icon: Users, label: "Gestion multi-conducteurs", highlight: true },
  { icon: Route, label: "Planification & optimisation trajets", highlight: true },
  { icon: BarChart3, label: "Analytics avancés", highlight: true },
  { icon: FileText, label: "Export factures & historique complet", highlight: true },
  { icon: Headphones, label: "Support prioritaire dédié", highlight: true },
];

const PRO_ANALYTICS: string[] = [
  "Profit par trajet",
  "Performance par corridor",
  "Taux de remplissage par ville",
];

const COMMISSION_TABLE = [
  { plan: "Standard", rate: "15%", color: "text-muted-foreground" },
  { plan: "Premium", rate: "13%", color: "text-emerald-600" },
  { plan: "Pro", rate: "10%", color: "text-primary" },
];

type FlowStep = "plans" | "confirm" | "processing" | "success";

export default function RoutierPremiumPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [step, setStep] = useState<FlowStep>("plans");
  const [upgrading, setUpgrading] = useState(false);
  const [downgrading, setDowngrading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"premium" | "pro">("premium");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: gp } = await supabase
        .from("gp_profiles")
        .select("id, subscription, business_name")
        .eq("user_id", user.id)
        .eq("gp_type", "routier")
        .maybeSingle();
      if (!gp) { navigate("/routier/inscription"); return; }
      setGpProfile(gp);
      setLoading(false);
    })();
  }, []);

  if (loading) return <PageLoader message="Chargement..." />;
  if (!gpProfile) return null;

  const currentSub = gpProfile.subscription || "free";
  const isPremium = currentSub === "premium" || currentSub === "pro";
  const isPro = currentSub === "pro";

  const handleUpgrade = async () => {
    setStep("processing");
    setUpgrading(true);
    try {
      await new Promise(r => setTimeout(r, 2000));
      await supabase.from("gp_profiles").update({ subscription: selectedPlan as any }).eq("id", gpProfile.id);
      setStep("success");
      setTimeout(() => { window.location.href = "/routier/apercu"; }, 2500);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
      setStep("plans");
    } finally {
      setUpgrading(false);
    }
  };

  const handleDowngrade = async (t: "free" | "premium" = "free") => {
    setDowngrading(true);
    try {
      await supabase.from("gp_profiles").update({ subscription: t as any }).eq("id", gpProfile.id);
      toast({ title: "Plan modifié" });
      setTimeout(() => { window.location.href = "/routier/apercu"; }, 1200);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setDowngrading(false);
    }
  };

  // ── SUCCESS SCREEN ──
  if (step === "success") return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}
          className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </motion.div>
        <h2 className="text-2xl font-bold">🎉 Bienvenue {selectedPlan === "pro" ? "Pro" : "Premium"} !</h2>
        <p className="text-sm text-muted-foreground">Votre abonnement est actif.</p>
        <Badge className="bg-emerald-500 text-white border-none gap-1.5 text-sm px-4 py-1.5">
          <Truck className="w-4 h-4" /> Routier {selectedPlan === "pro" ? "Pro" : "Premium"}
        </Badge>
      </motion.div>
    </div>
  );

  // ── PROCESSING SCREEN ──
  if (step === "processing") return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
          <Loader2 className="w-12 h-12 text-emerald-500 mx-auto" />
        </motion.div>
        <p className="text-base font-bold">Traitement en cours...</p>
        <p className="text-xs text-muted-foreground">Activation de votre abonnement</p>
      </motion.div>
    </div>
  );

  // ── CONFIRM SCREEN ──
  if (step === "confirm") return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep("plans")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-sm font-bold">Confirmer l'abonnement</h1>
      </div>
      <div className="max-w-md mx-auto px-5 py-8 space-y-6">
        <div className="text-center">
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg",
            selectedPlan === "pro"
              ? "bg-gradient-to-br from-primary to-primary/80"
              : "bg-gradient-to-br from-emerald-500 to-green-600"
          )}>
            {selectedPlan === "pro" ? <Rocket className="w-8 h-8 text-white" /> : <Crown className="w-8 h-8 text-white" />}
          </div>
          <h2 className="text-xl font-bold mt-3">Routier {selectedPlan === "pro" ? "Pro" : "Premium"}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedPlan === "pro" ? "Pour transporteurs intensifs et entreprises" : "Pour transporteurs réguliers"}
          </p>
        </div>

        <Card className={cn(
          "bg-card",
          selectedPlan === "pro" ? "border-primary/30" : "border-emerald-500/30"
        )}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Abonnement mensuel</span>
              <span className={cn("text-lg font-bold", selectedPlan === "pro" ? "text-primary" : "text-emerald-600")}>
                {selectedPlan === "pro" ? "19 900" : "9 900"} FCFA
              </span>
            </div>
            <Separator />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Commission</span>
                <span className="font-medium">{selectedPlan === "pro" ? "10%" : "13%"}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Sans engagement</span>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-muted/50 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">
            💡 Un seul trajet peut couvrir le coût de votre abonnement mensuel.
          </p>
        </div>

        <Button
          className={cn(
            "w-full gap-2 h-12 font-semibold text-white",
            selectedPlan === "pro"
              ? "bg-primary hover:bg-primary/90"
              : "bg-emerald-500 hover:bg-emerald-600"
          )}
          onClick={handleUpgrade}
          disabled={upgrading}
        >
          {selectedPlan === "pro" ? <Rocket className="w-4 h-4" /> : <Crown className="w-4 h-4" />}
          Confirmer — {selectedPlan === "pro" ? "19 900" : "9 900"} FCFA/mois
        </Button>
        <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setStep("plans")}>
          Retour aux formules
        </Button>
      </div>
    </div>
  );

  // ── PLANS LIST (main view) ──
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-sm font-bold">Formules Routier</h1>
      </div>

      {/* Hero */}
      <div className="text-center px-6 pt-8 pb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Truck className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold">Konnekt Routier</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Choisissez la formule adaptée à votre activité.
        </p>
      </div>

      <div className="px-4 pb-10 space-y-5 max-w-lg mx-auto">

        {/* ═══ STANDARD ═══ */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">Standard</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Transporteurs occasionnels</p>
              </div>
              <Truck className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">Gratuit</span>
            </div>
            {!isPremium ? (
              <div className="h-10 flex items-center justify-center rounded-lg border border-border text-xs font-medium text-muted-foreground gap-1.5">
                <Check className="w-3.5 h-3.5" /> Votre plan actuel
              </div>
            ) : (
              <Button variant="outline" className="w-full h-10 text-xs" onClick={() => handleDowngrade("free")} disabled={downgrading}>
                {downgrading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Revenir au Standard"}
              </Button>
            )}
            <Separator />
            <div className="space-y-2.5">
              {STANDARD_FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  {f.icon ? <f.icon className="w-3.5 h-3.5 flex-shrink-0 opacity-50" /> : <Check className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />}
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              Commission standard Konnekt : <span className="font-semibold">15%</span>
            </div>
          </CardContent>
        </Card>

        {/* ═══ PREMIUM ═══ */}
        <Card className="border-emerald-500/40 shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-600" />
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">Premium</h3>
                  <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[9px] h-4">
                    Recommandé
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Transporteurs réguliers</p>
              </div>
              <Crown className="w-6 h-6 text-emerald-500" />
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-emerald-600">9 900</span>
              <span className="text-sm text-muted-foreground">FCFA/mois</span>
            </div>

            {currentSub === "premium" ? (
              <div className="h-11 flex items-center justify-center rounded-xl border-2 border-emerald-500/50 text-sm font-semibold text-emerald-600 gap-1.5">
                <Crown className="w-4 h-4" /> Votre plan actuel
              </div>
            ) : isPro ? (
              <Button variant="outline" className="w-full h-11 text-xs border-emerald-500/30" onClick={() => handleDowngrade("premium")} disabled={downgrading}>
                {downgrading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Revenir à Premium"}
              </Button>
            ) : (
              <Button className="w-full gap-2 h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold" onClick={() => { setSelectedPlan("premium"); setStep("confirm"); }}>
                <Crown className="w-4 h-4" /> Passer Premium
              </Button>
            )}

            <Separator className="bg-emerald-500/15" />

            <div className="space-y-2.5">
              {PREMIUM_FEATURES.map((f, i) => (
                <div key={i}>
                  {f.separator ? (
                    <p className="text-xs font-semibold text-foreground">{f.label}</p>
                  ) : (
                    <div className="flex items-center gap-2.5 text-xs">
                      {f.icon ? (
                        <f.icon className={cn("w-3.5 h-3.5 flex-shrink-0", f.highlight ? "text-emerald-500" : "text-muted-foreground/60")} />
                      ) : (
                        <Check className={cn("w-3.5 h-3.5 flex-shrink-0", f.highlight ? "text-emerald-500" : "text-muted-foreground/60")} />
                      )}
                      <span className={f.highlight ? "font-medium text-foreground" : "text-muted-foreground"}>{f.label}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Dashboard détail */}
            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-3 space-y-1.5">
              <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">📊 Dashboard inclus</p>
              {PREMIUM_STATS.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 flex-shrink-0" />
                  {s}
                </div>
              ))}
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              Commission : <span className="font-semibold text-emerald-600">13%</span>
              <span className="ml-1 text-[10px]">(vs 15% standard)</span>
            </div>
          </CardContent>
        </Card>

        {/* ═══ PRO ═══ */}
        <Card className={cn("relative overflow-hidden", isPro ? "border-primary/40 shadow-md" : "border-border")}>
          {isPro && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/60" />}
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">Pro</h3>
                  <Badge variant="outline" className="text-[9px] h-4 border-primary/30 text-primary">
                    Entreprises
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Transporteurs intensifs / entreprises</p>
              </div>
              <Rocket className="w-5 h-5 text-primary" />
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">19 900</span>
              <span className="text-sm text-muted-foreground">FCFA/mois</span>
            </div>

            {isPro ? (
              <div className="h-11 flex items-center justify-center rounded-xl border-2 border-primary/50 text-sm font-semibold text-primary gap-1.5">
                <Rocket className="w-4 h-4" /> Votre plan actuel
              </div>
            ) : (
              <Button className="w-full gap-2 h-11 font-semibold" onClick={() => { setSelectedPlan("pro"); setStep("confirm"); }}>
                <Rocket className="w-4 h-4" /> {isPremium ? "Passer à Pro" : "Choisir Pro"}
              </Button>
            )}

            <Separator />

            <div className="space-y-2.5">
              {PRO_FEATURES.map((f, i) => (
                <div key={i}>
                  {f.separator ? (
                    <p className="text-xs font-semibold text-foreground">{f.label}</p>
                  ) : (
                    <div className="flex items-center gap-2.5 text-xs">
                      {f.icon ? (
                        <f.icon className={cn("w-3.5 h-3.5 flex-shrink-0", f.highlight ? "text-primary" : "text-muted-foreground/60")} />
                      ) : (
                        <Check className={cn("w-3.5 h-3.5 flex-shrink-0", f.highlight ? "text-primary" : "text-muted-foreground/60")} />
                      )}
                      <span className={f.highlight ? "font-medium text-foreground" : "text-muted-foreground"}>{f.label}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Analytics Pro détail */}
            <div className="bg-primary/5 border border-primary/15 rounded-lg p-3 space-y-1.5">
              <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">📊 Analytics Pro</p>
              {PRO_ANALYTICS.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                  {s}
                </div>
              ))}
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              Commission : <span className="font-semibold text-primary">10%</span>
              <span className="ml-1 text-[10px]">(vs 15% standard)</span>
            </div>
          </CardContent>
        </Card>

        {/* ═══ COMMISSION COMPARISON ═══ */}
        <Card className="border-dashed">
          <CardContent className="p-5 space-y-3">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Comparatif commissions
            </h4>
            <div className="space-y-2">
              {COMMISSION_TABLE.map((row, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{row.plan}</span>
                  <span className={cn("font-bold text-sm", row.color)}>{row.rate}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ═══ ROI CALLOUT ═══ */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center space-y-2">
          <p className="text-sm font-semibold">💰 Rentabilisé en 1 trajet</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Un transporteur routier gagne en moyenne 40–150€+ par trajet.
            L'abonnement Premium (9 900 FCFA) ou Pro (19 900 FCFA) est couvert dès votre premier trajet.
          </p>
        </div>

        <p className="text-[10px] text-center text-muted-foreground pt-2 pb-6">
          Paiement sécurisé · Sans engagement · Annulation à tout moment
        </p>
      </div>
    </div>
  );
}
