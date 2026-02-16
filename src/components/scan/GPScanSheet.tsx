/**
 * GPScanSheet V7 — Unified with ScanHeart
 * Layer 1: GP dashboard + quick actions
 * Layer 2: ScanHeart + ScanQRTab + ScanColisTab (shared components)
 * 
 * "One scan heart" — same engine, same core, GP-themed.
 */
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine, X, PackageOpen, PackageCheck, Scale,
  Clock, Banknote, Eye, EyeOff, ArrowRight, Zap, ShieldCheck, Star
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useSwipeDown } from "@/hooks/useSwipeDown";
import { supabase } from "@/integrations/supabase/client";
import { ScanHeart } from "./ScanHeart";
import { ScanQRTab } from "./ScanQRTab";
import { ScanColisTab } from "./ScanColisTab";

interface GPScanSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gpId?: string;
  isVerified?: boolean;
}

const BG_GRADIENT = "linear-gradient(180deg, #0F1923 0%, #15232F 50%, #1A2B3A 100%)";

const gpQuickActions = [
  { icon: PackageOpen, label: "Enregistrer colis", action: "checkin" },
  { icon: PackageCheck, label: "Confirmer livraison", action: "confirm_delivery" },
  { icon: Scale, label: "Ajuster poids", action: "adjust_weight" },
  { icon: Banknote, label: "Retrait rapide", action: "withdraw" },
  { icon: ShieldCheck, label: "Vérifier KYC", action: "kyc" },
  { icon: Clock, label: "Historique ops", action: "history" },
];

const gpCarouselSlides = [
  { title: "Confirmez pour débloquer le paiement", text: "Scannez le QR client pour finaliser et recevoir vos fonds.", icon: Banknote },
  { title: "Passez Vérifié", text: "Complétez votre KYC pour retirer plus vite et augmenter vos limites.", icon: ShieldCheck },
  { title: "Scan continu", text: "Activez le mode continu pour scanner plusieurs colis d'affilée.", icon: Zap },
  { title: "Konnekt Premium GP", text: "Commission réduite, priorité, badge premium.", icon: Star },
];

type TabKey = "scanner" | "mon_qr" | "mes_colis";
const tabs: { key: TabKey; label: string }[] = [
  { key: "scanner", label: "Scanner" },
  { key: "mon_qr", label: "Mon QR" },
  { key: "mes_colis", label: "Opérations" },
];

export function GPScanSheet({ open, onOpenChange, gpId, isVerified }: GPScanSheetProps) {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);
  const [showBalance, setShowBalance] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [scanViewOpen, setScanViewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("scanner");

  const swipeLayer1 = useSwipeDown(() => handleOpenChange(false));
  const swipeLayer2 = useSwipeDown(() => setScanViewOpen(false));

  useEffect(() => {
    if (!open || !gpId) return;
    const load = async () => {
      const { data } = await supabase.from("gp_wallets").select("balance").eq("gp_id", gpId).maybeSingle();
      if (data) setWalletBalance(data.balance);
    };
    load();
  }, [open, gpId]);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setActiveSlide(prev => (prev + 1) % gpCarouselSlides.length), 4000);
    return () => clearInterval(timer);
  }, [open]);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) { setScanViewOpen(false); setActiveTab("scanner"); setContinuousMode(false); }
    onOpenChange(isOpen);
  }, [onOpenChange]);

  const handleAction = (action: string) => {
    handleOpenChange(false);
    const routes: Record<string, string> = {
      checkin: "/gp/colis", confirm_delivery: "/gp/en-cours", adjust_weight: "/gp/en-cours",
      withdraw: "/gp/wallet", kyc: "/gp/profil-public", history: "/gp/historique",
    };
    if (routes[action]) navigate(routes[action]);
  };

  const closeBoth = () => { setScanViewOpen(false); handleOpenChange(false); };

  return (
    <>
      {/* ═══ LAYER 2: Tabbed scan view ═══ */}
      <Sheet open={scanViewOpen} onOpenChange={(o) => { if (!o) setScanViewOpen(false); }}>
        <SheetContent side="bottom" className="h-[95vh] rounded-t-3xl p-0 border-t-0 overflow-hidden z-[60]" style={{ background: BG_GRADIENT }}>
          <div className="flex flex-col h-full" {...swipeLayer2}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-white/20" /></div>

            <div className="flex items-center gap-3 px-5 pt-1 pb-3">
              <button onClick={() => setScanViewOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.08]">
                <ArrowRight className="w-4 h-4 text-white/60 rotate-180" />
              </button>
              <h2 className="text-[15px] font-semibold text-white">Konnekt Scan — GP</h2>
              <motion.button onClick={() => setContinuousMode(!continuousMode)}
                className={cn("ml-auto px-2.5 py-1 rounded-full text-[10px] font-medium flex items-center gap-1 transition-all",
                  continuousMode ? "bg-amber-500 text-white" : "bg-white/[0.06] text-white/40 border border-white/[0.08]"
                )} whileTap={{ scale: 0.95 }}>
                <Zap className="w-2.5 h-2.5" /> {continuousMode ? "ON" : "OFF"}
              </motion.button>
            </div>

            {/* Tabs */}
            <div className="px-5 pb-3">
              <div className="flex rounded-xl overflow-hidden border border-amber-400/20 bg-white/[0.03]">
                {tabs.map((tab) => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={cn("flex-1 py-2.5 text-xs font-semibold transition-all duration-200",
                      activeTab === tab.key ? "bg-amber-500/20 text-amber-400" : "text-white/40"
                    )}>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6">
              <AnimatePresence mode="wait">
                {activeTab === "scanner" && (
                  <motion.div key="scanner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ScanHeart
                      role="gp"
                      accent="amber"
                      darkMode
                      continuousMode={continuousMode}
                      onResolved={() => { if (!continuousMode) setTimeout(closeBoth, 300); }}
                    />
                  </motion.div>
                )}
                {activeTab === "mon_qr" && (
                  <motion.div key="qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ScanQRTab role="gp" accent="amber" darkMode gpId={gpId} isVerified={isVerified} onSwitchToScanner={() => setActiveTab("scanner")} />
                  </motion.div>
                )}
                {activeTab === "mes_colis" && (
                  <motion.div key="colis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ScanColisTab role="gp" accent="amber" darkMode gpId={gpId} onClose={closeBoth} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ═══ LAYER 1: GP Dashboard popup ═══ */}
      <Sheet open={open && !scanViewOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl p-0 border-t-0 overflow-hidden" style={{ background: BG_GRADIENT }}>
          <div {...swipeLayer1}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-white/20" /></div>

            <div className="relative px-5 pt-2 pb-4">
              <div className="absolute top-2 right-4 flex items-center gap-2 z-10">
                <motion.button onClick={() => setScanViewOpen(true)} className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-500/15 border border-amber-400/20" whileTap={{ scale: 0.9 }}>
                  <ScanLine className="w-4 h-4 text-amber-400" />
                </motion.button>
                <button onClick={() => handleOpenChange(false)} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-sm">
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>

              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">Espace GP</h2>
                    {isVerified && (
                      <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-400 px-1.5 py-0">
                        <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> Vérifié
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs mt-0.5 text-white/50">Colis · Livraison · Ajustement</p>
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => setShowBalance(!showBalance)} className="flex items-center gap-2 group">
                      {showBalance ? <EyeOff className="w-3.5 h-3.5 text-white/40" /> : <Eye className="w-3.5 h-3.5 text-white/40" />}
                      {showBalance ? (
                        <span className="text-lg font-bold text-white">{walletBalance !== null ? `${walletBalance.toLocaleString()} FCFA` : "-- FCFA"}</span>
                      ) : (
                        <span className="text-sm tracking-[0.3em] text-white/40 font-medium">••••••</span>
                      )}
                    </button>
                  </div>
                  <button onClick={() => { handleOpenChange(false); navigate("/gp/wallet"); }} className="flex items-center gap-1 mt-1.5 text-xs font-medium text-amber-400">
                    Voir les revenus <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Quick scan button */}
                <motion.button onClick={() => setScanViewOpen(true)} className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0" whileTap={{ scale: 0.95 }}>
                  <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/40" />
                  <motion.div className="absolute -inset-0.5 rounded-2xl border border-amber-400/15" animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 3, repeat: Infinity }} />
                  <div className="absolute inset-[3px] rounded-xl flex flex-col items-center justify-center gap-1 bg-amber-500/10">
                    <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2.5, repeat: Infinity }}>
                      <ScanLine className="w-8 h-8 text-amber-400" />
                    </motion.div>
                    <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Scanner</span>
                  </div>
                  {["top-0 left-0 border-t-2 border-l-2 rounded-tl-md", "top-0 right-0 border-t-2 border-r-2 rounded-tr-md",
                    "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-md", "bottom-0 right-0 border-b-2 border-r-2 rounded-br-md"
                  ].map((pos) => (<div key={pos} className={cn("absolute w-3 h-3 border-amber-400/60", pos)} />))}
                </motion.button>
              </div>

              <motion.button onClick={() => setContinuousMode(!continuousMode)}
                className={cn("mt-3 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all",
                  continuousMode ? "bg-amber-500 text-white" : "bg-white/[0.06] text-white/50 border border-white/[0.08]"
                )} whileTap={{ scale: 0.95 }}>
                <Zap className="w-3 h-3" /> Scan continu {continuousMode ? "ON" : "OFF"}
              </motion.button>
            </div>

            <div className="px-4 pb-safe overflow-y-auto" style={{ maxHeight: "calc(92vh - 280px)" }}>
              <div className="grid grid-cols-3 gap-2.5 mt-2">
                {gpQuickActions.map((action) => (
                  <motion.button key={action.action} onClick={() => handleAction(action.action)}
                    className="flex flex-col items-center gap-2 p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm" whileTap={{ scale: 0.95 }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10">
                      <action.icon className="w-5 h-5 text-amber-400" />
                    </div>
                    <span className="text-[10px] font-semibold text-center leading-tight text-white/80">{action.label}</span>
                  </motion.button>
                ))}
              </div>

              <div className="mt-4 mb-4">
                <AnimatePresence mode="wait">
                  <motion.div key={activeSlide} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
                    className="rounded-2xl overflow-hidden p-3.5 border border-white/[0.06] bg-white/[0.03]">
                    <div className="flex items-start gap-3">
                      {(() => { const Icon = gpCarouselSlides[activeSlide].icon; return (
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-500/10 flex-shrink-0"><Icon className="w-4 h-4 text-amber-400" /></div>
                      ); })()}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs text-white/90">{gpCarouselSlides[activeSlide].title}</h4>
                        <p className="text-[11px] mt-0.5 text-white/40 leading-relaxed">{gpCarouselSlides[activeSlide].text}</p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
                <div className="flex justify-center gap-1.5 mt-3">
                  {gpCarouselSlides.map((_, i) => (
                    <button key={i} onClick={() => setActiveSlide(i)} className="h-1 rounded-full transition-all"
                      style={{ width: i === activeSlide ? "1.25rem" : "0.3rem", background: i === activeSlide ? "#fbbf24" : "rgba(255,255,255,0.15)" }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}