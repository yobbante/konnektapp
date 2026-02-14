/**
 * GPScanSheet V5 — Two-layer scan experience for GP transporters
 * Layer 1: Quick actions + balance (original popup)
 * Layer 2: Camera-first tabbed view (Scanner / Mon QR / Mes Colis)
 * Same dark premium identity as ClientScanSheet with amber GP accents
 */
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine, X, Keyboard, PackageOpen, PackageCheck, Scale,
  Clock, Banknote, Eye, EyeOff, ArrowRight, Zap, ShieldCheck,
  Star, ChevronLeft, QrCode, Package, Search, CheckCircle2,
  Truck
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { QRCameraScanner } from "@/components/gp/QRCameraScanner";
import { UniversalScanner } from "@/components/scan/UniversalScanner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import QRCodeDisplay from "react-qr-code";
import { useSwipeDown } from "@/hooks/useSwipeDown";
import { supabase } from "@/integrations/supabase/client";

interface GPScanSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gpId?: string;
  isVerified?: boolean;
}

const BG_GRADIENT = "linear-gradient(180deg, #0F1923 0%, #15232F 50%, #1A2B3A 100%)";

/* ── Layer 1 data ── */
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

/* ── Layer 2 data ── */
type TabKey = "scanner" | "mon_qr" | "mes_colis";
const tabs: { key: TabKey; label: string }[] = [
  { key: "scanner", label: "Scanner" },
  { key: "mon_qr", label: "Mon QR" },
  { key: "mes_colis", label: "Mes Colis" },
];

const mockGPColis = [
  { id: "KNK-2024-0501", status: "Collecté", route: "Paris → Dakar", weight: "4.5 kg", client: "Amadou D." },
  { id: "KNK-2024-0612", status: "En transit", route: "Abidjan → Paris", weight: "2.8 kg", client: "Fatou S." },
  { id: "KNK-2024-0703", status: "À livrer", route: "Dakar → Marseille", weight: "6.2 kg", client: "Moussa B." },
];

/* ── Manual code actions for GP ── */
const codeActions = [
  { icon: PackageOpen, label: "Enregistrer dépôt", action: "checkin" },
  { icon: PackageCheck, label: "Confirmer livraison", action: "confirm" },
  { icon: Scale, label: "Ajuster le poids", action: "adjust" },
  { icon: Truck, label: "Voir la mission", action: "mission" },
];

export function GPScanSheet({ open, onOpenChange, gpId, isVerified }: GPScanSheetProps) {
  const navigate = useNavigate();

  // Layer 1 state
  const [activeSlide, setActiveSlide] = useState(0);
  const [showBalance, setShowBalance] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // Layer 2 state
  const [scanViewOpen, setScanViewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("scanner");
  const [cameraActive, setCameraActive] = useState(false);
  const [expandedColis, setExpandedColis] = useState<string | null>(null);

  // Manual code input state
  const [manualCode, setManualCode] = useState("");
  const [codeValidated, setCodeValidated] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  // Swipe down to close
  const swipeLayer1 = useSwipeDown(() => handleOpenChange(false));
  const swipeLayer2 = useSwipeDown(() => setScanViewOpen(false));

  // Load wallet balance
  useEffect(() => {
    if (!open || !gpId) return;
    const loadBalance = async () => {
      const { data } = await supabase
        .from("gp_wallets")
        .select("balance")
        .eq("gp_id", gpId)
        .maybeSingle();
      if (data) setWalletBalance(data.balance);
    };
    loadBalance();
  }, [open, gpId]);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % gpCarouselSlides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [open]);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setScannedCode(null);
      setScanViewOpen(false);
      setCameraActive(false);
      setActiveTab("scanner");
      setExpandedColis(null);
      setManualCode("");
      setCodeValidated(false);
      setShowManualInput(false);
      setContinuousMode(false);
    }
    onOpenChange(isOpen);
  }, [onOpenChange]);

  const handleScan = (code: string) => {
    setCameraActive(false);
    if (scanViewOpen) {
      setScanViewOpen(false);
    }
    setScannedCode(code);
    if (!continuousMode) {
      // Process scan result
    }
  };

  const handleAction = (action: string) => {
    handleOpenChange(false);
    switch (action) {
      case "checkin": navigate("/gp/colis"); break;
      case "confirm_delivery": navigate("/gp/en-cours"); break;
      case "adjust_weight": navigate("/gp/en-cours"); break;
      case "withdraw": navigate("/gp/wallet"); break;
      case "kyc": navigate("/gp/profil-public"); break;
      case "history": navigate("/gp/historique"); break;
    }
  };

  const handleCodeAction = (action: string) => {
    handleOpenChange(false);
    switch (action) {
      case "checkin": navigate("/gp/colis"); break;
      case "confirm": navigate("/gp/en-cours"); break;
      case "adjust": navigate("/gp/en-cours"); break;
      case "mission": navigate(`/gp/order/${manualCode}`); break;
    }
  };

  const validateCode = () => {
    if (manualCode.trim().length >= 3) {
      setCodeValidated(true);
    }
  };

  const openScanView = () => {
    setScanViewOpen(true);
    setActiveTab("scanner");
    setManualCode("");
    setCodeValidated(false);
    setShowManualInput(false);
  };

  const getStatusColor = (status: string) => {
    if (status === "Collecté") return "text-blue-400 bg-blue-500/15 border-blue-400/20";
    if (status === "En transit") return "text-amber-400 bg-amber-500/15 border-amber-400/20";
    if (status === "À livrer") return "text-purple-400 bg-purple-500/15 border-purple-400/20";
    return "text-white/50 bg-white/5 border-white/10";
  };

  return (
    <>
      <QRCameraScanner
        isOpen={cameraActive}
        onScan={handleScan}
        onClose={() => setCameraActive(false)}
      />

      {/* ═══ LAYER 2: Camera-first tabbed scan view ═══ */}
      <Sheet open={scanViewOpen && !cameraActive} onOpenChange={(o) => { if (!o) setScanViewOpen(false); }}>
        <SheetContent
          side="bottom"
          className="h-[95vh] rounded-t-3xl p-0 border-t-0 overflow-hidden z-[60]"
          style={{ background: BG_GRADIENT }}
        >
          <div className="flex flex-col h-full" {...swipeLayer2}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="flex items-center gap-3 px-5 pt-1 pb-3">
              <button onClick={() => setScanViewOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.08]">
                <ChevronLeft className="w-4 h-4 text-white/60" />
              </button>
              <h2 className="text-[15px] font-semibold text-white">Konnekt Scan — GP</h2>
              {/* Continuous mode toggle */}
              <motion.button
                onClick={() => setContinuousMode(!continuousMode)}
                className={cn(
                  "ml-auto px-2.5 py-1 rounded-full text-[10px] font-medium flex items-center gap-1 transition-all",
                  continuousMode ? "bg-amber-500 text-white" : "bg-white/[0.06] text-white/40 border border-white/[0.08]"
                )}
                whileTap={{ scale: 0.95 }}
              >
                <Zap className="w-2.5 h-2.5" />
                {continuousMode ? "ON" : "OFF"}
              </motion.button>
            </div>

            {/* Tabs — amber accent for GP */}
            <div className="px-5 pb-3">
              <div className="flex rounded-xl overflow-hidden border border-amber-400/20 bg-white/[0.03]">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setShowManualInput(false); setCodeValidated(false); setManualCode(""); }}
                    className={cn(
                      "flex-1 py-2.5 text-xs font-semibold transition-all duration-200",
                      activeTab === tab.key ? "bg-amber-500/20 text-amber-400" : "text-white/40"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {/* ── Scanner Tab ── */}
                {activeTab === "scanner" && (
                  <motion.div key="scanner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center h-full px-5">
                    <div
                      className="relative w-full rounded-2xl overflow-hidden border border-white/[0.06]"
                      style={{ background: "rgba(0,0,0,0.3)", height: "50vh", maxHeight: "420px" }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-56 h-56">
                          {["top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-2xl",
                            "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-2xl",
                            "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-2xl",
                            "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-2xl"
                          ].map((pos) => (
                            <div key={pos} className={cn("absolute w-10 h-10 border-amber-400/50", pos)} />
                          ))}
                          <motion.div
                            className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent"
                            animate={{ top: ["10%", "90%", "10%"] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                            <ScanLine className="w-7 h-7 text-amber-400/30" />
                            <span className="text-[11px] text-white/25 font-medium">Placez le QR ici</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => setCameraActive(true)} className="absolute inset-0 w-full h-full z-10" />
                      <div className="absolute bottom-4 left-0 right-0 text-center">
                        <span className="text-[10px] text-white/35 font-medium bg-black/20 px-3 py-1 rounded-full">
                          Appuyez pour activer la caméra
                        </span>
                      </div>
                    </div>

                    {/* Manual entry */}
                    <div className="w-full mt-4">
                      {!showManualInput && !codeValidated && (
                        <motion.button
                          onClick={() => setShowManualInput(true)}
                          className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border border-amber-400/25 bg-amber-500/10 text-amber-400"
                          whileTap={{ scale: 0.97 }}
                        >
                          <Keyboard className="w-4 h-4" />
                          Entrez le code colis
                        </motion.button>
                      )}

                      <AnimatePresence>
                        {showManualInput && !codeValidated && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex flex-col gap-3">
                            <div className="flex gap-2">
                              <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <input
                                  type="text"
                                  value={manualCode}
                                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                                  onKeyDown={(e) => e.key === "Enter" && validateCode()}
                                  placeholder="Ex: KNK-2024-0501"
                                  className="w-full pl-9 pr-4 py-3 rounded-xl text-sm font-medium text-white placeholder:text-white/25 border border-white/[0.08] bg-white/[0.04] focus:outline-none focus:border-amber-400/40"
                                  autoFocus
                                />
                              </div>
                              <motion.button
                                onClick={validateCode}
                                disabled={manualCode.trim().length < 3}
                                className="px-5 py-3 rounded-xl font-semibold text-sm bg-amber-500/20 text-amber-400 border border-amber-400/25 disabled:opacity-30 disabled:cursor-not-allowed"
                                whileTap={{ scale: 0.97 }}
                              >
                                OK
                              </motion.button>
                            </div>
                            <button onClick={() => { setShowManualInput(false); setManualCode(""); }} className="text-xs text-white/30 font-medium">
                              Annuler
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Code validated → show GP actions */}
                      <AnimatePresence>
                        {codeValidated && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-amber-400/20 bg-amber-500/10">
                              <CheckCircle2 className="w-4 h-4 text-amber-400" />
                              <span className="text-sm font-semibold text-amber-400">{manualCode}</span>
                              <button onClick={() => { setCodeValidated(false); setShowManualInput(true); }} className="ml-auto text-[10px] text-white/40 font-medium">
                                Modifier
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {codeActions.map((a) => (
                                <motion.button
                                  key={a.action}
                                  onClick={() => handleCodeAction(a.action)}
                                  className="flex items-center gap-2.5 p-3 rounded-xl border border-white/[0.06] bg-white/[0.04]"
                                  whileTap={{ scale: 0.96 }}
                                >
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10">
                                    <a.icon className="w-4 h-4 text-amber-400" />
                                  </div>
                                  <span className="text-[11px] font-semibold text-white/80">{a.label}</span>
                                </motion.button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {/* ── Mon QR Tab ── */}
                {activeTab === "mon_qr" && (
                  <motion.div key="mon_qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center px-5 pt-2">
                    <p className="text-xs text-white/40 mb-4 self-start">Mon identité GP</p>
                    <div className="w-full rounded-2xl p-6 flex flex-col items-center border border-white/[0.06] bg-white/[0.03]">
                      <div className="bg-white rounded-xl p-4 mb-3">
                        <QRCodeDisplay value={`konnekt://gp/${gpId || "gp-demo"}`} size={170} />
                      </div>
                      <p className="text-[11px] text-white/35 mt-1">Les clients scannent ce QR pour déposer</p>
                      {isVerified && (
                        <div className="flex items-center gap-1 mt-2 text-amber-400 text-[10px]">
                          <ShieldCheck className="w-3 h-3" /> Transporteur vérifié
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 w-full my-5">
                      <div className="flex-1 h-px bg-white/[0.06]" />
                      <span className="text-[10px] text-white/30 font-medium">Ou</span>
                      <div className="flex-1 h-px bg-white/[0.06]" />
                    </div>
                    <button onClick={() => setActiveTab("scanner")} className="w-full py-3 rounded-xl border border-white/[0.08] bg-white/[0.04] flex items-center justify-center gap-2 text-white/50 text-sm font-medium">
                      <QrCode className="w-4 h-4" />
                      Scanner un QR client
                    </button>
                  </motion.div>
                )}

                {/* ── Mes Colis Tab — Interactive with expandable QR ── */}
                {activeTab === "mes_colis" && (
                  <motion.div key="mes_colis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5 pt-2">
                    <p className="text-xs text-white/40 mb-3">Colis actifs — Appuyez pour afficher le QR</p>
                    <div className="flex flex-col gap-2.5">
                      {mockGPColis.map((colis) => {
                        const isExpanded = expandedColis === colis.id;
                        return (
                          <motion.div
                            key={colis.id}
                            layout
                            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] overflow-hidden"
                          >
                            <button
                              onClick={() => setExpandedColis(isExpanded ? null : colis.id)}
                              className="w-full p-3.5 flex items-center gap-3 text-left"
                            >
                              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                <Package className="w-4 h-4 text-amber-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-white truncate">{colis.route}</span>
                                  <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border", getStatusColor(colis.status))}>
                                    {colis.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] text-white/35 font-mono">{colis.id}</span>
                                  <span className="text-[11px] text-white/35">{colis.weight}</span>
                                  <span className="text-[11px] text-white/35">· {colis.client}</span>
                                </div>
                              </div>
                              <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                <ScanLine className="w-4 h-4 text-white/20" />
                              </motion.div>
                            </button>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-3.5 pb-4 flex flex-col items-center gap-3">
                                    <div className="bg-white rounded-xl p-3">
                                      <QRCodeDisplay value={`konnekt://order/${colis.id}`} size={140} />
                                    </div>
                                    <p className="text-[10px] text-white/30">QR du colis — scan par le client pour confirmer</p>
                                    <div className="flex gap-2 w-full">
                                      <button
                                        onClick={() => { handleOpenChange(false); navigate("/gp/en-cours"); }}
                                        className="flex-1 py-2.5 rounded-xl border border-amber-400/20 bg-amber-500/10 text-amber-400 text-xs font-semibold"
                                      >
                                        Gérer
                                      </button>
                                      <button
                                        onClick={() => { handleOpenChange(false); navigate(`/gp/order/${colis.id}`); }}
                                        className="flex-1 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/60 text-xs font-semibold"
                                      >
                                        Détails
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ═══ LAYER 1: Main popup — Dashboard GP ═══ */}
      <Sheet open={open && !cameraActive && !scanViewOpen} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[92vh] rounded-t-3xl p-0 border-t-0 overflow-hidden"
          style={{ background: BG_GRADIENT }}
        >
          <div {...swipeLayer1}>
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="relative px-5 pt-2 pb-4">
            <div className="absolute top-2 right-4 flex items-center gap-2 z-10">
              {/* Open Layer 2 scanner button */}
              <motion.button
                onClick={openScanView}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-500/15 border border-amber-400/20"
                whileTap={{ scale: 0.9 }}
              >
                <ScanLine className="w-4 h-4 text-amber-400" />
              </motion.button>
              <button
                onClick={() => handleOpenChange(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-sm"
              >
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
                <p className="text-xs mt-0.5 text-white/50">
                  Colis · Livraison · Ajustement
                </p>

                {/* Balance section */}
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

                <button
                  onClick={() => { handleOpenChange(false); navigate("/gp/wallet"); }}
                  className="flex items-center gap-1 mt-1.5 text-xs font-medium text-amber-400"
                >
                  Voir les revenus <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* QR Scan button — amber glow */}
              <motion.button
                onClick={() => setCameraActive(true)}
                className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0"
                whileTap={{ scale: 0.95 }}
              >
                <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/40" />
                <motion.div
                  className="absolute -inset-0.5 rounded-2xl border border-amber-400/15"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <div className="absolute inset-[3px] rounded-xl flex flex-col items-center justify-center gap-1 bg-amber-500/10">
                  <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2.5, repeat: Infinity }}>
                    <ScanLine className="w-8 h-8 text-amber-400" />
                  </motion.div>
                  <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Scanner</span>
                </div>
                {["top-0 left-0 border-t-2 border-l-2 rounded-tl-md",
                  "top-0 right-0 border-t-2 border-r-2 rounded-tr-md",
                  "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-md",
                  "bottom-0 right-0 border-b-2 border-r-2 rounded-br-md"
                ].map((pos) => (
                  <div key={pos} className={cn("absolute w-3 h-3 border-amber-400/60", pos)} />
                ))}
              </motion.button>
            </div>

            {/* Continuous mode toggle */}
            <motion.button
              onClick={() => setContinuousMode(!continuousMode)}
              className={cn(
                "mt-3 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all",
                continuousMode ? "bg-amber-500 text-white" : "bg-white/[0.06] text-white/50 border border-white/[0.08]"
              )}
              whileTap={{ scale: 0.95 }}
            >
              <Zap className="w-3 h-3" />
              Scan continu {continuousMode ? "ON" : "OFF"}
            </motion.button>
          </div>

          {/* Content */}
          <div className="px-4 pb-safe overflow-y-auto" style={{ maxHeight: "calc(92vh - 280px)" }}>
            {scannedCode ? (
              <div className="pt-4">
                <UniversalScanner onComplete={() => handleOpenChange(false)} />
              </div>
            ) : (
              <>
                {/* Quick Actions Grid 3x2 */}
                <div className="grid grid-cols-3 gap-2.5 mt-2">
                  {gpQuickActions.map((action) => (
                    <motion.button
                      key={action.action}
                      onClick={() => handleAction(action.action)}
                      className="flex flex-col items-center gap-2 p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm"
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10">
                        <action.icon className="w-5 h-5 text-amber-400" />
                      </div>
                      <span className="text-[10px] font-semibold text-center leading-tight text-white/80">
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
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="rounded-2xl overflow-hidden p-3.5 border border-white/[0.06] bg-white/[0.03]"
                    >
                      <div className="flex items-start gap-3">
                        {(() => {
                          const Icon = gpCarouselSlides[activeSlide].icon;
                          return (
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-500/10 flex-shrink-0">
                              <Icon className="w-4.5 h-4.5 text-amber-400" />
                            </div>
                          );
                        })()}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-xs text-white/90">
                            {gpCarouselSlides[activeSlide].title}
                          </h4>
                          <p className="text-[11px] mt-0.5 text-white/40 leading-relaxed">
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
                        className="h-1 rounded-full transition-all"
                        style={{
                          width: i === activeSlide ? "1.25rem" : "0.3rem",
                          background: i === activeSlide ? "#fbbf24" : "rgba(255,255,255,0.15)",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
