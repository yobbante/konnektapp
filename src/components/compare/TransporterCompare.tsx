import { useState, createContext, useContext, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Scale, ArrowRight, Star, Check, Truck, Shield, 
  TrendingUp, Package, Clock, ChevronUp, ChevronDown,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrencySymbol } from "@/lib/utils";

export interface CompareTransporter {
  id: string;
  business_name: string;
  gp_type: string;
  rating: number | null;
  total_reviews: number;
  total_deliveries: number;
  verified_at: string | null;
  price_per_kg?: number;
  currency?: string;
  restrictions?: string[];
  city?: string;
  country_code?: string;
}

interface TransporterCompareContextType {
  compareList: CompareTransporter[];
  addToCompare: (transporter: CompareTransporter) => boolean;
  removeFromCompare: (gpId: string) => void;
  clearCompare: () => void;
  isInCompare: (gpId: string) => boolean;
  showComparePanel: boolean;
  setShowComparePanel: (show: boolean) => void;
}

const TransporterCompareContext = createContext<TransporterCompareContextType | undefined>(undefined);

export function TransporterCompareProvider({ children }: { children: ReactNode }) {
  const [compareList, setCompareList] = useState<CompareTransporter[]>([]);
  const [showComparePanel, setShowComparePanel] = useState(false);

  const addToCompare = (transporter: CompareTransporter): boolean => {
    if (compareList.length >= 3) return false;
    if (compareList.some(t => t.id === transporter.id)) return false;
    
    setCompareList(prev => [...prev, transporter]);
    if (compareList.length === 0) setShowComparePanel(true);
    return true;
  };

  const removeFromCompare = (gpId: string) => {
    setCompareList(prev => prev.filter(t => t.id !== gpId));
  };

  const clearCompare = () => {
    setCompareList([]);
    setShowComparePanel(false);
  };

  const isInCompare = (gpId: string) => {
    return compareList.some(t => t.id === gpId);
  };

  return (
    <TransporterCompareContext.Provider value={{
      compareList,
      addToCompare,
      removeFromCompare,
      clearCompare,
      isInCompare,
      showComparePanel,
      setShowComparePanel,
    }}>
      {children}
      <TransporterComparePanel />
    </TransporterCompareContext.Provider>
  );
}

export function useTransporterCompare() {
  const context = useContext(TransporterCompareContext);
  if (!context) {
    throw new Error("useTransporterCompare must be used within a TransporterCompareProvider");
  }
  return context;
}

function TransporterComparePanel() {
  const { compareList, removeFromCompare, clearCompare, showComparePanel, setShowComparePanel } = useTransporterCompare();
  const [expanded, setExpanded] = useState(true);

  if (compareList.length === 0) return null;

  // Find best values for highlighting
  const bestRating = Math.max(...compareList.map(t => t.rating || 0));
  const lowestPrice = Math.min(...compareList.filter(t => t.price_per_kg).map(t => t.price_per_kg!));
  const mostDeliveries = Math.max(...compareList.map(t => t.total_deliveries || 0));

  const gpTypeLabels: Record<string, string> = {
    express: "Express",
    routier: "Routier",
    maritime: "Maritime",
    aerien: "Aérien",
    voyageur: "Voyageur",
    agence: "Agence",
    bagages_international: "Bagages International",
  };

  return (
    <AnimatePresence>
      {showComparePanel && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-2xl rounded-t-2xl max-h-[85vh] overflow-hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">
                Comparer les transporteurs ({compareList.length}/3)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={clearCompare}>
                Effacer
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowComparePanel(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Comparison Grid */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="overflow-x-auto p-4">
                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${compareList.length}, minmax(220px, 1fr))` }}>
                    {compareList.map((transporter) => {
                      const isBestRating = (transporter.rating || 0) === bestRating && bestRating > 0;
                      const isBestPrice = transporter.price_per_kg === lowestPrice;
                      const isMostDeliveries = transporter.total_deliveries === mostDeliveries && mostDeliveries > 0;

                      return (
                        <motion.div
                          key={transporter.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-muted/50 rounded-xl p-4 relative"
                        >
                          {/* Remove Button */}
                          <button
                            onClick={() => removeFromCompare(transporter.id)}
                            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          {/* Header */}
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Truck className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{transporter.business_name}</p>
                              <Badge variant="outline" className="text-[10px] mt-0.5">
                                {gpTypeLabels[transporter.gp_type] || transporter.gp_type}
                              </Badge>
                            </div>
                          </div>

                          {/* Verification Badge */}
                          {transporter.verified_at && (
                            <div className="flex items-center gap-1 text-xs text-success mb-3">
                              <Shield className="w-3 h-3" />
                              <span>Vérifié</span>
                            </div>
                          )}

                          {/* Comparison Rows */}
                          <div className="space-y-2">
                            {/* Rating */}
                            <div className={`flex items-center justify-between p-2 rounded-lg ${isBestRating ? 'bg-warning/10 border border-warning/20' : 'bg-background'}`}>
                              <span className="text-xs text-muted-foreground">Note</span>
                              <div className="flex items-center gap-1">
                                {isBestRating && <Check className="w-3 h-3 text-warning" />}
                                <Star className="w-3 h-3 text-warning fill-warning" />
                                <span className={`font-bold text-sm ${isBestRating ? 'text-warning' : ''}`}>
                                  {transporter.rating?.toFixed(1) || "N/A"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({transporter.total_reviews})
                                </span>
                              </div>
                            </div>

                            {/* Price */}
                            {transporter.price_per_kg && (
                              <div className={`flex items-center justify-between p-2 rounded-lg ${isBestPrice ? 'bg-success/10 border border-success/20' : 'bg-background'}`}>
                                <span className="text-xs text-muted-foreground">Prix/kg</span>
                                <div className="flex items-center gap-1">
                                  {isBestPrice && <Check className="w-3 h-3 text-success" />}
                                  <span className={`font-bold text-sm ${isBestPrice ? 'text-success' : ''}`}>
                                    {transporter.price_per_kg} {getCurrencySymbol(transporter.currency || "EUR")}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Deliveries */}
                            <div className={`flex items-center justify-between p-2 rounded-lg ${isMostDeliveries ? 'bg-primary/10 border border-primary/20' : 'bg-background'}`}>
                              <span className="text-xs text-muted-foreground">Livraisons</span>
                              <div className="flex items-center gap-1">
                                {isMostDeliveries && <Check className="w-3 h-3 text-primary" />}
                                <Package className="w-3 h-3" />
                                <span className={`font-bold text-sm ${isMostDeliveries ? 'text-primary' : ''}`}>
                                  {transporter.total_deliveries || 0}
                                </span>
                              </div>
                            </div>

                            {/* Restrictions indicator */}
                            {transporter.restrictions && transporter.restrictions.length > 0 && (
                              <div className="flex items-center gap-1 p-2 rounded-lg bg-destructive/5 text-destructive text-xs">
                                <AlertTriangle className="w-3 h-3" />
                                <span>{transporter.restrictions.length} restriction(s)</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Legend */}
                <div className="px-4 pb-4">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Check className="w-3 h-3 text-warning" />
                      <span>Meilleure note</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Check className="w-3 h-3 text-success" />
                      <span>Meilleur prix</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Check className="w-3 h-3 text-primary" />
                      <span>+ d'expérience</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Floating Button when panel is hidden */}
      {!showComparePanel && compareList.length > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setShowComparePanel(true)}
          className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-secondary text-secondary-foreground shadow-lg flex items-center justify-center"
          style={{ bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}
        >
          <Scale className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
            {compareList.length}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
