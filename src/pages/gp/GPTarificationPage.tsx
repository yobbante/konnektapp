import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DollarSign, Weight, Package, Plus, Edit, Save, 
  ShieldX, ChevronDown, ChevronUp, Trash2, Check 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { FULL_RESTRICTIONS_LIST } from "@/components/gp/RestrictionsManager";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

interface FlatRateObjectType {
  id: string;
  name: string;
  label: string;
  default_price: number | null;
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
 * GPTarificationPage V2 - Interface intuitive et réorganisée
 * 
 * Structure:
 * 1. Prix au kilo (principal)
 * 2. Articles forfaitaires (activation/désactivation)
 * 3. Restrictions (collapsible)
 */
export default function GPTarificationPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gpProfile, setGpProfile] = useState<GPProfile | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [pricePerKg, setPricePerKg] = useState<number>(0);
  const [flatRates, setFlatRates] = useState<FlatRateItem[]>([]);
  const [allObjectTypes, setAllObjectTypes] = useState<FlatRateObjectType[]>([]);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [restrictionsOpen, setRestrictionsOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>("");

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

      // Load all available flat rate object types
      const { data: objectTypes } = await supabase
        .from("flat_rate_object_types")
        .select("*")
        .eq("is_active", true)
        .order("label");

      setAllObjectTypes(objectTypes || []);

      // Load GP's flat rate pricing
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
        .eq("gp_id", profile.id);

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

  const handleSavePricePerKg = async () => {
    if (!gpProfile) return;
    setSaving(true);
    try {
      // Update all active offers with new price
      await supabase
        .from("gp_offers")
        .update({ price_per_kg: pricePerKg })
        .eq("gp_id", gpProfile.id)
        .eq("status", "active");

      toast({ title: "✅ Prix au kilo mis à jour" });
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleFlatRateItem = async (objectType: FlatRateObjectType) => {
    if (!gpProfile) return;

    const existing = flatRates.find(fr => fr.object_type_id === objectType.id);
    
    try {
      if (existing) {
        // Toggle is_active
        const { error } = await supabase
          .from("gp_flat_rate_pricing")
          .update({ is_active: !existing.is_active })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Create new entry
        const { error } = await supabase
          .from("gp_flat_rate_pricing")
          .insert({
            gp_id: gpProfile.id,
            object_type_id: objectType.id,
            price: objectType.default_price || 5000,
            currency: gpProfile.default_currency || "XOF",
            is_active: true,
          });

        if (error) throw error;
      }

      loadData();
      toast({ title: existing?.is_active ? "Article désactivé" : "Article activé" });
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const updateFlatRatePrice = async (itemId: string, newPrice: number) => {
    try {
      const { error } = await supabase
        .from("gp_flat_rate_pricing")
        .update({ price: newPrice })
        .eq("id", itemId);

      if (error) throw error;
      setEditingPrice(null);
      loadData();
      toast({ title: "Prix mis à jour" });
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const toggleRestriction = async (restrictionId: string) => {
    if (!gpProfile) return;

    const newRestrictions = restrictions.includes(restrictionId)
      ? restrictions.filter(r => r !== restrictionId)
      : [...restrictions, restrictionId];

    try {
      const { error } = await supabase
        .from("gp_profiles")
        .update({ explicit_restrictions: newRestrictions })
        .eq("id", gpProfile.id);

      if (error) throw error;
      setRestrictions(newRestrictions);
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  if (loading) {
    return <PageLoader message="Chargement des tarifs..." />;
  }

  if (!gpProfile) return null;

  const currency = gpProfile.default_currency || "XOF";
  const currencySymbol = getCurrencySymbol(currency);

  // Merge flat rates with all object types for display
  const flatRateItems = allObjectTypes.map(ot => {
    const existing = flatRates.find(fr => fr.object_type_id === ot.id);
    return {
      objectType: ot,
      pricing: existing,
      isActive: existing?.is_active || false,
      price: existing?.price || ot.default_price || 5000,
    };
  });

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingCount}
      activeTab="tarifs"
    >
      <div className="px-4 py-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Mes tarifs</h2>
          <Badge variant="outline" className="text-xs">
            {currency}
          </Badge>
        </div>

        {/* Section 1: Prix au kilo */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Weight className="w-4 h-4 text-primary" />
              </div>
              Prix au kilogramme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Input
                type="number"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(Number(e.target.value))}
                className="text-2xl font-bold h-14 text-center"
              />
              <div className="text-lg font-medium text-muted-foreground whitespace-nowrap">
                {currencySymbol}/kg
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Ce tarif s'applique aux envois standard (vêtements, alimentaires, tissus, etc.)
            </p>
            <Button 
              onClick={handleSavePricePerKg}
              disabled={saving}
              className="w-full"
              size="sm"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer le prix/kg
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Section 2: Articles forfaitaires */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Package className="w-4 h-4 text-accent" />
                </div>
                Articles forfaitaires
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {flatRateItems.filter(i => i.isActive).length} actifs
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Prix fixe par unité, indépendant du poids
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <AnimatePresence>
              {flatRateItems.map((item) => (
                <motion.div
                  key={item.objectType.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`
                    flex items-center justify-between p-3 rounded-lg border transition-all
                    ${item.isActive 
                      ? 'bg-accent/5 border-accent/30' 
                      : 'bg-muted/30 border-border opacity-60'
                    }
                  `}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Switch
                      checked={item.isActive}
                      onCheckedChange={() => toggleFlatRateItem(item.objectType)}
                    />
                    <div>
                      <p className={`font-medium text-sm ${!item.isActive ? 'text-muted-foreground' : ''}`}>
                        {item.objectType.label}
                      </p>
                    </div>
                  </div>

                  {item.isActive && (
                    <div className="flex items-center gap-2">
                      {editingPrice === item.objectType.id ? (
                        <>
                          <Input
                            type="number"
                            value={editingPriceValue}
                            onChange={(e) => setEditingPriceValue(e.target.value)}
                            className="w-20 h-8 text-right"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => {
                              if (item.pricing) {
                                updateFlatRatePrice(item.pricing.id, Number(editingPriceValue));
                              }
                            }}
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingPrice(item.objectType.id);
                            setEditingPriceValue(String(item.price));
                          }}
                          className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          {item.price.toLocaleString()} {currencySymbol}
                          <Edit className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Section 3: Restrictions (Collapsible) */}
        <Collapsible open={restrictionsOpen} onOpenChange={setRestrictionsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <ShieldX className="w-4 h-4 text-destructive" />
                    </div>
                    Restrictions
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">
                      {restrictions.length} actives
                    </Badge>
                    {restrictionsOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-left">
                  Articles que vous ne transportez pas
                </p>
              </CardHeader>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="pt-0 space-y-2 max-h-[300px] overflow-y-auto">
                {FULL_RESTRICTIONS_LIST.map((restriction) => {
                  const Icon = restriction.icon;
                  const isSelected = restrictions.includes(restriction.id);

                  return (
                    <div
                      key={restriction.id}
                      onClick={() => toggleRestriction(restriction.id)}
                      className={`
                        flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer
                        ${isSelected 
                          ? 'border-destructive/50 bg-destructive/5' 
                          : 'border-border hover:bg-muted/50'
                        }
                      `}
                    >
                      <div className={`
                        w-7 h-7 rounded-lg flex items-center justify-center
                        ${isSelected ? 'bg-destructive/10' : 'bg-muted'}
                      `}>
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-destructive' : 'text-muted-foreground'}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${isSelected ? 'text-destructive' : ''}`}>
                          {restriction.label}
                        </p>
                      </div>

                      <Switch
                        checked={isSelected}
                        onCheckedChange={() => toggleRestriction(restriction.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Bottom padding for safe area */}
        <div className="h-4" />
      </div>
    </GPDashboardLayout>
  );
}
