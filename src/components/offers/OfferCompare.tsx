import { useState, createContext, useContext, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Scale, ArrowRight, MapPin, Calendar, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getTransportIcon, getTransportLabel } from "@/lib/transportTypes";

export interface CompareOffer {
  id: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  departure_date: string;
  price_per_kg: number;
  currency: string;
  transport_type: string;
  available_capacity: number;
  gp_name: string;
  gp_rating: number | null;
}

interface CompareContextType {
  compareList: CompareOffer[];
  addToCompare: (offer: CompareOffer) => boolean;
  removeFromCompare: (offerId: string) => void;
  clearCompare: () => void;
  isInCompare: (offerId: string) => boolean;
  showComparePanel: boolean;
  setShowComparePanel: (show: boolean) => void;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareList, setCompareList] = useState<CompareOffer[]>([]);
  const [showComparePanel, setShowComparePanel] = useState(false);

  const addToCompare = (offer: CompareOffer): boolean => {
    if (compareList.length >= 3) return false;
    if (compareList.some(o => o.id === offer.id)) return false;
    
    setCompareList(prev => [...prev, offer]);
    if (compareList.length === 0) setShowComparePanel(true);
    return true;
  };

  const removeFromCompare = (offerId: string) => {
    setCompareList(prev => prev.filter(o => o.id !== offerId));
  };

  const clearCompare = () => {
    setCompareList([]);
    setShowComparePanel(false);
  };

  const isInCompare = (offerId: string) => {
    return compareList.some(o => o.id === offerId);
  };

  return (
    <CompareContext.Provider value={{
      compareList,
      addToCompare,
      removeFromCompare,
      clearCompare,
      isInCompare,
      showComparePanel,
      setShowComparePanel,
    }}>
      {children}
      <ComparePanel />
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error("useCompare must be used within a CompareProvider");
  }
  return context;
}

function ComparePanel() {
  const { compareList, removeFromCompare, clearCompare, showComparePanel, setShowComparePanel } = useCompare();

  if (compareList.length === 0) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    });
  };

  // Find best values for highlighting
  const lowestPrice = Math.min(...compareList.map(o => o.price_per_kg));
  const highestCapacity = Math.max(...compareList.map(o => o.available_capacity));
  const highestRating = Math.max(...compareList.map(o => o.gp_rating || 0));

  return (
    <AnimatePresence>
      {showComparePanel && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-2xl rounded-t-2xl max-h-[80vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">
                Comparaison ({compareList.length}/3)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={clearCompare}>
                Effacer
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowComparePanel(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Comparison Grid */}
          <div className="overflow-x-auto p-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${compareList.length}, minmax(200px, 1fr))` }}>
              {compareList.map((offer) => {
                const TransportIcon = getTransportIcon(offer.transport_type);
                const isBestPrice = offer.price_per_kg === lowestPrice;
                const isBestCapacity = offer.available_capacity === highestCapacity;
                const isBestRating = (offer.gp_rating || 0) === highestRating && highestRating > 0;

                return (
                  <motion.div
                    key={offer.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-muted/50 rounded-xl p-4 relative"
                  >
                    {/* Remove Button */}
                    <button
                      onClick={() => removeFromCompare(offer.id)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* Transport Type */}
                    <Badge variant={offer.transport_type as any} className="mb-3 text-xs">
                      <TransportIcon className="w-3 h-3 mr-1" />
                      {getTransportLabel(offer.transport_type)}
                    </Badge>

                    {/* Route */}
                    <div className="flex items-center gap-1 text-sm font-medium mb-2">
                      <span>{offer.origin_city}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span>{offer.destination_city}</span>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                      <Calendar className="w-3 h-3" />
                      {formatDate(offer.departure_date)}
                    </div>

                    {/* Comparison Rows */}
                    <div className="space-y-3">
                      {/* Price */}
                      <div className={`flex items-center justify-between p-2 rounded-lg ${isBestPrice ? 'bg-success/10 border border-success/20' : 'bg-background'}`}>
                        <span className="text-xs text-muted-foreground">Prix/kg</span>
                        <div className="flex items-center gap-1">
                          {isBestPrice && <Check className="w-3 h-3 text-success" />}
                          <span className={`font-bold text-sm ${isBestPrice ? 'text-success' : ''}`}>
                            {offer.price_per_kg} {offer.currency}
                          </span>
                        </div>
                      </div>

                      {/* Capacity */}
                      <div className={`flex items-center justify-between p-2 rounded-lg ${isBestCapacity ? 'bg-primary/10 border border-primary/20' : 'bg-background'}`}>
                        <span className="text-xs text-muted-foreground">Capacité</span>
                        <div className="flex items-center gap-1">
                          {isBestCapacity && <Check className="w-3 h-3 text-primary" />}
                          <span className={`font-bold text-sm ${isBestCapacity ? 'text-primary' : ''}`}>
                            {offer.available_capacity} kg
                          </span>
                        </div>
                      </div>

                      {/* GP */}
                      <div className={`flex items-center justify-between p-2 rounded-lg ${isBestRating ? 'bg-warning/10 border border-warning/20' : 'bg-background'}`}>
                        <span className="text-xs text-muted-foreground">GP</span>
                        <div className="text-right">
                          <p className="text-xs font-medium truncate max-w-[100px]">{offer.gp_name}</p>
                          {offer.gp_rating && (
                            <div className="flex items-center gap-1 justify-end">
                              {isBestRating && <Check className="w-3 h-3 text-warning" />}
                              <Star className="w-3 h-3 text-warning fill-warning" />
                              <span className="text-xs">{offer.gp_rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="px-4 pb-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-success" />
                <span>Meilleur prix</span>
              </div>
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-primary" />
                <span>Plus grande capacité</span>
              </div>
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-warning" />
                <span>Meilleure note</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Floating Button when panel is hidden */}
      {!showComparePanel && compareList.length > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setShowComparePanel(true)}
          className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
        >
          <Scale className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-secondary text-secondary-foreground text-xs flex items-center justify-center font-bold">
            {compareList.length}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
