import { motion, AnimatePresence } from "framer-motion";
import { Package, Shield, Truck, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";
import { DualCurrencyCompact } from "@/components/booking/DualCurrencyDisplay";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { cn } from "@/lib/utils";

interface FloatingRecapProps {
  weight: number;
  flatRateCount: number;
  transportTotal: number;
  insuranceTotal: number;
  logisticsTotal: number;
  grandTotal: number;
  currency: string;
  getFCFAEquivalent: (amount: number) => number;
  hasInsurance: boolean;
  hasLogistics: boolean;
  currentStep: number;
  className?: string;
}

export function FloatingRecap({
  weight,
  flatRateCount,
  transportTotal,
  insuranceTotal,
  logisticsTotal,
  grandTotal,
  currency,
  getFCFAEquivalent,
  hasInsurance,
  hasLogistics,
  currentStep,
  className,
}: FloatingRecapProps) {
  const [expanded, setExpanded] = useState(false);
  const currencySymbol = getCurrencySymbol(currency);
  
  const hasItems = weight > 0 || flatRateCount > 0;
  
  // Don't show on step 5 (full recap) or if no items
  if (currentStep === 5 || !hasItems) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className={cn(
        "fixed left-0 right-0 z-40 transition-all",
        "bottom-[76px]", // Above the navigation bar
        className
      )}
      style={{ paddingBottom: 'var(--safe-bottom, 0px)' }}
    >
      <div className="max-w-lg mx-auto px-4">
        <div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-lg overflow-hidden">
          {/* Collapsed header - always visible */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full p-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Récapitulatif</p>
                <div className="flex items-center gap-2 text-sm">
                  {weight > 0 && <span>{weight}kg</span>}
                  {weight > 0 && flatRateCount > 0 && <span>+</span>}
                  {flatRateCount > 0 && <span>{flatRateCount} article{flatRateCount > 1 ? 's' : ''}</span>}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-bold text-primary">{grandTotal.toLocaleString('fr-FR')} {currencySymbol}</p>
              </div>
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </div>
          </button>
          
          {/* Expanded details */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 pt-0 space-y-2 border-t">
                  {/* Transport */}
                  <div className="flex justify-between items-center text-sm pt-3">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Package className="w-3 h-3" />
                      Transport
                    </span>
                    <DualCurrencyCompact
                      amount={transportTotal}
                      currency={currency}
                      fcfaEquivalent={getFCFAEquivalent(transportTotal)}
                    />
                  </div>
                  
                  {/* Insurance */}
                  {hasInsurance && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Shield className="w-3 h-3 text-primary" />
                        Assurance
                      </span>
                      <DualCurrencyCompact
                        amount={insuranceTotal}
                        currency={currency}
                        fcfaEquivalent={getFCFAEquivalent(insuranceTotal)}
                      />
                    </div>
                  )}
                  
                  {/* Logistics */}
                  {hasLogistics && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Truck className="w-3 h-3 text-primary" />
                        Logistique
                      </span>
                      <DualCurrencyCompact
                        amount={logisticsTotal}
                        currency={currency}
                        fcfaEquivalent={getFCFAEquivalent(logisticsTotal)}
                      />
                    </div>
                  )}
                  
                  {/* Total line */}
                  <div className="flex justify-between items-center pt-2 border-t font-medium">
                    <span>Total</span>
                    <span className="text-primary font-bold">
                      {grandTotal.toLocaleString('fr-FR')} {currencySymbol}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
