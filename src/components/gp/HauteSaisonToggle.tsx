/**
 * HauteSaisonToggle — Allows GP to toggle between normal and haute saison pricing
 * Limited to 3 toggles per year
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, History, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface HauteSaisonToggleProps {
  gpId: string;
  basePricePerKg: number;
  currency: string;
  onPriceChange?: (newPrice: number) => void;
}

interface PriceAdjustment {
  id: string;
  base_price_per_kg: number;
  haute_saison_price_per_kg: number;
  is_haute_saison: boolean;
  toggles_used_this_year: number;
  year: number;
  last_toggled_at: string | null;
}

interface ToggleHistory {
  id: string;
  action: string;
  old_price: number;
  new_price: number;
  toggles_remaining: number;
  created_at: string;
}

const MAX_TOGGLES_PER_YEAR = 3;

export function HauteSaisonToggle({ gpId, basePricePerKg, currency, onPriceChange }: HauteSaisonToggleProps) {
  const { toast } = useToast();
  const [adjustment, setAdjustment] = useState<PriceAdjustment | null>(null);
  const [history, setHistory] = useState<ToggleHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [hauteSaisonPrice, setHauteSaisonPrice] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const currencySymbol = getCurrencySymbol(currency);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadData();
  }, [gpId]);

  const loadData = async () => {
    try {
      const [adjRes, histRes] = await Promise.all([
        supabase.from("gp_price_adjustments").select("*").eq("gp_id", gpId).maybeSingle(),
        supabase.from("gp_price_adjustment_history").select("*").eq("gp_id", gpId).order("created_at", { ascending: false }).limit(10),
      ]);

      if (adjRes.data) {
        // Reset toggles if year changed
        if (adjRes.data.year !== currentYear) {
          await supabase.from("gp_price_adjustments").update({
            toggles_used_this_year: 0,
            year: currentYear,
            is_haute_saison: false,
          }).eq("id", adjRes.data.id);
          adjRes.data.toggles_used_this_year = 0;
          adjRes.data.year = currentYear;
          adjRes.data.is_haute_saison = false;
        }
        setAdjustment(adjRes.data);
        setHauteSaisonPrice(String(adjRes.data.haute_saison_price_per_kg));
      }
      setHistory(histRes.data || []);
    } catch (err) {
      console.error("Error loading price adjustments:", err);
    } finally {
      setLoading(false);
    }
  };

  const setupHauteSaison = async () => {
    const price = Number(hauteSaisonPrice);
    if (!price || price <= basePricePerKg) {
      toast({ title: "Erreur", description: `Le tarif haute saison doit être supérieur à ${basePricePerKg} ${currencySymbol}/kg`, variant: "destructive" });
      return;
    }

    try {
      if (adjustment) {
        await supabase.from("gp_price_adjustments").update({
          haute_saison_price_per_kg: price,
          base_price_per_kg: basePricePerKg,
        }).eq("id", adjustment.id);
      } else {
        await supabase.from("gp_price_adjustments").insert({
          gp_id: gpId,
          base_price_per_kg: basePricePerKg,
          haute_saison_price_per_kg: price,
        });
      }
      toast({ title: "Tarif haute saison configuré ✓" });
      setShowSetup(false);
      loadData();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const toggleHauteSaison = async () => {
    if (!adjustment) return;

    const togglesUsed = adjustment.toggles_used_this_year;
    const isActivating = !adjustment.is_haute_saison;

    // Only activating haute saison counts as a toggle, returning to base is free
    if (isActivating && togglesUsed >= MAX_TOGGLES_PER_YEAR) {
      toast({
        title: "Limite atteinte",
        description: `Vous avez utilisé vos ${MAX_TOGGLES_PER_YEAR} activations haute saison pour cette année.`,
        variant: "destructive",
      });
      return;
    }

    setToggling(true);
    try {
      const oldPrice = adjustment.is_haute_saison ? adjustment.haute_saison_price_per_kg : adjustment.base_price_per_kg;
      const newPrice = isActivating ? adjustment.haute_saison_price_per_kg : adjustment.base_price_per_kg;
      // Only increment counter when ACTIVATING haute saison
      const newToggles = isActivating ? togglesUsed + 1 : togglesUsed;

      // Update adjustment
      await supabase.from("gp_price_adjustments").update({
        is_haute_saison: isActivating,
        toggles_used_this_year: newToggles,
        last_toggled_at: new Date().toISOString(),
      }).eq("id", adjustment.id);

      // Update actual GP price
      await supabase.from("gp_profiles").update({
        base_price_per_kg: newPrice,
      }).eq("id", gpId);

      // Log history
      await supabase.from("gp_price_adjustment_history").insert({
        gp_id: gpId,
        action: isActivating ? "activate_haute_saison" : "deactivate_haute_saison",
        old_price: oldPrice,
        new_price: newPrice,
        toggles_remaining: MAX_TOGGLES_PER_YEAR - newToggles,
      });

      toast({
        title: isActivating ? "🔥 Tarif haute saison activé" : "✓ Retour au tarif normal",
        description: `Nouveau prix : ${newPrice.toLocaleString()} ${currencySymbol}/kg — ${MAX_TOGGLES_PER_YEAR - newToggles} modification(s) restante(s)`,
      });

      onPriceChange?.(newPrice);
      loadData();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setToggling(false);
    }
  };

  if (loading) return null;

  const togglesRemaining = adjustment ? MAX_TOGGLES_PER_YEAR - adjustment.toggles_used_this_year : MAX_TOGGLES_PER_YEAR;
  const isActive = adjustment?.is_haute_saison ?? false;

  return (
    <Card className={isActive ? "border-2 border-orange-400/50 bg-orange-500/5" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? "bg-orange-500/15" : "bg-muted"}`}>
              <TrendingUp className={`w-4 h-4 ${isActive ? "text-orange-500" : "text-muted-foreground"}`} />
            </div>
            Tarif haute saison
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isActive ? "default" : "secondary"} className={`text-xs ${isActive ? "bg-orange-500 hover:bg-orange-600" : ""}`}>
              {isActive ? "🔥 Actif" : "Normal"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {togglesRemaining}/{MAX_TOGGLES_PER_YEAR} restants
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Ajustez votre tarif pendant les périodes de hausse de billets ({MAX_TOGGLES_PER_YEAR} changements/an)
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {!adjustment ? (
          // Setup mode
          <div className="space-y-3">
            {showSetup ? (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Tarif normal actuel</Label>
                  <p className="text-lg font-bold">{basePricePerKg.toLocaleString()} {currencySymbol}/kg</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tarif haute saison</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      value={hauteSaisonPrice}
                      onChange={(e) => setHauteSaisonPrice(e.target.value)}
                      placeholder={String(Math.round(basePricePerKg * 1.3))}
                      className="flex-1"
                    />
                    <span className="flex items-center text-sm text-muted-foreground">{currencySymbol}/kg</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Suggestion : +20-30% du tarif normal ({Math.round(basePricePerKg * 1.2).toLocaleString()} - {Math.round(basePricePerKg * 1.3).toLocaleString()} {currencySymbol})
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowSetup(false)} className="flex-1">Annuler</Button>
                  <Button size="sm" onClick={setupHauteSaison} className="flex-1">Configurer</Button>
                </div>
              </motion.div>
            ) : (
              <Button variant="outline" className="w-full gap-2" onClick={() => { setHauteSaisonPrice(String(Math.round(basePricePerKg * 1.25))); setShowSetup(true); }}>
                <Zap className="w-4 h-4" />
                Configurer un tarif haute saison
              </Button>
            )}
          </div>
        ) : (
          // Toggle mode
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg text-center border-2 transition-all ${!isActive ? "border-primary/40 bg-primary/5" : "border-transparent bg-muted/50"}`}>
                <p className="text-[10px] text-muted-foreground mb-1">Tarif normal</p>
                <p className="text-xl font-bold">{adjustment.base_price_per_kg.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{currencySymbol}/kg</p>
              </div>
              <div className={`p-3 rounded-lg text-center border-2 transition-all ${isActive ? "border-orange-400/60 bg-orange-500/10" : "border-transparent bg-muted/50"}`}>
                <p className="text-[10px] text-muted-foreground mb-1">Haute saison</p>
                <p className="text-xl font-bold text-orange-600">{adjustment.haute_saison_price_per_kg.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{currencySymbol}/kg</p>
              </div>
            </div>

            {togglesRemaining > 0 ? (
              <Button
                className={`w-full gap-2 h-11 ${isActive ? "" : "bg-orange-500 hover:bg-orange-600 text-white"}`}
                variant={isActive ? "outline" : "default"}
                onClick={toggleHauteSaison}
                disabled={toggling}
              >
                {toggling ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isActive ? (
                  <>
                    <TrendingDown className="w-4 h-4" />
                    Revenir au tarif normal
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    Activer le tarif haute saison
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                <p className="text-xs text-destructive">
                  Vous avez utilisé vos {MAX_TOGGLES_PER_YEAR} modifications pour {currentYear}. Renouvellement en janvier.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() => { setHauteSaisonPrice(String(adjustment.haute_saison_price_per_kg)); setShowSetup(true); }}
                className="text-xs text-primary hover:underline"
              >
                Modifier le tarif haute saison
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <History className="w-3 h-3" />
                Historique
              </button>
            </div>

            <AnimatePresence>
              {showHistory && history.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1.5 pt-2 border-t border-border">
                    {history.map((h) => (
                      <div key={h.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2">
                          {h.action === "activate_haute_saison" ? (
                            <TrendingUp className="w-3 h-3 text-orange-500" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-primary" />
                          )}
                          <span>
                            {h.old_price.toLocaleString()} → {h.new_price.toLocaleString()} {currencySymbol}
                          </span>
                        </div>
                        <span className="text-muted-foreground">
                          {format(new Date(h.created_at), "dd MMM", { locale: fr })}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
