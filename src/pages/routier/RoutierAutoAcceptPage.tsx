/**
 * RoutierAutoAcceptPage — Auto-accept settings for Routier transporters
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { MiniLoader } from "@/components/ui/MiniLoader";
import {
  Zap, Weight, Clock, ShieldCheck, AlertTriangle,
  DollarSign, ArrowLeft, Save, Info, Lock, Crown,
} from "lucide-react";
import { isGPPremium } from "@/lib/premiumGating";

export default function RoutierAutoAcceptPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gpProfile, setGpProfile] = useState<any>(null);

  const [enabled, setEnabled] = useState(false);
  const [maxWeight, setMaxWeight] = useState(30);
  const [maxOrdersPerDay, setMaxOrdersPerDay] = useState(10);
  const [requireInsurance, setRequireInsurance] = useState(false);
  const [excludeFragile, setExcludeFragile] = useState(false);
  const [minPrice, setMinPrice] = useState(0);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    const { data: profile } = await supabase
      .from("gp_profiles")
      .select("id, business_name, gp_type, status, subscription, road_type, kyc_level, auto_accept_enabled, auto_accept_max_weight, auto_accept_max_orders_per_day, auto_accept_require_insurance, auto_accept_exclude_fragile, auto_accept_min_price, default_currency")
      .eq("user_id", user.id).eq("gp_type", "routier").maybeSingle();
    if (!profile) { navigate("/routier/inscription"); return; }
    const sub = (profile as any).subscription;
    if (!isGPPremium(sub)) { navigate("/routier/premium"); return; }
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
      toast({ title: "Paramètres sauvegardés", description: "L'auto-acceptation a été mise à jour." });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const isPro = gpProfile?.subscription === "pro";
  const currency = gpProfile?.default_currency || "XOF";

  if (loading) return <PageLoader message="Chargement..." />;

  return (
    <RoutierDashboardLayout gpProfile={gpProfile || { id: "", business_name: "", gp_type: "routier", status: "" }}>
      <div className="px-3 py-3 max-w-lg mx-auto space-y-3 pb-20">
        {/* Header */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/routier/parametres")} className="w-8 h-8 rounded-md bg-card border border-border flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold">Auto-acceptation</h1>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${isPro ? "border-violet-500/30 text-violet-600 bg-violet-500/10" : "border-amber-500/30 text-amber-600 bg-amber-500/10"}`}>
                {isPro ? "Pro" : "Premium"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Main toggle */}
        <div className={`rounded-md border p-3 ${enabled ? "bg-emerald-500/5 border-emerald-500/20" : "bg-card border-border"}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-md flex items-center justify-center ${enabled ? "bg-emerald-500/15" : "bg-muted"}`}>
                <Zap className={`w-4 h-4 ${enabled ? "text-emerald-500" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="font-medium text-sm leading-tight">Acceptation automatique</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {enabled ? "Missions éligibles acceptées automatiquement" : "Validation manuelle requise"}
                </p>
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>

        {enabled && (
          <div className="space-y-2">
            <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-md bg-blue-500/5 border border-blue-500/15">
              <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Seules les missions correspondant à tous les critères seront auto-acceptées.
              </p>
            </div>

            <SettingCard icon={Weight} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Poids max" badgeText={`${maxWeight} kg`}>
              <Slider value={[maxWeight]} onValueChange={([v]) => setMaxWeight(v)} min={1} max={500} step={5} />
              <div className="flex justify-between text-[9px] text-muted-foreground"><span>1 kg</span><span>500 kg</span></div>
            </SettingCard>

            <SettingCard icon={Clock} iconColor="text-orange-500" iconBg="bg-orange-500/10" label="Missions max/jour" badgeText={`${maxOrdersPerDay}`}>
              <Slider value={[maxOrdersPerDay]} onValueChange={([v]) => setMaxOrdersPerDay(v)} min={1} max={20} step={1} />
              <div className="flex justify-between text-[9px] text-muted-foreground"><span>1</span><span>20</span></div>
            </SettingCard>

            <SettingCard icon={DollarSign} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" label="Prix minimum" badgeText={`${minPrice.toLocaleString()} ${currency}`}>
              <Slider value={[minPrice]} onValueChange={([v]) => setMinPrice(v)} min={0} max={500000} step={5000} />
              <div className="flex justify-between text-[9px] text-muted-foreground"><span>0</span><span>500 000 {currency}</span></div>
            </SettingCard>

            <div className="bg-card rounded-md border border-border divide-y divide-border">
              <ToggleRow icon={ShieldCheck} iconColor="text-violet-500" iconBg="bg-violet-500/10" label="Exiger une assurance" desc="Client doit souscrire une assurance" checked={requireInsurance} onChange={setRequireInsurance} />
              <ToggleRow icon={AlertTriangle} iconColor="text-amber-500" iconBg="bg-amber-500/10" label="Exclure colis fragiles" desc="Ne pas auto-accepter les envois fragiles" checked={excludeFragile} onChange={setExcludeFragile} />
            </div>

            <div className="bg-muted/50 rounded-md px-2.5 py-2 space-y-0.5">
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">Résumé</p>
              <ul className="text-[11px] text-muted-foreground space-y-0">
                <li>Poids ≤ {maxWeight} kg · Max {maxOrdersPerDay}/jour</li>
                {minPrice > 0 && <li>Prix ≥ {minPrice.toLocaleString()} {currency}</li>}
                {requireInsurance && <li>Assurance obligatoire</li>}
                {excludeFragile && <li>Fragiles exclus</li>}
              </ul>
            </div>
          </div>
        )}

        <Button className="w-full gap-2 h-9 text-sm" onClick={handleSave} disabled={saving}>
          {saving ? <MiniLoader size="sm" /> : <><Save className="w-3.5 h-3.5" /> Enregistrer</>}
        </Button>
      </div>
    </RoutierDashboardLayout>
  );
}

function SettingCard({ icon: Icon, iconColor, iconBg, label, badgeText, children }: {
  icon: any; iconColor: string; iconBg: string; label: string; badgeText: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-md border border-border p-3 space-y-2">
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        </div>
        <Label className="font-medium text-xs flex-1">{label}</Label>
        <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">{badgeText}</Badge>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ icon: Icon, iconColor, iconBg, label, desc, checked, onChange }: {
  icon: any; iconColor: string; iconBg: string; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 gap-3">
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        </div>
        <div>
          <Label className="font-medium text-xs">{label}</Label>
          <p className="text-[10px] text-muted-foreground leading-tight">{desc}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
