import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, Weight, Package, Plus, Edit, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { RestrictionsManager } from "@/components/gp/RestrictionsManager";
import { getCurrencySymbol } from "@/components/ui/currency-selector";

interface FlatRateItem {
  id: string;
  object_type_id: string;
  price: number;
  currency: string;
  is_active: boolean;
  object_type: {
    name: string;
    label: string;
  };
}

interface GPProfile {
  id: string;
  business_name: string;
  gp_type: string;
  status: string;
  default_currency: string;
  explicit_restrictions?: string[] | null;
}

/**
 * GPTarificationPage - Gestion des tarifs
 * 
 * GP Bagages: prix au kilo + forfaits
 * Restrictions explicites
 */
export default function GPTarificationPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<GPProfile | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [pricePerKg, setPricePerKg] = useState<number>(0);
  const [flatRates, setFlatRates] = useState<FlatRateItem[]>([]);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

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

      const { data: profile } = await supabase
        .from("gp_profiles")
        .select("id, business_name, gp_type, status, default_currency, explicit_restrictions")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        navigate("/gp/inscription");
        return;
      }

      setGpProfile(profile);
      setRestrictions(profile.explicit_restrictions || []);

      // Get latest offer price as reference
      const { data: latestOffer } = await supabase
        .from("gp_offers")
        .select("price_per_kg")
        .eq("gp_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestOffer) {
        setPricePerKg(latestOffer.price_per_kg);
      }

      // Load flat rate pricing
      const { data: flatRateData } = await supabase
        .from("gp_flat_rate_pricing")
        .select(`
          id,
          object_type_id,
          price,
          currency,
          is_active,
          object_type:flat_rate_object_types(name, label)
        `)
        .eq("gp_id", profile.id)
        .eq("is_active", true);

      setFlatRates(flatRateData as any || []);

      // Get pending count
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("gp_id", profile.id)
        .eq("status", "pending");

      setPendingCount(count || 0);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRestrictions = async (newRestrictions: string[]) => {
    if (!gpProfile) return;

    try {
      const { error } = await supabase
        .from("gp_profiles")
        .update({ explicit_restrictions: newRestrictions })
        .eq("id", gpProfile.id);

      if (error) throw error;

      setRestrictions(newRestrictions);
      toast({
        title: "✅ Restrictions mises à jour",
        description: "Vos restrictions ont été enregistrées",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les restrictions",
        variant: "destructive",
      });
    }
  };

  const handleUpdateFlatRate = async (itemId: string, newPrice: number) => {
    try {
      const { error } = await supabase
        .from("gp_flat_rate_pricing")
        .update({ price: newPrice })
        .eq("id", itemId);

      if (error) throw error;

      toast({
        title: "Prix mis à jour",
      });
      loadData();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le prix",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <PageLoader message="Chargement des tarifs..." />;
  }

  if (!gpProfile) return null;

  const currency = gpProfile.default_currency || "XOF";

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingCount}
      activeTab="tarifs"
    >
      <div className="px-4 py-4 space-y-6">
        <h2 className="text-lg font-semibold">Mes tarifs</h2>

        {/* Prix au kilo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Weight className="w-4 h-4 text-primary" />
              Prix au kilogramme
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={pricePerKg}
                    onChange={(e) => setPricePerKg(Number(e.target.value))}
                    className="text-lg font-semibold"
                  />
                  <span className="text-lg font-medium text-muted-foreground">
                    {getCurrencySymbol(currency)}/kg
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Ce prix s'applique aux colis standards, alimentaires et vêtements
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tarifs forfaitaires */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Articles forfaitaires
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {flatRates.length} articles
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {flatRates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun tarif forfaitaire configuré
              </p>
            ) : (
              flatRates.map((item) => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{item.object_type?.label || item.object_type?.name}</p>
                    <p className="text-xs text-muted-foreground">Par unité</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleUpdateFlatRate(item.id, Number(e.target.value))}
                      className="w-24 text-right"
                    />
                    <span className="text-sm text-muted-foreground">
                      {getCurrencySymbol(item.currency)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Restrictions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Restrictions bagages</CardTitle>
          </CardHeader>
          <CardContent>
            <RestrictionsManager
              selectedRestrictions={restrictions}
              onChange={handleSaveRestrictions}
              gpId={gpProfile.id}
              showSaveButton
            />
          </CardContent>
        </Card>
      </div>
    </GPDashboardLayout>
  );
}
