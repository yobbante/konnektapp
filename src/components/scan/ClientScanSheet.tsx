/**
 * ClientScanSheet V3 — Deep Blue Premium Konnekt Scan for clients
 * 
 * Full-screen modal with QR scanner, quick actions grid, education carousel.
 * Blue night theme matching Konnekt home identity.
 */
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine, X, Keyboard, Wallet, Shield, History,
  PackageCheck, Scale, Eye, ArrowRight, Lock, Sparkles
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
  { icon: Scale, label: "Payer supplément", desc: "Ajustement poids", action: "pay_supplement" },
  { icon: PackageCheck, label: "Confirmer réception", desc: "Libérer escrow", action: "confirm_delivery" },
  { icon: Eye, label: "Suivre un colis", desc: "Scan QR reçu", action: "track" },
  { icon: Wallet, label: "Mes paiements", desc: "Ouvrir wallet", action: "wallet" },
  { icon: Shield, label: "Assurance", desc: "Protection colis", action: "insurance" },
  { icon: History, label: "Historique scan", desc: "Liste personnelle", action: "history" },
];

const carouselSlides = [
  { title: "Pourquoi confirmer la livraison ?", text: "Votre confirmation libère le paiement au transporteur de manière sécurisée.", icon: PackageCheck },
  { title: "Paiement sécurisé en escrow", text: "Vos fonds sont bloqués jusqu'à confirmation. Aucun risque.", icon: Lock },
  { title: "Protection complète", text: "Activez votre assurance pour couvrir vos envois à 100%.", icon: Shield },
  { title: "Konnekt Pay", text: "Payez, transférez et retirez directement depuis votre wallet.", icon: Sparkles },
];

export function ClientScanSheet({ open, onOpenChange }: ClientScanSheetProps) {
  const navigate = useNavigate();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

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
      case "confirm_delivery": setCameraOpen(true); onOpenChange(true); break;
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
                <h2 className="text-xl font-bold" style={{ color: "hsl(var(--k-scan-text))" }}>
                  Scanner avec Konnekt
                </h2>
                <p className="text-sm mt-1" style={{ color: "hsl(var(--k-scan-text-muted))" }}>
                  Paiement, suivi ou confirmation
                </p>

                <div className="flex items-center gap-2 mt-4">
                  <Eye className="w-4 h-4" style={{ color: "hsl(var(--k-scan-text-muted))" }} />
                  <span className="text-xs tracking-widest" style={{ color: "hsl(var(--k-scan-text-muted))" }}>• • • •</span>
                </div>

                <button
                  onClick={() => { handleOpenChange(false); navigate("/client/wallet"); }}
                  className="flex items-center gap-1 mt-2 text-sm font-medium"
                  style={{ color: "hsl(var(--k-scan-accent))" }}
                >
                  Voir l'historique <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* QR Scan button — blue glow */}
              <motion.button
                onClick={() => setCameraOpen(true)}
                className="relative w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0"
                whileTap={{ scale: 0.97 }}
              >
                <div
                  className="absolute inset-0 rounded-2xl border-[3px]"
                  style={{ borderColor: "hsl(var(--k-scan-accent))" }}
                />
                <motion.div
                  className="absolute -inset-1 rounded-2xl border-[3px]"
                  style={{ borderColor: "hsl(var(--k-scan-accent) / 0.3)" }}
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <div
                  className="absolute inset-1 rounded-xl flex flex-col items-center justify-center gap-1"
                  style={{ background: "hsl(var(--k-scan-accent-soft))" }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <ScanLine className="w-10 h-10" style={{ color: "hsl(var(--k-scan-accent))" }} />
                  </motion.div>
                  <span className="text-[10px] font-bold" style={{ color: "hsl(var(--k-scan-accent))" }}>scanner</span>
                </div>
                {/* Corner accents */}
                {["top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-lg",
                  "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-lg",
                  "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-lg",
                  "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-lg"
                ].map((pos) => (
                  <div
                    key={pos}
                    className={cn("absolute w-4 h-4", pos)}
                    style={{ borderColor: "hsl(var(--k-scan-glow))" }}
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
                {/* Quick Actions Grid */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {quickActions.slice(0, 3).map((action) => (
                    <motion.button
                      key={action.action}
                      onClick={() => handleAction(action.action)}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl border transition-colors"
                      style={{
                        background: "hsl(var(--k-scan-surface))",
                        borderColor: "hsl(var(--k-scan-surface-hover))",
                      }}
                      whileTap={{ scale: 0.97 }}
                      whileHover={{ backgroundColor: "hsl(var(--k-scan-surface-hover))" }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: "hsl(var(--k-scan-accent-soft))" }}
                      >
                        <action.icon className="w-6 h-6" style={{ color: "hsl(var(--k-scan-accent))" }} />
                      </div>
                      <span className="text-xs font-semibold text-center leading-tight" style={{ color: "hsl(var(--k-scan-text))" }}>
                        {action.label}
                      </span>
                    </motion.button>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-2 mt-3">
                  {quickActions.slice(3).map((action) => (
                    <motion.button
                      key={action.action}
                      onClick={() => handleAction(action.action)}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl border transition-colors"
                      style={{
                        background: "hsl(var(--k-scan-surface))",
                        borderColor: "hsl(var(--k-scan-surface-hover))",
                      }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: "hsl(var(--k-scan-accent-soft))" }}
                      >
                        <action.icon className="w-5 h-5" style={{ color: "hsl(var(--k-scan-accent))" }} />
                      </div>
                      <span className="text-[10px] font-semibold text-center leading-tight" style={{ color: "hsl(var(--k-scan-text))" }}>
                        {action.label}
                      </span>
                    </motion.button>
                  ))}
                  {/* Manual code entry */}
                  <motion.button
                    onClick={() => setManualMode(true)}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl border transition-colors"
                    style={{
                      background: "hsl(var(--k-scan-surface))",
                      borderColor: "hsl(var(--k-scan-surface-hover))",
                    }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: "hsl(var(--k-scan-surface-hover))" }}
                    >
                      <Keyboard className="w-5 h-5" style={{ color: "hsl(var(--k-scan-text-muted))" }} />
                    </div>
                    <span className="text-[10px] font-semibold text-center leading-tight" style={{ color: "hsl(var(--k-scan-text))" }}>
                      Code manuel
                    </span>
                  </motion.button>
                </div>

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
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.3 }}
                      className="relative rounded-2xl overflow-hidden p-4 border"
                      style={{
                        background: "hsl(var(--k-scan-surface))",
                        borderColor: "hsl(var(--k-scan-accent) / 0.2)",
                        boxShadow: "0 0 20px -5px hsl(var(--k-scan-accent) / 0.1)",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {(() => {
                          const Icon = carouselSlides[activeSlide].icon;
                          return <Icon className="w-8 h-8 flex-shrink-0 mt-0.5" style={{ color: "hsl(var(--k-scan-accent))" }} />;
                        })()}
                        <div className="flex-1">
                          <h4 className="font-bold text-sm" style={{ color: "hsl(var(--k-scan-text))" }}>
                            {carouselSlides[activeSlide].title}
                          </h4>
                          <p className="text-xs mt-1" style={{ color: "hsl(var(--k-scan-text-muted))" }}>
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
                        className={cn("h-1.5 rounded-full transition-all")}
                        style={{
                          width: i === activeSlide ? "1.5rem" : "0.375rem",
                          background: i === activeSlide
                            ? "hsl(var(--k-scan-accent))"
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
