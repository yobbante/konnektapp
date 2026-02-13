/**
 * GPScanSheet V3 — Deep Blue Premium Konnekt Scan for GP transporters
 * 
 * Operational field tool. Blue night base with orange productivity accents.
 * Continuous scan mode for batch processing.
 */
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine, X, PackageOpen, PackageCheck, Scale, QrCode,
  History, Banknote, ArrowRight, Eye, Zap, ShieldCheck,
  Star
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
  { icon: PackageOpen, label: "Enregistrer colis", desc: "Check-in", action: "checkin" },
  { icon: PackageCheck, label: "Confirmer livraison", desc: "Libération escrow", action: "confirm_delivery" },
  { icon: Scale, label: "Ajuster poids", desc: "Poids réel", action: "adjust_weight" },
  { icon: QrCode, label: "Paiement manuel", desc: "QR pour client", action: "manual_payment" },
  { icon: History, label: "Historique ops", desc: "Logs terrain", action: "history" },
  { icon: Banknote, label: "Retrait rapide", desc: "QR admin", action: "withdraw" },
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

  // GP uses orange accent for productivity
  const gpAccent = "var(--k-scan-gp-accent)";

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
            background: `linear-gradient(180deg, hsl(var(--k-scan-bg-top)) 0%, hsl(var(--k-scan-bg-bottom)) 100%)`,
          }}
        >
          {/* Header */}
          <div className="relative px-5 pt-5 pb-6">
            <button
              onClick={() => handleOpenChange(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center z-10"
              style={{ background: "hsl(var(--k-scan-surface))" }}
            >
              <X className="w-4 h-4" style={{ color: "hsl(var(--k-scan-text-muted))" }} />
            </button>

            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold" style={{ color: "hsl(var(--k-scan-text))" }}>
                    Scanner — Espace GP
                  </h2>
                  {isVerified && (
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                      style={{
                        borderColor: "hsl(var(--k-scan-success) / 0.5)",
                        color: "hsl(var(--k-scan-success))",
                      }}
                    >
                      <ShieldCheck className="w-3 h-3 mr-1" /> Vérifié
                    </Badge>
                  )}
                </div>
                <p className="text-sm mt-1" style={{ color: "hsl(var(--k-scan-text-muted))" }}>
                  Colis, livraison, ajustement
                </p>

                <div className="flex items-center gap-2 mt-4">
                  <Eye className="w-4 h-4" style={{ color: "hsl(var(--k-scan-text-muted))" }} />
                  <span className="text-xs tracking-widest" style={{ color: "hsl(var(--k-scan-text-muted))" }}>• • • •</span>
                </div>

                <button
                  onClick={() => { handleOpenChange(false); navigate("/gp/historique"); }}
                  className="flex items-center gap-1 mt-2 text-sm font-medium"
                  style={{ color: `hsl(${gpAccent})` }}
                >
                  Voir opérations <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* QR Scan button — orange glow for GP */}
              <motion.button
                onClick={() => setCameraOpen(true)}
                className="relative w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0"
                whileTap={{ scale: 0.97 }}
              >
                <div
                  className="absolute inset-0 rounded-2xl border-[3px]"
                  style={{ borderColor: `hsl(${gpAccent})` }}
                />
                <motion.div
                  className="absolute -inset-1 rounded-2xl border-[3px]"
                  style={{ borderColor: `hsl(${gpAccent} / 0.3)` }}
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <div
                  className="absolute inset-1 rounded-xl flex flex-col items-center justify-center gap-1"
                  style={{ background: `hsl(${gpAccent} / 0.15)` }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <ScanLine className="w-10 h-10" style={{ color: `hsl(${gpAccent})` }} />
                  </motion.div>
                  <span className="text-[10px] font-bold" style={{ color: `hsl(${gpAccent})` }}>scanner</span>
                </div>
                {["top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-lg",
                  "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-lg",
                  "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-lg",
                  "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-lg"
                ].map((pos) => (
                  <div
                    key={pos}
                    className={cn("absolute w-4 h-4", pos)}
                    style={{ borderColor: `hsl(${gpAccent} / 0.6)` }}
                  />
                ))}
              </motion.button>
            </div>

            {/* Continuous mode toggle */}
            <motion.button
              onClick={() => setContinuousMode(!continuousMode)}
              className="mt-3 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors"
              style={{
                background: continuousMode ? `hsl(${gpAccent})` : "hsl(var(--k-scan-surface))",
                color: continuousMode ? "#fff" : "hsl(var(--k-scan-text-muted))",
                border: continuousMode ? "none" : "1px solid hsl(var(--k-scan-surface-hover))",
              }}
              whileTap={{ scale: 0.95 }}
            >
              <Zap className="w-3 h-3" />
              Mode scan continu {continuousMode ? "ON" : "OFF"}
            </motion.button>
          </div>

          {/* Content */}
          <div className="px-4 pb-safe overflow-y-auto" style={{ maxHeight: "calc(92vh - 260px)" }}>
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
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl border transition-colors"
                      style={{
                        background: "hsl(var(--k-scan-surface))",
                        borderColor: "hsl(var(--k-scan-surface-hover))",
                      }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: `hsl(${gpAccent} / 0.15)` }}
                      >
                        <action.icon className="w-6 h-6" style={{ color: `hsl(${gpAccent})` }} />
                      </div>
                      <span className="text-xs font-semibold text-center leading-tight" style={{ color: "hsl(var(--k-scan-text))" }}>
                        {action.label}
                      </span>
                    </motion.button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3 mt-3">
                  {gpQuickActions.slice(3).map((action) => (
                    <motion.button
                      key={action.action}
                      onClick={() => handleAction(action.action)}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl border transition-colors"
                      style={{
                        background: "hsl(var(--k-scan-surface))",
                        borderColor: "hsl(var(--k-scan-surface-hover))",
                      }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: `hsl(${gpAccent} / 0.15)` }}
                      >
                        <action.icon className="w-6 h-6" style={{ color: `hsl(${gpAccent})` }} />
                      </div>
                      <span className="text-xs font-semibold text-center leading-tight" style={{ color: "hsl(var(--k-scan-text))" }}>
                        {action.label}
                      </span>
                    </motion.button>
                  ))}
                </div>

                {/* Carousel */}
                <div className="mt-4 mb-4">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeSlide}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.3 }}
                      className="relative rounded-2xl overflow-hidden p-4 border"
                      style={{
                        background: "hsl(var(--k-scan-surface))",
                        borderColor: `hsl(${gpAccent} / 0.2)`,
                        boxShadow: `0 0 20px -5px hsl(${gpAccent} / 0.1)`,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {(() => {
                          const Icon = gpCarouselSlides[activeSlide].icon;
                          return <Icon className="w-8 h-8 flex-shrink-0 mt-0.5" style={{ color: `hsl(${gpAccent})` }} />;
                        })()}
                        <div className="flex-1">
                          <h4 className="font-bold text-sm" style={{ color: "hsl(var(--k-scan-text))" }}>
                            {gpCarouselSlides[activeSlide].title}
                          </h4>
                          <p className="text-xs mt-1" style={{ color: "hsl(var(--k-scan-text-muted))" }}>
                            {gpCarouselSlides[activeSlide].text}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                  <div className="flex justify-center gap-1.5 mt-3">
                    {gpCarouselSlides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveSlide(i)}
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: i === activeSlide ? "1.5rem" : "0.375rem",
                          background: i === activeSlide
                            ? `hsl(${gpAccent})`
                            : "hsl(var(--k-scan-text-muted) / 0.3)",
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
