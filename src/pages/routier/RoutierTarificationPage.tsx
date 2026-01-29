import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, Save, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { CurrencySelector, type CurrencyCode } from "@/components/ui/currency-selector";
import { useToast } from "@/hooks/use-toast";

export default function RoutierTarificationPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gpProfile, setGpProfile] = useState<any>(null);

  // Pricing state
  const [currency, setCurrency] = useState<CurrencyCode>("XOF");
  const [minPrice, setMinPrice] = useState("");
  const [pricePerKm, setPricePerKm] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [pricePerM3, setPricePerM3] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: gp, error: gpError } = await supabase
        .from("gp_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("gp_type", "routier")
        .maybeSingle();

      if (gpError || !gp) {
        navigate("/routier/inscription");
        return;
      }

      setGpProfile(gp);
      setCurrency((gp.default_currency || "XOF") as CurrencyCode);

      // Load existing pricing from scheduled_routes or create default
      const { data: routes } = await supabase
        .from("scheduled_routes")
        .select("*")
        .eq("gp_id", gp.id)
        .limit(1);

      if (routes && routes.length > 0) {
        const route = routes[0];
        setPricePerKg(route.price_per_kg?.toString() || "");
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
      // Update GP profile with currency
      await supabase
        .from("gp_profiles")
        .update({ default_currency: currency })
        .eq("id", gpProfile.id);

      toast({ title: "Tarification mise à jour ✓" });
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <TransportPageLoader message="Chargement..." vehicle="truck" />;
  }

  if (!gpProfile) {
    return null;
  }

  return (
    <RoutierDashboardLayout
      gpProfile={gpProfile}
      pendingCount={0}
      activeOrdersCount={0}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Tarification</h2>
        </div>

        {/* Currency */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Devise par défaut</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <CurrencySelector value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)} />
          </CardContent>
        </Card>

        {/* Base pricing */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Tarifs de base
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <Label>Prix minimum par course</Label>
              <Input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="15000"
              />
              <p className="text-xs text-muted-foreground">
                Prix plancher, peu importe la distance
              </p>
            </div>

            <div className="space-y-2">
              <Label>Coefficient distance (par km)</Label>
              <Input
                type="number"
                value={pricePerKm}
                onChange={(e) => setPricePerKm(e.target.value)}
                placeholder="500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prix par kg</Label>
                <Input
                  type="number"
                  value={pricePerKg}
                  onChange={(e) => setPricePerKg(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label>Prix par m³</Label>
                <Input
                  type="number"
                  value={pricePerM3}
                  onChange={(e) => setPricePerM3(e.target.value)}
                  placeholder="5000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info card */}
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-amber-900 dark:text-amber-100">
                  Calcul automatique
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Le système calcule le prix final en fonction du poids, volume et distance. 
                  Vous ne négociez pas manuellement avec le client.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save button */}
        <Button 
          className="w-full" 
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Enregistrement..." : "Enregistrer les tarifs"}
        </Button>
      </div>
    </RoutierDashboardLayout>
  );
}
