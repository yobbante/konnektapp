/**
 * RoutierTarificationPage — Size-based pricing (S/M/L/XL)
 * Compact mobile layout with currency selector and smart placeholders
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, Save, Info, Loader2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { CurrencySelector, type CurrencyCode } from "@/components/ui/currency-selector";
import { useToast } from "@/hooks/use-toast";
import { getAllSizeCategories, formatPriceFCFA } from "@/lib/routierUtils";
import { getPricePlaceholder, getCurrencySymbol } from "@/lib/cityUtils";

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
  const sizeKeys: Array<"s" | "m" | "l" | "xl"> = ["s", "m", "l", "xl"];
  const currSym = getCurrencySymbol(currency);

  return (
    <RoutierDashboardLayout gpProfile={gpProfile} pendingCount={0} activeOrdersCount={0}>
      <div className="p-3 space-y-3 max-w-lg mx-auto pb-24">
        <div>
          <h2 className="text-base font-bold">Tarification</h2>
          <p className="text-[11px] text-muted-foreground">Prix par catégorie de colis</p>
        </div>

        {/* Currency selector - compact */}
        <Card>
          <CardContent className="p-2.5 flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground shrink-0">Devise</span>
            <CurrencySelector value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)} />
          </CardContent>
        </Card>

        {/* Pricing grid - compact */}
        <Card>
          <CardContent className="p-3 space-y-2.5">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              Prix par taille
            </p>
            {sizes.map((size, i) => (
              <div key={size.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Badge className={`${size.bg} ${size.color} border-0 text-[10px] font-bold px-1.5 py-0`}>
                      {size.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{size.description}</span>
                  </div>
                  {recPrices && recPrices[i] > 0 && (
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                      <TrendingUp className="w-2.5 h-2.5" />
                      {formatPriceFCFA(recPrices[i])}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    value={prices[i] || ""}
                    onChange={e => setters[i](+e.target.value)}
                    placeholder={getPricePlaceholder(currency, sizeKeys[i])}
                    className="h-8 text-sm pr-14"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                    {currSym}
                  </span>
                </div>
                {recPrices && recPrices[i] > 0 && prices[i] > 0 && (
                  <p className={`text-[9px] ${
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

        {/* Info - compact */}
        <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-muted/30 border border-border/30">
          <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Fixez vos prix librement. Le prix recommandé est la moyenne du corridor. Les clients voient vos prix et la référence Konnekt.
          </p>
        </div>

        {/* Preview - compact */}
        {priceS > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-2.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground">Aperçu client</p>
                <p className="text-base font-bold text-primary">
                  À partir de {formatPriceFCFA(Math.min(priceS, priceM, priceL, priceXL))} {currSym}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save */}
        <Button className="w-full h-10" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </RoutierDashboardLayout>
  );
}
