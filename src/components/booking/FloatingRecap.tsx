import { motion, AnimatePresence } from "framer-motion";
import { Package, Shield, Truck, ChevronUp, ChevronDown, QrCode } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DualCurrencyCompact } from "@/components/booking/DualCurrencyDisplay";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { cn } from "@/lib/utils";
import QRCode from "react-qr-code";

interface LineItem {
  id: string;
  label: string;
  quantity: number;
  price: number;
}

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
  orderId?: string;
  pricePerKg?: number;
  flatRateItems?: LineItem[];
  regressiveInfo?: {
    coefficient: number;
    effectivePricePerKg: number;
    savingsPercent: number;
    tierLabel: string;
  } | null;
  isTMA?: boolean;
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
  orderId,
  pricePerKg,
  flatRateItems,
  regressiveInfo,
  isTMA,
}: FloatingRecapProps) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const currencySymbol = getCurrencySymbol(currency);

  const hasItems = weight > 0 || flatRateCount > 0;

  useEffect(() => {
    if (!expanded) return;

    const onPointerDown = (e: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) {
        setExpanded(false);
      }
    };

    // Capture phase so a click anywhere outside reliably closes it
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [expanded]);

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
        <div ref={containerRef} className="bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-lg overflow-hidden">
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
                  {regressiveInfo && regressiveInfo.savingsPercent > 0 && (
                    <span className="text-[10px] font-semibold text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full">
                      -{regressiveInfo.savingsPercent}%
                    </span>
                  )}
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
                  {/* Line items detail */}
                  {weight > 0 && (
                    <div className="flex justify-between items-center text-xs pt-3">
                      <span className="text-muted-foreground">
                        {isTMA
                          ? `Tarif minimum applicable (≤1kg)`
                          : `Colis au kilo (${weight}kg × ${pricePerKg?.toLocaleString('fr-FR') ?? '—'} ${currencySymbol})`
                        }
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isTMA && (
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
                            forfait ×1,5
                          </span>
                        )}
                        <span className="text-sm">
                          {isTMA
                            ? Math.round((pricePerKg ?? 0) * 1.5).toLocaleString('fr-FR')
                            : (weight * (pricePerKg ?? 0)).toLocaleString('fr-FR')
                          } {currencySymbol}
                        </span>
                      </div>
                    </div>
                  )}
                  {flatRateItems?.filter(i => i.quantity > 0).map(item => (
                    <div key={item.id} className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">{item.label} ({item.quantity} × {item.price.toLocaleString('fr-FR')} {currencySymbol})</span>
                      <span className="text-sm">{(item.quantity * item.price).toLocaleString('fr-FR')} {currencySymbol}</span>
                    </div>
                  ))}

                  {/* Transport subtotal */}
                  <div className="flex justify-between items-center text-sm pt-1 border-t">
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
                  
                  {/* Mini QR Code */}
                  {orderId && (
                    <div className="flex items-center gap-3 py-2 border-t">
                      <div className="bg-white p-1.5 rounded-lg">
                        <QRCode value={orderId} size={40} level="L" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <QrCode className="w-2.5 h-2.5" /> QR Commande
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 truncate">{orderId.slice(0, 8)}…</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Client fee promo */}
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Frais de service</span>
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">0% jusqu'au 31/01/2027</span>
                  </div>

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
