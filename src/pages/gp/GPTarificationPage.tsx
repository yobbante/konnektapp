import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DollarSign, Weight, Package, Edit, Save, 
  ShieldX, ChevronRight, Check, CheckCircle2,
  Smartphone, Laptop, FileText, Gem, Tablet, Gamepad2, Wine, Car, Lock,
  TrendingUp, Scale, Zap, Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { PricingTiersDisplay } from "@/components/gp/PricingTiersDisplay";
import { type GPPricingConfig } from "@/lib/gpPricingEngine";
import { HauteSaisonToggle } from "@/components/gp/HauteSaisonToggle";
import { Separator } from "@/components/ui/separator";

interface FlatRateItem {
  id: string;
  object_type_id: string;
  price: number;
  currency: string;
  is_active: boolean;
  object_type: { name: string; label: string };
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

const FLAT_RATE_ICONS: Record<string, any> = {
  bijoux: Gem, console: Gamepad2, document: FileText, ordinateur: Laptop,
  parfum: Wine, piece_auto: Car, tablette: Tablet, telephone: Smartphone,
};

const STANDARD_FLAT_RATE_ITEMS = [
  { name: "telephone", label: "Téléphone" },
  { name: "ordinateur", label: "Ordinateur" },
  { name: "tablette", label: "Tablette" },
  { name: "console", label: "Console de jeux" },
  { name: "bijoux", label: "Bijoux" },
  { name: "parfum", label: "Parfum" },
  { name: "document", label: "Document" },
  { name: "piece_auto", label: "Pièce auto" },
];

export default function GPTarificationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromGate = searchParams.get("from") === "gate";
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<GPProfile | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [basePricePerKg, setBasePricePerKg] = useState(0);
  const [forfaitValise, setForfaitValise] = useState(0);
  const [flatRates, setFlatRates] = useState<FlatRateItem[]>([]);
  const [allObjectTypes, setAllObjectTypes] = useState<FlatRateObjectType[]>([]);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState("");
  const [showTiers, setShowTiers] = useState(false);

  useEffect(() => { loadData(); }, []);

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

      const { data: tiersData } = await supabase
        .from("gp_weight_tiers").select("*").eq("gp_id", profile.id).order("min_weight");
      if (tiersData?.length) {
        const forfaitTier = tiersData.find(t => t.min_weight === 23 && t.max_weight === 23);
        if (forfaitTier) setForfaitValise(forfaitTier.price_per_kg);
      }

      const [objRes, flatRes, countRes] = await Promise.all([
        supabase.from("flat_rate_object_types").select("*").eq("is_active", true).order("label"),
        supabase.from("gp_flat_rate_pricing").select(`id, object_type_id, price, currency, is_active, object_type:flat_rate_object_types(name, label)`).eq("gp_id", profile.id),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("gp_id", profile.id).eq("status", "pending"),
      ]);
      setAllObjectTypes(objRes.data || []);
      setFlatRates(flatRes.data as any || []);
      setPendingCount(countRes.count || 0);
    } catch (error) {
      console.error("Error loading data:", error);
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
          gp_id: gpProfile.id, object_type_id: objectType.id,
          price: objectType.default_price || 5000, currency: gpProfile.default_currency || "XOF", is_active: true,
        });
      }
      loadData();
    } catch { toast({ title: "Erreur", variant: "destructive" }); }
  };

  const updateFlatRatePrice = async (itemId: string, newPrice: number) => {
    try {
      await supabase.from("gp_flat_rate_pricing").update({ price: Math.round(newPrice) }).eq("id", itemId);
      setEditingPrice(null);
      loadData();
      toast({ title: "Prix mis à jour ✓" });
    } catch { toast({ title: "Erreur", variant: "destructive" }); }
  };

  if (loading) return <PageLoader message="Chargement..." />;
  if (!gpProfile) return null;

  const currency = gpProfile.default_currency || "XOF";
  const currencySymbol = getCurrencySymbol(currency);
  const isLocked = !!gpProfile.price_locked_at;
  const pricingConfig: GPPricingConfig = { basePricePerKg, forfaitValise23kg: forfaitValise, currency };

  const flatRateItems = STANDARD_FLAT_RATE_ITEMS.map(si => {
    const ot = allObjectTypes.find(o => o.name === si.name);
    const existing = ot ? flatRates.find(fr => fr.object_type_id === ot.id) : null;
    return { ...si, objectType: ot, pricing: existing, isActive: existing?.is_active || false, price: existing?.price || ot?.default_price || 5000 };
  });

  const activeFlatCount = flatRateItems.filter(i => i.isActive).length;

  return (
    <GPDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeTab="tarifs">
      <div className="px-4 py-3 space-y-3 pb-28">

        {/* ─── Header ─── */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Tarification
          </h2>
          <div className="flex items-center gap-1.5">
            {isLocked && (
              <Badge variant="secondary" className="text-[10px] gap-1 h-5">
                <Lock className="w-2.5 h-2.5" /> Verrouillé
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] h-5">{currency}</Badge>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 1 — TARIFS DE BASE (priorité maximale)
           ═══════════════════════════════════════════════════════════ */}
        <Card className="border-primary/20">
          <CardContent className="p-3 space-y-3">
            {/* Prix de référence inline */}
            <div className="flex items-center gap-2 text-sm font-medium">
              <Weight className="w-4 h-4 text-primary" />
              Prix de référence
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-primary/5 text-center">
                <p className="text-[10px] text-muted-foreground">Prix / kg</p>
                <p className="text-xl font-bold text-primary">{basePricePerKg.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{currencySymbol}/kg</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                <p className="text-[10px] text-muted-foreground">Forfait 23 kg</p>
                <p className="text-xl font-bold">{forfaitValise.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{currencySymbol}</p>
              </div>
            </div>

            {/* Paliers tarifaires — collapsible */}
            {basePricePerKg > 0 && forfaitValise > 0 && (
              <>
                <Separator />
                <button
                  onClick={() => setShowTiers(!showTiers)}
                  className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5" />
                    Voir les paliers automatiques
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showTiers ? 'rotate-90' : ''}`} />
                </button>
                <AnimatePresence>
                  {showTiers && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <PricingTiersDisplay config={pricingConfig} locked={isLocked} compact />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 2 — HAUTE SAISON (ajustement saisonnier)
           ═══════════════════════════════════════════════════════════ */}
        {basePricePerKg > 0 && gpProfile && (
          <HauteSaisonToggle
            gpId={gpProfile.id}
            basePricePerKg={basePricePerKg}
            currency={currency}
            onPriceChange={(newPrice) => setBasePricePerKg(newPrice)}
          />
        )}

        {/* ═══════════════════════════════════════════════════════════
            SECTION 3 — FORFAITS PAR OBJET
           ═══════════════════════════════════════════════════════════ */}
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Package className="w-4 h-4 text-accent-foreground" />
                Forfaits objets
              </div>
              <Badge variant="secondary" className="text-[10px] h-5">
                {activeFlatCount} actif{activeFlatCount > 1 ? 's' : ''}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground -mt-1 mb-2">Prix fixe par unité, indépendant du poids</p>

            <div className="grid grid-cols-1 gap-1.5">
              {flatRateItems.map((item) => {
                const Icon = FLAT_RATE_ICONS[item.name] || Package;
                return (
                  <div
                    key={item.name}
                    className={`flex items-center justify-between py-2 px-2.5 rounded-lg border transition-all
                      ${item.isActive ? 'bg-accent/5 border-accent/20' : 'bg-muted/20 border-transparent'}`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={() => item.objectType && toggleFlatRateItem(item.objectType)}
                        disabled={!item.objectType}
                        className="scale-90"
                      />
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${item.isActive ? 'text-accent-foreground' : 'text-muted-foreground'}`} />
                      <span className={`text-xs truncate ${!item.isActive ? 'text-muted-foreground' : 'font-medium'}`}>
                        {item.label}
                      </span>
                    </div>
                    {item.isActive && item.pricing && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {editingPrice === item.name ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={editingPriceValue}
                              onChange={(e) => setEditingPriceValue(e.target.value)}
                              className="w-16 h-7 text-xs text-right"
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && item.pricing && updateFlatRatePrice(item.pricing.id, Number(editingPriceValue))}
                            />
                            <button
                              onClick={() => item.pricing && updateFlatRatePrice(item.pricing.id, Number(editingPriceValue))}
                              className="p-1 rounded hover:bg-accent/10"
                            >
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingPrice(item.name); setEditingPriceValue(String(item.price)); }}
                            className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
                          >
                            {item.price.toLocaleString()} {currencySymbol}
                            <Edit className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 4 — RESTRICTIONS (lien rapide)
           ═══════════════════════════════════════════════════════════ */}
        <button
          onClick={() => navigate("/gp/restrictions")}
          className="w-full flex items-center justify-between p-3 rounded-xl border border-destructive/15 bg-destructive/5 hover:bg-destructive/10 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <ShieldX className="w-4 h-4 text-destructive" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Restrictions</p>
              <p className="text-[10px] text-muted-foreground">Articles interdits</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="text-[10px] h-5">{restrictions.length}</Badge>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </button>
      </div>

      {/* ─── Fixed footer for gate validation ─── */}
      {fromGate && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border px-4 py-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}>
          <Button
            className="w-full h-11 text-sm font-semibold gap-2"
            onClick={() => navigate("/gp/apercu?validated=tarifs")}
          >
            <CheckCircle2 className="w-4 h-4" />
            Valider mes tarifs
          </Button>
        </div>
      )}
    </GPDashboardLayout>
  );
}
