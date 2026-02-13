/**
 * ClientScanSheet V4 — Refined Konnekt Scan for clients
 * 
 * Softer dark theme, balance toggle, cleaner icons, proper redirections.
 */
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine, X, Keyboard, CreditCard, ShieldCheck, Clock,
  PackageCheck, TrendingUp, Eye, EyeOff, ArrowRight, Lock, Sparkles
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { QRCameraScanner } from "@/components/gp/QRCameraScanner";
import { UniversalScanner } from "@/components/scan/UniversalScanner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ClientScanSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const quickActions = [
  { icon: CreditCard, label: "Payer supplément", action: "pay_supplement" },
  { icon: PackageCheck, label: "Confirmer réception", action: "confirm_delivery" },
  { icon: TrendingUp, label: "Suivre colis", action: "track" },
  { icon: CreditCard, label: "Mon wallet", action: "wallet" },
  { icon: ShieldCheck, label: "Assurance", action: "insurance" },
  { icon: Clock, label: "Historique", action: "history" },
];

const carouselSlides = [
  { title: "Pourquoi confirmer la livraison ?", text: "Votre confirmation libère le paiement au transporteur de manière sécurisée.", icon: PackageCheck },
  { title: "Paiement sécurisé en escrow", text: "Vos fonds sont bloqués jusqu'à confirmation. Aucun risque.", icon: Lock },
  { title: "Protection complète", text: "Activez votre assurance pour couvrir vos envois à 100%.", icon: ShieldCheck },
  { title: "Konnekt Pay", text: "Payez, transférez et retirez directement depuis votre wallet.", icon: Sparkles },
];

export function ClientScanSheet({ open, onOpenChange }: ClientScanSheetProps) {
  const navigate = useNavigate();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [showBalance, setShowBalance] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % carouselSlides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [open]);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setCameraOpen(false);
      setManualMode(false);
      setScannedCode(null);
    }
    onOpenChange(isOpen);
  }, [onOpenChange]);

  const handleScan = (code: string) => {
    setCameraOpen(false);
    setScannedCode(code);
  };

  const handleAction = (action: string) => {
    handleOpenChange(false);
    switch (action) {
      case "pay_supplement": navigate("/tracking"); break;
      case "confirm_delivery": navigate("/delivery-confirmation"); break;
      case "track": navigate("/tracking"); break;
      case "wallet": navigate("/client/wallet"); break;
      case "insurance": navigate("/offres"); break;
      case "history": navigate("/historique"); break;
    }
  };

  return (
    <>
      <QRCameraScanner
        isOpen={cameraOpen}
        onScan={handleScan}
        onClose={() => setCameraOpen(false)}
      />

      <Sheet open={open && !cameraOpen} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[92vh] rounded-t-3xl p-0 border-t-0 overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #0F1923 0%, #15232F 50%, #1A2B3A 100%)",
          }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="relative px-5 pt-2 pb-4">
            <button
              onClick={() => handleOpenChange(false)}
              className="absolute top-2 right-4 w-8 h-8 rounded-full flex items-center justify-center z-10 bg-white/10 backdrop-blur-sm"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>

            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white">
                  Scanner avec Konnekt
                </h2>
                <p className="text-xs mt-0.5 text-white/50">
                  Paiement · Suivi · Confirmation
                </p>

                {/* Balance section with toggle */}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="flex items-center gap-2 group"
                  >
                    {showBalance ? (
                      <EyeOff className="w-3.5 h-3.5 text-white/40" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 text-white/40" />
                    )}
                    {showBalance ? (
                      <span className="text-lg font-bold text-white">12 500 FCFA</span>
                    ) : (
                      <span className="text-sm tracking-[0.3em] text-white/40 font-medium">••••••</span>
                    )}
                  </button>
                </div>

                <button
                  onClick={() => { handleOpenChange(false); navigate("/client/wallet"); }}
                  className="flex items-center gap-1 mt-1.5 text-xs font-medium text-emerald-400"
                >
                  Voir le wallet <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* QR Scan button */}
              <motion.button
                onClick={() => setCameraOpen(true)}
                className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0"
                whileTap={{ scale: 0.95 }}
              >
                <div className="absolute inset-0 rounded-2xl border-2 border-emerald-400/40" />
                <motion.div
                  className="absolute -inset-0.5 rounded-2xl border border-emerald-400/15"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <div className="absolute inset-[3px] rounded-xl flex flex-col items-center justify-center gap-1 bg-emerald-500/10">
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                  >
                    <ScanLine className="w-8 h-8 text-emerald-400" />
                  </motion.div>
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Scanner</span>
                </div>
                {/* Corner accents */}
                {["top-0 left-0 border-t-2 border-l-2 rounded-tl-md",
                  "top-0 right-0 border-t-2 border-r-2 rounded-tr-md",
                  "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-md",
                  "bottom-0 right-0 border-b-2 border-r-2 rounded-br-md"
                ].map((pos) => (
                  <div
                    key={pos}
                    className={cn("absolute w-3 h-3 border-emerald-400/60", pos)}
                  />
                ))}
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 pb-safe overflow-y-auto" style={{ maxHeight: "calc(92vh - 200px)" }}>
            {scannedCode ? (
              <div className="pt-4">
                <UniversalScanner onComplete={() => handleOpenChange(false)} />
              </div>
            ) : (
              <>
                {/* Quick Actions Grid - 3x2 uniform */}
                <div className="grid grid-cols-3 gap-2.5 mt-2">
                  {quickActions.map((action) => (
                    <motion.button
                      key={action.action}
                      onClick={() => handleAction(action.action)}
                      className="flex flex-col items-center gap-2 p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm"
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10">
                        <action.icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="text-[10px] font-semibold text-center leading-tight text-white/80">
                        {action.label}
                      </span>
                    </motion.button>
                  ))}
                </div>

                {/* Manual code entry */}
                <motion.button
                  onClick={() => setManualMode(!manualMode)}
                  className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03]"
                  whileTap={{ scale: 0.98 }}
                >
                  <Keyboard className="w-4 h-4 text-white/40" />
                  <span className="text-xs font-medium text-white/50">Saisir un code manuellement</span>
                </motion.button>

                {/* Manual entry */}
                <AnimatePresence>
                  {manualMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 overflow-hidden"
                    >
                      <UniversalScanner onComplete={() => handleOpenChange(false)} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Education Carousel */}
                <div className="mt-4 mb-4">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeSlide}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="rounded-2xl overflow-hidden p-3.5 border border-white/[0.06] bg-white/[0.03]"
                    >
                      <div className="flex items-start gap-3">
                        {(() => {
                          const Icon = carouselSlides[activeSlide].icon;
                          return (
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-500/10 flex-shrink-0">
                              <Icon className="w-4.5 h-4.5 text-emerald-400" />
                            </div>
                          );
                        })()}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-xs text-white/90">
                            {carouselSlides[activeSlide].title}
                          </h4>
                          <p className="text-[11px] mt-0.5 text-white/40 leading-relaxed">
                            {carouselSlides[activeSlide].text}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                  <div className="flex justify-center gap-1.5 mt-3">
                    {carouselSlides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveSlide(i)}
                        className="h-1 rounded-full transition-all"
                        style={{
                          width: i === activeSlide ? "1.25rem" : "0.3rem",
                          background: i === activeSlide ? "#34d399" : "rgba(255,255,255,0.15)",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
