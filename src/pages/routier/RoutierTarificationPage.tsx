/**
 * RoutierTarificationPage — Size-based pricing (S/M/L/XL)
 * Transporter sets own prices with platform recommended prices shown
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, Save, Info, Loader2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { CurrencySelector, type CurrencyCode } from "@/components/ui/currency-selector";
import { useToast } from "@/hooks/use-toast";
import { getAllSizeCategories, formatPriceFCFA } from "@/lib/routierUtils";

const sizes = getAllSizeCategories();

export default function RoutierTarificationPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [currency, setCurrency] = useState<CurrencyCode>("XOF");

  const [priceS, setPriceS] = useState(0);
  const [priceM, setPriceM] = useState(0);
  const [priceL, setPriceL] = useState(0);
  const [priceXL, setPriceXL] = useState(0);

  // Recommended prices (from platform)
  const [recommended, setRecommended] = useState<{ s: number; m: number; l: number; xl: number } | null>(null);

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

      const { data: pricing } = await supabase
        .from("routier_gp_pricing")
        .select("*")
        .eq("gp_id", gp.id)
        .maybeSingle();

      if (pricing) {
        setCurrency((pricing.currency || "XOF") as CurrencyCode);
        setPriceS(Number(pricing.price_s) || 0);
        setPriceM(Number(pricing.price_m) || 0);
        setPriceL(Number(pricing.price_l) || 0);
        setPriceXL(Number(pricing.price_xl) || 0);
      } else {
        setCurrency((gp.default_currency || "XOF") as CurrencyCode);
      }

      // Load recommended prices for base route
      if (gp.base_origin_city && gp.base_destination_city) {
        const { data: rec } = await supabase.rpc("get_routier_recommended_prices", {
          p_origin_city: gp.base_origin_city,
          p_destination_city: gp.base_destination_city,
        });
        if (rec && rec.length > 0 && rec[0].sample_count > 0) {
          setRecommended({
            s: rec[0].recommended_price_s,
            m: rec[0].recommended_price_m,
            l: rec[0].recommended_price_l,
            xl: rec[0].recommended_price_xl,
          });
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!gpProfile) return;
    if (priceS <= 0 || priceM <= 0 || priceL <= 0 || priceXL <= 0) {
      toast({ title: "Tous les prix sont requis", description: "Définissez un prix pour chaque taille", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("routier_gp_pricing")
        .upsert({
          gp_id: gpProfile.id,
          price_s: priceS,
          price_m: priceM,
          price_l: priceL,
          price_xl: priceXL,
          currency,
          updated_at: new Date().toISOString(),
        }, { onConflict: "gp_id" });

      if (error) throw error;

      await supabase
        .from("gp_profiles")
        .update({ default_currency: currency })
        .eq("id", gpProfile.id);

      toast({ title: "Tarification enregistrée" });
    } catch (error) {
      console.error(error);
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <TransportPageLoader message="Chargement..." vehicle="truck" />;
  if (!gpProfile) return null;

  const prices = [priceS, priceM, priceL, priceXL];
  const recPrices = recommended ? [recommended.s, recommended.m, recommended.l, recommended.xl] : null;
  const setters = [setPriceS, setPriceM, setPriceL, setPriceXL];

  return (
    <RoutierDashboardLayout gpProfile={gpProfile} pendingCount={0} activeOrdersCount={0}>
      <div className="p-4 space-y-4 max-w-lg mx-auto pb-24">
        <h2 className="text-lg font-bold">Tarification par taille</h2>
        <p className="text-xs text-muted-foreground -mt-2">
          Définissez vos prix pour chaque catégorie de colis
        </p>

        {/* Currency */}
        <Card>
          <CardContent className="p-3">
            <Label className="text-xs mb-2 block">Devise</Label>
            <CurrencySelector value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)} />
          </CardContent>
        </Card>

        {/* Size pricing grid */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Prix par taille de colis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {sizes.map((size, i) => (
              <div key={size.label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={`${size.bg} ${size.color} border-0 text-xs font-bold`}>
                      {size.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{size.description}</span>
                  </div>
                  {recPrices && recPrices[i] > 0 && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" />
                      Recommandé: {formatPriceFCFA(recPrices[i])}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    value={prices[i] || ""}
                    onChange={e => setters[i](+e.target.value)}
                    placeholder={recPrices && recPrices[i] > 0 ? String(recPrices[i]) : "0"}
                    className="h-9 text-sm pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {currency}
                  </span>
                </div>
                {recPrices && recPrices[i] > 0 && prices[i] > 0 && (
                  <p className={`text-[10px] ${
                    prices[i] < recPrices[i] * 0.8 ? "text-emerald-600" :
                    prices[i] > recPrices[i] * 1.2 ? "text-amber-600" :
                    "text-muted-foreground"
                  }`}>
                    {prices[i] < recPrices[i] * 0.8 && "Très compétitif"}
                    {prices[i] >= recPrices[i] * 0.8 && prices[i] <= recPrices[i] * 1.2 && "Dans la moyenne"}
                    {prices[i] > recPrices[i] * 1.2 && "Au-dessus du marché"}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="border-muted">
          <CardContent className="p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Vous êtes libre de fixer vos prix. Le prix recommandé est calculé à partir de la moyenne des transporteurs sur ce corridor. 
              Les clients voient vos prix et le prix recommandé Konnekt comme référence.
            </p>
          </CardContent>
        </Card>

        {/* Preview */}
        {priceS > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-3">
              <p className="text-xs font-medium mb-2">Aperçu client</p>
              <p className="text-lg font-bold text-primary">
                À partir de {formatPriceFCFA(Math.min(priceS, priceM, priceL, priceXL))}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Ce prix apparaîtra sur les cartes de résultats
              </p>
            </CardContent>
          </Card>
        )}

        {/* Save */}
        <Button className="w-full h-11" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? "Enregistrement..." : "Enregistrer les tarifs"}
        </Button>
      </div>
    </RoutierDashboardLayout>
  );
}
