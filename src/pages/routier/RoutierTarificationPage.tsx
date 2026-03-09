import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, Save, Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { CurrencySelector, type CurrencyCode } from "@/components/ui/currency-selector";
import { RoutierPricingSimulator } from "@/components/routier/RoutierPricingSimulator";
import { useToast } from "@/hooks/use-toast";

export default function RoutierTarificationPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gpProfile, setGpProfile] = useState<any>(null);

  // Pricing state
  const [currency, setCurrency] = useState<CurrencyCode>("XOF");
  const [minPrice, setMinPrice] = useState(0);
  const [pricePerKm, setPricePerKm] = useState(0);
  const [pricePerKg, setPricePerKg] = useState(0);
  const [pricePerM3, setPricePerM3] = useState(0);

  // Simulator state
  const [simDistance, setSimDistance] = useState(150);
  const [simWeight, setSimWeight] = useState(500);
  const [simVolume, setSimVolume] = useState(2);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: gp } = await supabase
        .from("gp_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("gp_type", "routier")
        .maybeSingle();

      if (!gp) { navigate("/routier/inscription"); return; }
      setGpProfile(gp);

      // Load existing pricing
      const { data: pricing } = await supabase
        .from("routier_gp_pricing")
        .select("*")
        .eq("gp_id", gp.id)
        .maybeSingle();

      if (pricing) {
        setCurrency((pricing.currency || "XOF") as CurrencyCode);
        setMinPrice(Number(pricing.min_price) || 0);
        setPricePerKm(Number(pricing.price_per_km) || 0);
        setPricePerKg(Number(pricing.price_per_kg) || 0);
        setPricePerM3(Number(pricing.price_per_m3) || 0);
      } else {
        setCurrency((gp.default_currency || "XOF") as CurrencyCode);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!gpProfile) return;
    setSaving(true);
    try {
      const payload = {
        gp_id: gpProfile.id,
        min_price: minPrice,
        price_per_km: pricePerKm,
        price_per_kg: pricePerKg,
        price_per_m3: pricePerM3,
        currency,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("routier_gp_pricing")
        .upsert(payload, { onConflict: "gp_id" });

      if (error) throw error;

      // Sync currency to gp_profiles
      await supabase
        .from("gp_profiles")
        .update({ default_currency: currency })
        .eq("id", gpProfile.id);

      toast({ title: "Tarification enregistree" });
    } catch (error) {
      console.error(error);
      toast({ title: "Erreur lors de l'enregistrement", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <TransportPageLoader message="Chargement..." vehicle="truck" />;
  if (!gpProfile) return null;

  return (
    <RoutierDashboardLayout gpProfile={gpProfile} pendingCount={0} activeOrdersCount={0}>
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <h2 className="text-lg font-bold">Tarification</h2>

        {/* Currency */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Devise</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <CurrencySelector value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)} />
          </CardContent>
        </Card>

        {/* Pricing grid */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Grille tarifaire
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="space-y-1.5">
              <Label className="text-xs">Prix minimum par course ({currency})</Label>
              <Input type="number" value={minPrice || ""} onChange={e => setMinPrice(+e.target.value)} placeholder="15000" className="h-8 text-sm" />
              <p className="text-[11px] text-muted-foreground">Prix plancher, peu importe la distance</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Prix par km ({currency})</Label>
              <Input type="number" value={pricePerKm || ""} onChange={e => setPricePerKm(+e.target.value)} placeholder="500" className="h-8 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Prix par kg ({currency})</Label>
                <Input type="number" value={pricePerKg || ""} onChange={e => setPricePerKg(+e.target.value)} placeholder="100" className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prix par m3 ({currency})</Label>
                <Input type="number" value={pricePerM3 || ""} onChange={e => setPricePerM3(+e.target.value)} placeholder="5000" className="h-8 text-sm" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="border-muted">
          <CardContent className="p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Formule : max(minimum, km x prix/km + kg x prix/kg + m3 x prix/m3). Le prix est calcule automatiquement pour chaque commande.
            </p>
          </CardContent>
        </Card>

        {/* Simulator */}
        <RoutierPricingSimulator
          minPrice={minPrice}
          pricePerKm={pricePerKm}
          pricePerKg={pricePerKg}
          pricePerM3={pricePerM3}
          currency={currency}
          simDistance={simDistance}
          simWeight={simWeight}
          simVolume={simVolume}
          onSimDistanceChange={setSimDistance}
          onSimWeightChange={setSimWeight}
          onSimVolumeChange={setSimVolume}
        />

        {/* Save */}
        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? "Enregistrement..." : "Enregistrer les tarifs"}
        </Button>
      </div>
    </RoutierDashboardLayout>
  );
}
