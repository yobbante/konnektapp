import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DollarSign, Weight, Package, Edit, Save, 
  ShieldX, ChevronDown, ChevronUp, Check, CheckCircle2,
  Smartphone, Laptop, FileText, Gem, Tablet, Gamepad2, Wine, Car, Lock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { FULL_RESTRICTIONS_LIST } from "@/components/gp/RestrictionsManager";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PricingTiersDisplay } from "@/components/gp/PricingTiersDisplay";
import { type GPPricingConfig } from "@/lib/gpPricingEngine";
import { HauteSaisonToggle } from "@/components/gp/HauteSaisonToggle";

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
  base_price_per_kg?: number | null;
  price_locked_at?: string | null;
}

// Standard flat rate items
const STANDARD_FLAT_RATE_ITEMS = [
  { name: "bijoux", label: "Bijoux", icon: Gem },
  { name: "console", label: "Console de jeux", icon: Gamepad2 },
  { name: "document", label: "Document administratif", icon: FileText },
  { name: "ordinateur", label: "Ordinateur", icon: Laptop },
  { name: "parfum", label: "Parfum", icon: Wine },
  { name: "piece_auto", label: "Pièce automobile", icon: Car },
  { name: "tablette", label: "Tablette", icon: Tablet },
  { name: "telephone", label: "Téléphone", icon: Smartphone },
];

export default function GPTarificationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromGate = searchParams.get("from") === "gate";
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gpProfile, setGpProfile] = useState<GPProfile | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [basePricePerKg, setBasePricePerKg] = useState(0);
  const [forfaitValise, setForfaitValise] = useState(0);
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
      if (!user) { navigate("/auth"); return; }

      const { data: profile } = await supabase
        .from("gp_profiles")
        .select("id, business_name, gp_type, status, default_currency, explicit_restrictions, base_price_per_kg, price_locked_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) { navigate("/transporteur/inscription"); return; }

      setGpProfile(profile);
      setRestrictions(profile.explicit_restrictions || []);
      setBasePricePerKg(profile.base_price_per_kg || 0);

      // Load weight tiers to find forfait valise 23kg
      const { data: tiersData } = await supabase
        .from("gp_weight_tiers")
        .select("*")
        .eq("gp_id", profile.id)
        .order("min_weight");

      if (tiersData && tiersData.length > 0) {
        const forfaitTier = tiersData.find(t => t.min_weight === 23 && t.max_weight === 23);
        if (forfaitTier) {
          setForfaitValise(forfaitTier.price_per_kg);
        }
      }

      // Load flat rate data
      const { data: objectTypes } = await supabase
        .from("flat_rate_object_types")
        .select("*")
        .eq("is_active", true)
        .order("label");

      setAllObjectTypes(objectTypes || []);

      const { data: flatRateData } = await supabase
        .from("gp_flat_rate_pricing")
        .select(`
          id, object_type_id, price, currency, is_active,
          object_type:flat_rate_object_types(name, label)
        `)
        .eq("gp_id", profile.id);

      setFlatRates(flatRateData as any || []);

      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("gp_id", profile.id)
        .eq("status", "pending");

      setPendingCount(count || 0);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Erreur", description: "Impossible de charger les données", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleFlatRateItem = async (objectType: FlatRateObjectType) => {
    if (!gpProfile) return;
    const existing = flatRates.find(fr => fr.object_type_id === objectType.id);
    
    try {
      if (existing) {
        await supabase.from("gp_flat_rate_pricing").update({ is_active: !existing.is_active }).eq("id", existing.id);
      } else {
        await supabase.from("gp_flat_rate_pricing").insert({
          gp_id: gpProfile.id,
          object_type_id: objectType.id,
          price: objectType.default_price || 5000,
          currency: gpProfile.default_currency || "XOF",
          is_active: true,
        });
      }
      loadData();
      toast({ title: existing?.is_active ? "Article désactivé" : "Article activé" });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const updateFlatRatePrice = async (itemId: string, newPrice: number) => {
    try {
      await supabase.from("gp_flat_rate_pricing").update({ price: Math.round(newPrice) }).eq("id", itemId);
      setEditingPrice(null);
      loadData();
      toast({ title: "Prix mis à jour" });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const toggleRestriction = async (restrictionId: string) => {
    if (!gpProfile) return;
    const newRestrictions = restrictions.includes(restrictionId)
      ? restrictions.filter(r => r !== restrictionId)
      : [...restrictions, restrictionId];

    try {
      await supabase.from("gp_profiles").update({ explicit_restrictions: newRestrictions }).eq("id", gpProfile.id);
      setRestrictions(newRestrictions);
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  if (loading) return <PageLoader message="Chargement des tarifs..." />;
  if (!gpProfile) return null;

  const currency = gpProfile.default_currency || "XOF";
  const currencySymbol = getCurrencySymbol(currency);
  const isLocked = !!gpProfile.price_locked_at;

  const pricingConfig: GPPricingConfig = {
    basePricePerKg,
    forfaitValise23kg: forfaitValise,
    currency,
  };

  // Merge flat rates with standard items
  const flatRateItems = STANDARD_FLAT_RATE_ITEMS.map(standardItem => {
    const objectType = allObjectTypes.find(ot => ot.name === standardItem.name);
    const existing = objectType ? flatRates.find(fr => fr.object_type_id === objectType.id) : null;
    return {
      standardItem,
      objectType,
      pricing: existing,
      isActive: existing?.is_active || false,
      price: existing?.price || objectType?.default_price || 5000,
    };
  });

  return (
    <GPDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeTab="tarifs">
      <div className="px-4 py-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Mes tarifs</h2>
          <div className="flex items-center gap-2">
            {isLocked && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Lock className="w-3 h-3" /> Verrouillé
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">{currency}</Badge>
          </div>
        </div>

        {/* Section 1: Locked base pricing */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Weight className="w-4 h-4 text-primary" />
              </div>
              Prix de référence
              {isLocked && <Lock className="w-4 h-4 text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">Prix/kg</p>
                <p className="text-2xl font-bold text-primary">
                  {basePricePerKg.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{currencySymbol}/kg</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">Forfait 23kg</p>
                <p className="text-2xl font-bold text-accent-foreground">
                  {forfaitValise.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{currencySymbol}</p>
              </div>
            </div>
            {isLocked && (
              <p className="text-xs text-muted-foreground text-center italic">
                Vos tarifs de base sont verrouillés depuis l'inscription
              </p>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Auto-calculated tiers */}
        {basePricePerKg > 0 && forfaitValise > 0 && (
          <Card>
            <CardContent className="p-4">
              <PricingTiersDisplay config={pricingConfig} locked={isLocked} />
            </CardContent>
          </Card>
        )}

        {/* Section: Haute Saison Toggle */}
        {basePricePerKg > 0 && gpProfile && (
          <HauteSaisonToggle
            gpId={gpProfile.id}
            basePricePerKg={basePricePerKg}
            currency={currency}
            onPriceChange={(newPrice) => setBasePricePerKg(newPrice)}
          />
        )}

        {/* Section 3: Flat rate items */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Package className="w-4 h-4 text-accent-foreground" />
                </div>
                Forfaits par objet
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {flatRateItems.filter(i => i.isActive).length} actifs
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Prix fixe par unité, indépendant du poids</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <AnimatePresence>
              {flatRateItems.map((item) => {
                const Icon = item.standardItem.icon;
                return (
                  <motion.div
                    key={item.standardItem.name}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all
                      ${item.isActive ? 'bg-accent/5 border-accent/30' : 'bg-muted/30 border-border opacity-60'}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.isActive ? 'bg-accent/10' : 'bg-muted'}`}>
                        <Icon className={`w-4 h-4 ${item.isActive ? 'text-accent-foreground' : 'text-muted-foreground'}`} />
                      </div>
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={() => item.objectType && toggleFlatRateItem(item.objectType)}
                        disabled={!item.objectType}
                      />
                      <p className={`font-medium text-sm ${!item.isActive ? 'text-muted-foreground' : ''}`}>
                        {item.standardItem.label}
                      </p>
                    </div>
                    {item.isActive && item.pricing && (
                      <div className="flex items-center gap-2">
                        {editingPrice === item.standardItem.name ? (
                          <>
                            <Input
                              type="number"
                              value={editingPriceValue}
                              onChange={(e) => setEditingPriceValue(e.target.value)}
                              className="w-20 h-8 text-right"
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8"
                              onClick={() => item.pricing && updateFlatRatePrice(item.pricing.id, Number(editingPriceValue))}
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </Button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingPrice(item.standardItem.name);
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
                );
              })}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Link to restrictions page */}
        <Card className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate("/gp/restrictions")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <ShieldX className="w-4 h-4 text-destructive" />
                </div>
                Restrictions
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">{restrictions.length} actives</Badge>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-left">Gérer les articles interdits →</p>
          </CardHeader>
        </Card>

        {/* Validate button when coming from gate */}
        {fromGate && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border px-4 py-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}>
            <Button
              className="w-full h-12 text-sm font-semibold gap-2 shadow-lg"
              onClick={() => navigate("/gp/apercu?validated=tarifs")}
            >
              <CheckCircle2 className="w-5 h-5" />
              Valider mes tarifs
            </Button>
          </div>
        )}

        <div className="h-4" />
      </div>
    </GPDashboardLayout>
  );
}
