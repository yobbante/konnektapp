/**
 * GPScanSheet — Orange Money-inspired premium scan popup for GP transporters
 * 
 * Full-screen operational modal. Scan-dominant, field-optimized.
 * Actions: register parcel, confirm delivery, adjust weight, manual payment, logs, fast withdraw.
 */
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine, X, PackageOpen, PackageCheck, Scale, QrCode,
  History, Banknote, ArrowRight, Eye, Zap, ShieldCheck,
  CreditCard, Star
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { QRCameraScanner } from "@/components/gp/QRCameraScanner";
import { UniversalScanner } from "@/components/scan/UniversalScanner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface GPScanSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gpId?: string;
  isVerified?: boolean;
}

const gpQuickActions = [
  { icon: PackageOpen, label: "Enregistrer colis", desc: "Check-in", color: "from-orange-500 to-amber-500", action: "checkin" },
  { icon: PackageCheck, label: "Confirmer livraison", desc: "Libération escrow", color: "from-emerald-500 to-green-500", action: "confirm_delivery" },
  { icon: Scale, label: "Ajuster poids", desc: "Poids réel", color: "from-sky-500 to-blue-500", action: "adjust_weight" },
  { icon: QrCode, label: "Paiement manuel", desc: "QR pour client", color: "from-violet-500 to-purple-500", action: "manual_payment" },
  { icon: History, label: "Historique ops", desc: "Logs terrain", color: "from-slate-500 to-gray-500", action: "history" },
  { icon: Banknote, label: "Retrait rapide", desc: "QR admin", color: "from-rose-500 to-pink-500", action: "withdraw" },
];

const gpCarouselSlides = [
  { title: "Confirmez pour débloquer le paiement", text: "Scannez le QR client pour finaliser et recevoir vos fonds.", icon: Banknote },
  { title: "Passez Vérifié", text: "Complétez votre KYC pour retirer plus vite et augmenter vos limites.", icon: ShieldCheck },
  { title: "Scan continu", text: "Activez le mode continu pour scanner plusieurs colis d'affilée.", icon: Zap },
  { title: "Konnekt Premium GP", text: "Commission réduite, priorité, badge premium. Passez au niveau supérieur.", icon: Star },
];

export function GPScanSheet({ open, onOpenChange, gpId, isVerified }: GPScanSheetProps) {
  const navigate = useNavigate();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % gpCarouselSlides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [open]);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setCameraOpen(false);
      setContinuousMode(false);
      setScannedCode(null);
    }
    onOpenChange(isOpen);
  }, [onOpenChange]);

  const handleScan = (code: string) => {
    setScannedCode(code);
    if (!continuousMode) setCameraOpen(false);
  };

  const handleAction = (action: string) => {
    handleOpenChange(false);
    switch (action) {
      case "checkin": navigate("/gp/scan"); break;
      case "confirm_delivery": navigate("/gp/scan"); break;
      case "adjust_weight": navigate("/gp/en-cours"); break;
      case "manual_payment": navigate("/gp/scan"); break;
      case "history": navigate("/gp/historique"); break;
      case "withdraw": navigate("/gp/wallet"); break;
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
        <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl p-0 bg-[hsl(var(--background))] border-t-0 overflow-hidden">
          {/* Header — operational GP style */}
          <div className="relative bg-gradient-to-br from-[hsl(var(--card))] to-[hsl(var(--muted))] px-5 pt-5 pb-6">
            <button
              onClick={() => handleOpenChange(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center z-10"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">Scanner — Espace GP</h2>
                  {isVerified && (
                    <Badge variant="outline" className="border-emerald-500/50 text-emerald-500 text-[10px]">
                      <ShieldCheck className="w-3 h-3 mr-1" /> Vérifié
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Colis, livraison, ajustement</p>

                {/* Stats hint */}
                <div className="flex items-center gap-2 mt-4">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground tracking-widest">• • • •</span>
                </div>

                <button
                  onClick={() => { handleOpenChange(false); navigate("/gp/historique"); }}
                  className="flex items-center gap-1 mt-2 text-primary text-sm font-medium"
                >
                  Voir opérations <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* QR Scan button */}
              <motion.button
                onClick={() => setCameraOpen(true)}
                className="relative w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0"
                whileTap={{ scale: 0.95 }}
              >
                <div className="absolute inset-0 rounded-2xl border-[3px] border-primary" />
                <motion.div
                  className="absolute -inset-1 rounded-2xl border-[3px] border-accent/50"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <div className="absolute inset-1 rounded-xl bg-primary/10 flex flex-col items-center justify-center gap-1">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <ScanLine className="w-10 h-10 text-primary" />
                  </motion.div>
                  <span className="text-[10px] font-bold text-primary">scanner</span>
                </div>
                <div className="absolute top-0 left-0 w-4 h-4 border-t-[3px] border-l-[3px] border-accent rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-[3px] border-r-[3px] border-accent rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-[3px] border-l-[3px] border-accent rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-[3px] border-r-[3px] border-accent rounded-br-lg" />
              </motion.button>
            </div>

            {/* Continuous mode toggle */}
            <motion.button
              onClick={() => setContinuousMode(!continuousMode)}
              className={cn(
                "mt-3 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors",
                continuousMode
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground border border-border"
              )}
              whileTap={{ scale: 0.95 }}
            >
              <Zap className="w-3 h-3" />
              Mode scan continu {continuousMode ? "ON" : "OFF"}
            </motion.button>
          </div>

          {/* Content */}
          <div className="px-4 pb-safe overflow-y-auto" style={{ maxHeight: "calc(92vh - 240px)" }}>
            {scannedCode ? (
              <div className="pt-4">
                <UniversalScanner onComplete={() => handleOpenChange(false)} />
              </div>
            ) : (
              <>
                {/* Quick Actions Grid 3x2 */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {gpQuickActions.slice(0, 3).map((action) => (
                    <motion.button
                      key={action.action}
                      onClick={() => handleAction(action.action)}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-colors"
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center", action.color)}>
                        <action.icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-foreground text-center leading-tight">{action.label}</span>
                    </motion.button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3 mt-3">
                  {gpQuickActions.slice(3).map((action) => (
                    <motion.button
                      key={action.action}
                      onClick={() => handleAction(action.action)}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-colors"
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center", action.color)}>
                        <action.icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-foreground text-center leading-tight">{action.label}</span>
                    </motion.button>
                  ))}
                </div>

                {/* Education Carousel */}
                <div className="mt-4 mb-4">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeSlide}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.3 }}
                      className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 p-4"
                    >
                      <div className="flex items-start gap-3">
                        {(() => { const Icon = gpCarouselSlides[activeSlide].icon; return <Icon className="w-8 h-8 text-primary flex-shrink-0 mt-0.5" />; })()}
                        <div className="flex-1">
                          <h4 className="font-bold text-sm text-foreground">{gpCarouselSlides[activeSlide].title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{gpCarouselSlides[activeSlide].text}</p>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                  <div className="flex justify-center gap-1.5 mt-3">
                    {gpCarouselSlides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveSlide(i)}
                        className={cn(
                          "h-1.5 rounded-full transition-all",
                          i === activeSlide ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                        )}
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
