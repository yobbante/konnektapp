/**
 * GPAutoAcceptPage — Paramètres d'auto-acceptation des commandes
 * Accessible uniquement aux abonnés Premium/Pro
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { motion } from "framer-motion";
import {
  Zap, Weight, Package, ShieldCheck, AlertTriangle,
  DollarSign, ArrowLeft, Save, Clock, Info,
} from "lucide-react";

export default function GPAutoAcceptPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gpProfile, setGpProfile] = useState<any>(null);

  // Settings state
  const [enabled, setEnabled] = useState(false);
  const [maxWeight, setMaxWeight] = useState(30);
  const [maxOrdersPerDay, setMaxOrdersPerDay] = useState(10);
  const [requireInsurance, setRequireInsurance] = useState(false);
  const [excludeFragile, setExcludeFragile] = useState(false);
  const [minPrice, setMinPrice] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const { data: profile } = await supabase
      .from("gp_profiles")
      .select("id, subscription, auto_accept_enabled, auto_accept_max_weight, auto_accept_max_orders_per_day, auto_accept_require_insurance, auto_accept_exclude_fragile, auto_accept_min_price, base_price_per_kg, default_currency")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) { navigate("/gp/inscription"); return; }

    const sub = (profile as any).subscription;
    if (sub !== "premium" && sub !== "pro") {
      navigate("/gp/premium");
      return;
    }

    setGpProfile(profile);
    setEnabled((profile as any).auto_accept_enabled ?? false);
    setMaxWeight((profile as any).auto_accept_max_weight ?? 30);
    setMaxOrdersPerDay((profile as any).auto_accept_max_orders_per_day ?? 10);
    setRequireInsurance((profile as any).auto_accept_require_insurance ?? false);
    setExcludeFragile((profile as any).auto_accept_exclude_fragile ?? false);
    setMinPrice((profile as any).auto_accept_min_price ?? 0);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!gpProfile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("gp_profiles")
        .update({
          auto_accept_enabled: enabled,
          auto_accept_max_weight: maxWeight,
          auto_accept_max_orders_per_day: maxOrdersPerDay,
          auto_accept_require_insurance: requireInsurance,
          auto_accept_exclude_fragile: excludeFragile,
          auto_accept_min_price: minPrice,
        } as any)
        .eq("id", gpProfile.id);
      if (error) throw error;
      toast({ title: "Paramètres sauvegardés ✓", description: "L'auto-acceptation a été mise à jour." });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isPro = gpProfile?.subscription === "pro";
  const currency = gpProfile?.default_currency || "EUR";

  if (loading) return <GPDashboardLayout><PageLoader /></GPDashboardLayout>;

  return (
    <GPDashboardLayout>
      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/gp/parametres")} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Auto-acceptation</h1>
            <p className="text-xs text-muted-foreground">Configurez l'acceptation automatique de vos commandes</p>
          </div>
          <Badge variant="outline" className={isPro ? "border-violet-500/30 text-violet-600 bg-violet-500/10" : "border-amber-500/30 text-amber-600 bg-amber-500/10"}>
            {isPro ? "Pro" : "Premium"}
          </Badge>
        </div>

        {/* Main toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border p-5 ${enabled ? "bg-emerald-500/5 border-emerald-500/20" : "bg-card border-border"}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${enabled ? "bg-emerald-500/15" : "bg-muted"}`}>
                <Zap className={`w-5 h-5 ${enabled ? "text-emerald-500" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="font-semibold text-sm">Acceptation automatique</p>
                <p className="text-[11px] text-muted-foreground">
                  {enabled ? "Les commandes éligibles sont acceptées automatiquement" : "Les commandes nécessitent votre validation manuelle"}
                </p>
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </motion.div>

        {/* Settings — only visible when enabled */}
        {enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-4"
          >
            {/* Info banner */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Seules les commandes correspondant à tous les critères ci-dessous seront automatiquement acceptées. Les autres nécessiteront une validation manuelle.
              </p>
            </div>

            {/* Weight limit */}
            <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Weight className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1">
                  <Label className="font-medium text-sm">Poids maximum</Label>
                  <p className="text-[11px] text-muted-foreground">Limite de poids par commande acceptée automatiquement</p>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">{maxWeight} kg</Badge>
              </div>
              <Slider
                value={[maxWeight]}
                onValueChange={([v]) => setMaxWeight(v)}
                min={1}
                max={100}
                step={1}
                className="mt-2"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1 kg</span>
                <span>100 kg</span>
              </div>
            </div>

            {/* Orders per day */}
            <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-orange-500" />
                </div>
                <div className="flex-1">
                  <Label className="font-medium text-sm">Commandes max / jour</Label>
                  <p className="text-[11px] text-muted-foreground">Nombre maximum de commandes acceptées par jour</p>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">{maxOrdersPerDay}</Badge>
              </div>
              <Slider
                value={[maxOrdersPerDay]}
                onValueChange={([v]) => setMaxOrdersPerDay(v)}
                min={1}
                max={50}
                step={1}
                className="mt-2"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1</span>
                <span>50</span>
              </div>
            </div>

            {/* Min price */}
            <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <Label className="font-medium text-sm">Prix minimum</Label>
                  <p className="text-[11px] text-muted-foreground">Refuser automatiquement les commandes en dessous de ce montant</p>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">{minPrice.toLocaleString()} {currency}</Badge>
              </div>
              <Slider
                value={[minPrice]}
                onValueChange={([v]) => setMinPrice(v)}
                min={0}
                max={50000}
                step={500}
                className="mt-2"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0</span>
                <span>50 000 {currency}</span>
              </div>
            </div>

            {/* Safety toggles */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-violet-500" />
                  </div>
                  <div>
                    <Label className="font-medium text-sm">Exiger une assurance</Label>
                    <p className="text-[11px] text-muted-foreground">Uniquement si le client a souscrit une assurance</p>
                  </div>
                </div>
                <Switch checked={requireInsurance} onCheckedChange={setRequireInsurance} />
              </div>
              <Separator />
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <Label className="font-medium text-sm">Exclure les colis fragiles</Label>
                    <p className="text-[11px] text-muted-foreground">Ne pas auto-accepter les envois marqués fragiles</p>
                  </div>
                </div>
                <Switch checked={excludeFragile} onCheckedChange={setExcludeFragile} />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-muted/50 rounded-xl p-3 space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Résumé des critères</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                <li>• Poids ≤ {maxWeight} kg</li>
                <li>• Max {maxOrdersPerDay} commandes/jour</li>
                {minPrice > 0 && <li>• Prix ≥ {minPrice.toLocaleString()} {currency}</li>}
                {requireInsurance && <li>• Assurance obligatoire</li>}
                {excludeFragile && <li>• Colis fragiles exclus</li>}
              </ul>
            </div>
          </motion.div>
        )}

        {/* Save */}
        <Button className="w-full gap-2" size="lg" onClick={handleSave} disabled={saving}>
          {saving ? <MiniLoader size="sm" /> : <><Save className="w-4 h-4" /> Enregistrer</>}
        </Button>
      </div>
    </GPDashboardLayout>
  );
}
