/**
 * HauteSaisonToggle — Compact haute saison pricing toggle
 * Active state badge floats to top header
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, AlertTriangle, History, Zap, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

  useEffect(() => { loadData(); }, [gpId]);

  const loadData = async () => {
    try {
      const [adjRes, histRes] = await Promise.all([
        supabase.from("gp_price_adjustments").select("*").eq("gp_id", gpId).maybeSingle(),
        supabase.from("gp_price_adjustment_history").select("*").eq("gp_id", gpId).order("created_at", { ascending: false }).limit(10),
      ]);
      if (adjRes.data) {
        if (adjRes.data.year !== currentYear) {
          await supabase.from("gp_price_adjustments").update({ toggles_used_this_year: 0, year: currentYear, is_haute_saison: false }).eq("id", adjRes.data.id);
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
        await supabase.from("gp_price_adjustments").update({ haute_saison_price_per_kg: price, base_price_per_kg: basePricePerKg }).eq("id", adjustment.id);
      } else {
        await supabase.from("gp_price_adjustments").insert({ gp_id: gpId, base_price_per_kg: basePricePerKg, haute_saison_price_per_kg: price });
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

    if (isActivating && togglesUsed >= MAX_TOGGLES_PER_YEAR) {
      toast({ title: "Limite atteinte", description: `Vous avez utilisé vos ${MAX_TOGGLES_PER_YEAR} activations pour cette année.`, variant: "destructive" });
      return;
    }

    setToggling(true);
    try {
      const oldPrice = adjustment.is_haute_saison ? adjustment.haute_saison_price_per_kg : adjustment.base_price_per_kg;
      const newPrice = isActivating ? adjustment.haute_saison_price_per_kg : adjustment.base_price_per_kg;
      const newToggles = isActivating ? togglesUsed + 1 : togglesUsed;

      await supabase.from("gp_price_adjustments").update({ is_haute_saison: isActivating, toggles_used_this_year: newToggles, last_toggled_at: new Date().toISOString() }).eq("id", adjustment.id);
      await supabase.from("gp_profiles").update({ base_price_per_kg: newPrice }).eq("id", gpId);
      await supabase.from("gp_price_adjustment_history").insert({ gp_id: gpId, action: isActivating ? "activate_haute_saison" : "deactivate_haute_saison", old_price: oldPrice, new_price: newPrice, toggles_remaining: MAX_TOGGLES_PER_YEAR - newToggles });

      toast({
        title: isActivating ? "🔥 Haute saison activée" : "✓ Tarif normal",
        description: `${newPrice.toLocaleString()} ${currencySymbol}/kg — ${MAX_TOGGLES_PER_YEAR - newToggles} restant(s)`,
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
    <div className={`rounded-xl border overflow-hidden transition-all ${isActive ? "border-orange-400/40 bg-orange-500/5" : "border-border bg-card"}`}>
      {/* Active banner — shown at top when haute saison is ON */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-center gap-1.5 py-1.5 bg-orange-500 text-white text-[11px] font-semibold">
              <Flame className="w-3 h-3" />
              Haute saison active — {adjustment?.haute_saison_price_per_kg.toLocaleString()} {currencySymbol}/kg
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isActive ? "bg-orange-500/15" : "bg-muted"}`}>
            <TrendingUp className={`w-3.5 h-3.5 ${isActive ? "text-orange-500" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Haute saison</p>
            <p className="text-[10px] text-muted-foreground">{togglesRemaining}/{MAX_TOGGLES_PER_YEAR} restants</p>
          </div>
        </div>
        {adjustment && togglesRemaining > 0 && (
          <Switch
            checked={isActive}
            onCheckedChange={toggleHauteSaison}
            disabled={toggling}
            className={isActive ? "data-[state=checked]:bg-orange-500" : ""}
          />
        )}
      </div>

      {/* Content */}
      <div className="px-3 pb-3 space-y-2">
        {!adjustment ? (
          /* Setup mode */
          showSetup ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label className="text-[10px] text-muted-foreground">Normal</Label>
                  <p className="text-sm font-bold">{basePricePerKg.toLocaleString()} {currencySymbol}/kg</p>
                </div>
                <div className="flex-1">
                  <Label className="text-[10px] text-muted-foreground">Haute saison</Label>
                  <div className="flex gap-1 mt-0.5">
                    <Input type="number" value={hauteSaisonPrice} onChange={(e) => setHauteSaisonPrice(e.target.value)} placeholder={String(Math.round(basePricePerKg * 1.3))} className="h-8 text-sm" />
                    <span className="flex items-center text-[10px] text-muted-foreground whitespace-nowrap">{currencySymbol}/kg</span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Suggestion : {Math.round(basePricePerKg * 1.2).toLocaleString()} - {Math.round(basePricePerKg * 1.3).toLocaleString()} {currencySymbol}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowSetup(false)} className="flex-1 h-8 text-xs">Annuler</Button>
                <Button size="sm" onClick={setupHauteSaison} className="flex-1 h-8 text-xs">Configurer</Button>
              </div>
            </motion.div>
          ) : (
            <Button variant="outline" size="sm" className="w-full gap-1.5 h-8 text-xs" onClick={() => { setHauteSaisonPrice(String(Math.round(basePricePerKg * 1.25))); setShowSetup(true); }}>
              <Zap className="w-3.5 h-3.5" />
              Configurer
            </Button>
          )
        ) : (
          /* Toggle mode */
          <>
            {/* Price comparison — compact inline */}
            <div className="flex gap-2">
              <div className={`flex-1 py-1.5 px-2.5 rounded-lg text-center border transition-all ${!isActive ? "border-primary/30 bg-primary/5" : "border-transparent bg-muted/40"}`}>
                <p className="text-[9px] text-muted-foreground uppercase">Normal</p>
                <p className="text-base font-bold leading-tight">{adjustment.base_price_per_kg.toLocaleString()}</p>
                <p className="text-[9px] text-muted-foreground">{currencySymbol}/kg</p>
              </div>
              <div className={`flex-1 py-1.5 px-2.5 rounded-lg text-center border transition-all ${isActive ? "border-orange-400/50 bg-orange-500/10" : "border-transparent bg-muted/40"}`}>
                <p className="text-[9px] text-muted-foreground uppercase">Haute saison</p>
                <p className={`text-base font-bold leading-tight ${isActive ? "text-orange-600" : ""}`}>{adjustment.haute_saison_price_per_kg.toLocaleString()}</p>
                <p className="text-[9px] text-muted-foreground">{currencySymbol}/kg</p>
              </div>
            </div>

            {togglesRemaining <= 0 && (
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                <p className="text-[10px] text-destructive">{MAX_TOGGLES_PER_YEAR} modifications utilisées pour {currentYear}.</p>
              </div>
            )}

            {/* Actions row */}
            <div className="flex items-center justify-between pt-0.5">
              <button onClick={() => { setHauteSaisonPrice(String(adjustment.haute_saison_price_per_kg)); setShowSetup(true); }} className="text-[11px] text-primary hover:underline">
                Modifier
              </button>
              <button onClick={() => setShowHistory(!showHistory)} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                <History className="w-3 h-3" />
                Historique
              </button>
            </div>

            {/* History */}
            <AnimatePresence>
              {showHistory && history.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="space-y-1 pt-1.5 border-t border-border">
                    {history.map((h) => (
                      <div key={h.id} className="flex items-center justify-between text-[10px] py-1 px-1.5 rounded bg-muted/30">
                        <div className="flex items-center gap-1.5">
                          {h.action === "activate_haute_saison" ? <TrendingUp className="w-2.5 h-2.5 text-orange-500" /> : <TrendingDown className="w-2.5 h-2.5 text-primary" />}
                          <span>{h.old_price.toLocaleString()} → {h.new_price.toLocaleString()} {currencySymbol}</span>
                        </div>
                        <span className="text-muted-foreground">{format(new Date(h.created_at), "dd MMM", { locale: fr })}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
