/**
 * MaritimePremiumPage — Premium plans for Maritime transporters
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, Rocket, CheckCircle2, ArrowLeft, Loader2, Check, Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STANDARD_FEATURES = [
  "Publier des corridors maritimes",
  "Recevoir des demandes de fret",
  "1 corridor fixe",
  "Visibilité standard",
  "Assurance basique",
  "Portefeuille basique",
];
const PREMIUM_FEATURES = [
  { label: "Tout Standard, plus :", separator: true },
  { label: "Jusqu'à 3 corridors simultanés", highlight: true },
  { label: "Changement de corridor automatique", highlight: true },
  { label: "Priorité dans la marketplace fret", highlight: true },
  { label: "Auto-acceptation des réservations", highlight: true },
  { label: "Dashboard performances avancé", highlight: true },
  { label: "Badge Premium visible", highlight: true },
  { label: "Suivi conteneur en temps réel", highlight: false },
];
const PRO_FEATURES = [
  { label: "Tout Premium, plus :", separator: true },
  { label: "Jusqu'à 5 corridors simultanés", highlight: true },
  { label: "Visibilité maximale + boost", highlight: true },
  { label: "Commission réduite de 40%", highlight: true },
  { label: "Multi-conteneurs illimités", highlight: true },
  { label: "Assurance premium incluse", highlight: false },
  { label: "Support prioritaire dédié", highlight: false },
];

type FlowStep = "plans" | "confirm" | "processing" | "success";

export default function MaritimePremiumPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [step, setStep] = useState<FlowStep>("confirm");
  const [upgrading, setUpgrading] = useState(false);
  const [downgrading, setDowngrading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"premium" | "pro">("premium");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: gp } = await supabase.from("gp_profiles").select("id, subscription").eq("user_id", user.id).eq("gp_type", "maritime").maybeSingle();
      if (!gp) { navigate("/maritime/inscription"); return; }
      setGpProfile(gp); setLoading(false);
    })();
  }, []);

  if (loading) return <PageLoader message="Chargement..." />;
  if (!gpProfile) return null;
  const currentSub = gpProfile.subscription || "free";
  const isPremium = currentSub === "premium" || currentSub === "pro";
  const isPro = currentSub === "pro";

  const handleUpgrade = async () => {
    setStep("processing"); setUpgrading(true);
    try {
      await new Promise(r => setTimeout(r, 2000));
      await supabase.from("gp_profiles").update({ subscription: selectedPlan as any }).eq("id", gpProfile.id);
      setStep("success"); setTimeout(() => { window.location.href = "/maritime/apercu"; }, 2500);
    } catch (err: any) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); setStep("plans"); }
    finally { setUpgrading(false); }
  };
  const handleDowngrade = async (t: "free" | "premium" = "free") => {
    setDowngrading(true);
    try { await supabase.from("gp_profiles").update({ subscription: t as any }).eq("id", gpProfile.id); toast({ title: "Plan modifié" }); setTimeout(() => { window.location.href = "/maritime/apercu"; }, 1200); }
    catch (err: any) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); } finally { setDowngrading(false); }
  };

  if (step === "success") return (<div className="min-h-screen bg-background flex items-center justify-center px-6"><motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6"><motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }} className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto"><CheckCircle2 className="w-10 h-10 text-blue-500" /></motion.div><h2 className="text-2xl font-bold">Bienvenue {selectedPlan === "pro" ? "Pro" : "Premium"} !</h2><Badge className="bg-blue-500 text-white border-none gap-1.5 text-sm px-4 py-1.5"><Ship className="w-4 h-4" /> Maritime {selectedPlan === "pro" ? "Pro" : "Premium"}</Badge></motion.div></div>);
  if (step === "processing") return (<div className="min-h-screen bg-background flex items-center justify-center"><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}><Loader2 className="w-12 h-12 text-blue-500 mx-auto" /></motion.div><p className="text-base font-bold">Traitement...</p></motion.div></div>);
  if (step === "confirm") return (<div className="min-h-screen bg-background"><div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center gap-3"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep("plans")}><ArrowLeft className="w-4 h-4" /></Button><h1 className="text-sm font-bold">Confirmer</h1></div><div className="max-w-md mx-auto px-5 py-8 space-y-6"><div className="text-center"><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mx-auto shadow-lg"><Crown className="w-8 h-8 text-white" /></div><h2 className="text-xl font-bold mt-3">Maritime {selectedPlan === "pro" ? "Pro" : "Premium"}</h2></div><Card className="border-blue-500/30 bg-blue-500/5"><CardContent className="p-5"><div className="flex items-center justify-between"><span className="text-sm font-medium">Mensuel</span><span className="text-lg font-bold text-blue-600">{selectedPlan === "pro" ? "19 900" : "9 900"} FCFA</span></div></CardContent></Card><Button className="w-full gap-2 h-12 bg-blue-500 hover:bg-blue-600 text-white font-semibold" onClick={handleUpgrade} disabled={upgrading}><Crown className="w-4 h-4" />Confirmer</Button><Button variant="ghost" className="w-full text-xs" onClick={() => setStep("plans")}>Retour</Button></div></div>);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center gap-3"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button><h1 className="text-sm font-bold">Formules Maritime</h1></div>
      <div className="text-center px-6 pt-8 pb-6"><div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mx-auto mb-4 shadow-lg"><Ship className="w-7 h-7 text-white" /></div><h1 className="text-2xl font-bold">Tarifs Maritime</h1><p className="text-sm text-muted-foreground mt-2">Boostez votre activité de fret maritime.</p></div>
      <div className="px-4 pb-10 space-y-4 max-w-lg mx-auto">
        {/* Standard */}
        <Card><CardContent className="p-5 space-y-4"><h3 className="text-lg font-bold">Standard</h3><div className="flex items-baseline gap-1"><span className="text-3xl font-bold">0</span><span className="text-sm text-muted-foreground">FCFA/mois</span></div>{isPremium ? <Button variant="outline" className="w-full h-10 text-xs" onClick={() => handleDowngrade("free")} disabled={downgrading}>{downgrading ? "..." : "Revenir au Standard"}</Button> : <div className="h-10 flex items-center justify-center rounded-lg border border-accent text-xs font-medium text-accent"><Check className="w-3.5 h-3.5 mr-1.5" />Votre plan</div>}<Separator /><div className="space-y-2">{STANDARD_FEATURES.map((f, i) => <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground"><Check className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />{f}</div>)}</div></CardContent></Card>
        {/* Premium */}
        <Card className="border-blue-500/40 shadow-md relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-600" /><CardContent className="p-5 space-y-4"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2"><h3 className="text-lg font-bold">Premium</h3><Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[9px] h-4">Recommandé</Badge></div></div><Crown className="w-6 h-6 text-blue-500" /></div><div className="flex items-baseline gap-1"><span className="text-3xl font-bold text-blue-600">9 900</span><span className="text-sm text-muted-foreground">FCFA/mois</span></div>{currentSub === "premium" ? <div className="h-11 flex items-center justify-center rounded-xl border-2 border-blue-500/50 text-sm font-semibold text-blue-600 gap-1.5"><Crown className="w-4 h-4" />Votre plan</div> : isPro ? <Button variant="outline" className="w-full h-11 text-xs" onClick={() => handleDowngrade("premium")} disabled={downgrading}>Revenir à Premium</Button> : <Button className="w-full gap-2 h-11 bg-blue-500 hover:bg-blue-600 text-white font-semibold" onClick={() => { setSelectedPlan("premium"); setStep("confirm"); }}><Crown className="w-4 h-4" />Passer Premium</Button>}<Separator className="bg-blue-500/15" /><div className="space-y-2">{PREMIUM_FEATURES.map((f, i) => <div key={i}>{f.separator ? <p className="text-xs font-semibold">{f.label}</p> : <div className="flex items-center gap-2 text-xs"><Check className={cn("w-3.5 h-3.5 flex-shrink-0", f.highlight ? "text-blue-500" : "text-muted-foreground/60")} /><span className={f.highlight ? "font-medium" : "text-muted-foreground"}>{f.label}</span></div>}</div>)}</div></CardContent></Card>
        {/* Pro */}
        <Card className={cn("relative overflow-hidden", isPro ? "border-primary/40 shadow-md" : "")}><CardContent className="p-5 space-y-4"><div className="flex items-start justify-between"><h3 className="text-lg font-bold">Pro</h3><Rocket className="w-5 h-5 text-primary" /></div><div className="flex items-baseline gap-1"><span className="text-3xl font-bold">19 900</span><span className="text-sm text-muted-foreground">FCFA/mois</span></div>{isPro ? <div className="h-11 flex items-center justify-center rounded-xl border-2 border-primary/50 text-sm font-semibold text-primary gap-1.5"><Rocket className="w-4 h-4" />Votre plan</div> : <Button className="w-full gap-2 h-11 font-semibold" onClick={() => { setSelectedPlan("pro"); setStep("confirm"); }}><Rocket className="w-4 h-4" />{isPremium ? "Passer à Pro" : "Choisir Pro"}</Button>}<Separator /><div className="space-y-2">{PRO_FEATURES.map((f, i) => <div key={i}>{f.separator ? <p className="text-xs font-semibold">{f.label}</p> : <div className="flex items-center gap-2 text-xs text-muted-foreground"><Check className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground/40" />{f.label}</div>}</div>)}</div></CardContent></Card>
        <p className="text-[10px] text-center text-muted-foreground pt-4 pb-6">Paiement sécurisé · Sans engagement</p>
      </div>
    </div>
  );
}
