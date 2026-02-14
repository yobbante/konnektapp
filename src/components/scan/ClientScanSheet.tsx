/**
 * ClientScanSheet V6 — Two-layer scan experience
 * Layer 1: Quick actions + balance (original popup)
 * Layer 2: Camera-first tabbed view — same style as Layer 1
 */
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine, X, Keyboard, CreditCard, ShieldCheck, Clock,
  PackageCheck, TrendingUp, Eye, EyeOff, ArrowRight, Lock, Sparkles,
  ChevronLeft, QrCode, Package, ChevronDown, Search, CheckCircle2 } from
"lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { QRCameraScanner } from "@/components/gp/QRCameraScanner";
import { UniversalScanner } from "@/components/scan/UniversalScanner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import QRCodeDisplay from "react-qr-code";

interface ClientScanSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BG_GRADIENT = "linear-gradient(180deg, #0F1923 0%, #15232F 50%, #1A2B3A 100%)";

/* ── Layer 1 data ── */
const quickActions = [
{ icon: CreditCard, label: "Payer supplément", action: "pay_supplement" },
{ icon: PackageCheck, label: "Confirmer réception", action: "confirm_delivery" },
{ icon: TrendingUp, label: "Suivre colis", action: "track" },
{ icon: CreditCard, label: "Mon wallet", action: "wallet" },
{ icon: ShieldCheck, label: "Assurance", action: "insurance" },
{ icon: Clock, label: "Historique", action: "history" }];


const carouselSlides = [
{ title: "Pourquoi confirmer la livraison ?", text: "Votre confirmation libère le paiement au transporteur de manière sécurisée.", icon: PackageCheck },
{ title: "Paiement sécurisé en escrow", text: "Vos fonds sont bloqués jusqu'à confirmation. Aucun risque.", icon: Lock },
{ title: "Protection complète", text: "Activez votre assurance pour couvrir vos envois à 100%.", icon: ShieldCheck },
{ title: "Konnekt Pay", text: "Payez, transférez et retirez directement depuis votre wallet.", icon: Sparkles }];


/* ── Layer 2 data ── */
type TabKey = "scanner" | "mon_qr" | "mes_colis";
const tabs: {key: TabKey;label: string;}[] = [
{ key: "scanner", label: "Scanner" },
{ key: "mon_qr", label: "Mon QR" },
{ key: "mes_colis", label: "Mes Colis" }];


const mockColis = [
{ id: "KNK-2024-0847", status: "En transit", dest: "Paris → Dakar", weight: "3.2 kg", date: "12 Fév 2026" },
{ id: "KNK-2024-0923", status: "Livré", dest: "Abidjan → Paris", weight: "1.5 kg", date: "08 Fév 2026" },
{ id: "KNK-2024-1002", status: "En attente", dest: "Dakar → Marseille", weight: "5.0 kg", date: "13 Fév 2026" }];


/* ── Manual code actions ── */
const codeActions = [
{ icon: TrendingUp, label: "Suivre ce colis", action: "track" },
{ icon: PackageCheck, label: "Confirmer réception", action: "confirm" },
{ icon: CreditCard, label: "Payer supplément", action: "pay" },
{ icon: ShieldCheck, label: "Voir assurance", action: "insurance" }];


export function ClientScanSheet({ open, onOpenChange }: ClientScanSheetProps) {
  const navigate = useNavigate();

  // Layer 1 state
  const [manualMode, setManualMode] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [showBalance, setShowBalance] = useState(false);

  // Layer 2 state
  const [scanViewOpen, setScanViewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("scanner");
  const [cameraActive, setCameraActive] = useState(false);
  const [expandedColis, setExpandedColis] = useState<string | null>(null);

  // Manual code input state (Layer 2)
  const [manualCode, setManualCode] = useState("");
  const [codeValidated, setCodeValidated] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [open]);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setManualMode(false);
      setScannedCode(null);
      setScanViewOpen(false);
      setCameraActive(false);
      setActiveTab("scanner");
      setExpandedColis(null);
      setManualCode("");
      setCodeValidated(false);
      setShowManualInput(false);
    }
    onOpenChange(isOpen);
  }, [onOpenChange]);

  const handleScan = (code: string) => {
    setCameraActive(false);
    setScanViewOpen(false);
    setScannedCode(code);
  };

  const handleAction = (action: string) => {
    handleOpenChange(false);
    switch (action) {
      case "pay_supplement":navigate("/tracking");break;
      case "confirm_delivery":navigate("/delivery-confirmation");break;
      case "track":navigate("/tracking");break;
      case "wallet":navigate("/client/wallet");break;
      case "insurance":navigate("/offres");break;
      case "history":navigate("/historique");break;
    }
  };

  const handleCodeAction = (action: string) => {
    handleOpenChange(false);
    switch (action) {
      case "track":navigate(`/tracking?code=${manualCode}`);break;
      case "confirm":navigate("/delivery-confirmation");break;
      case "pay":navigate("/tracking");break;
      case "insurance":navigate("/offres");break;
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

  return (
    <>
      <QRCameraScanner
        isOpen={cameraActive}
        onScan={handleScan}
        onClose={() => setCameraActive(false)} />


      {/* ═══ LAYER 2: Camera-first tabbed scan view ═══ */}
      <Sheet open={scanViewOpen && !cameraActive} onOpenChange={(o) => {if (!o) setScanViewOpen(false);}}>
        <SheetContent
          side="bottom"
          className="h-[95vh] rounded-t-3xl p-0 border-t-0 overflow-hidden z-[60]"
          style={{ background: BG_GRADIENT }}>

          <div className="flex flex-col h-full">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-1 pb-3">
              <button
                onClick={() => setScanViewOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.08]">

                <ChevronLeft className="w-4 h-4 text-white/60" />
              </button>
              <h2 className="text-[15px] font-semibold text-white">Konnekt Scan</h2>
            </div>

            {/* Tabs — emerald accent like Layer 1 */}
            <div className="px-5 pb-3">
              <div className="flex rounded-xl overflow-hidden border border-emerald-400/20 bg-white/[0.03]">
                {tabs.map((tab) =>
                <button
                  key={tab.key}
                  onClick={() => {setActiveTab(tab.key);setShowManualInput(false);setCodeValidated(false);setManualCode("");}}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-semibold transition-all duration-200",
                    activeTab === tab.key ?
                    "bg-emerald-500/20 text-emerald-400" :
                    "text-white/40"
                  )}>

                    {tab.label}
                  </button>
                )}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {/* ── Scanner Tab ── */}
                {activeTab === "scanner" &&
                <motion.div key="scanner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center h-full px-5">
                    {/* Camera area */}
                    <div
                    className="relative w-full rounded-2xl overflow-hidden border border-white/[0.06]"
                    style={{ background: "rgba(0,0,0,0.3)", height: "50vh", maxHeight: "420px" }}>

                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-56 h-56">
                          {["top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-2xl",
                        "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-2xl",
                        "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-2xl",
                        "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-2xl"].
                        map((pos) =>
                        <div key={pos} className={cn("absolute w-10 h-10 border-emerald-400/50", pos)} />
                        )}
                          <motion.div
                          className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent"
                          animate={{ top: ["10%", "90%", "10%"] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} />

                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                            <ScanLine className="w-7 h-7 text-emerald-400/30" />
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

                    {/* Manual entry button */}
                    <div className="w-full mt-4">
                      {!showManualInput && !codeValidated &&
                    <motion.button
                      onClick={() => setShowManualInput(true)}
                      className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border border-emerald-400/25 bg-emerald-500/10 text-emerald-400"
                      whileTap={{ scale: 0.97 }}>

                          <Keyboard className="w-4 h-4" />
                          Entrez le code colis
                        </motion.button>
                    }

                      {/* Manual code input field */}
                      <AnimatePresence>
                        {showManualInput && !codeValidated &&
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex flex-col gap-3">

                            <div className="flex gap-2">
                              <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <input
                              type="text"
                              value={manualCode}
                              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                              onKeyDown={(e) => e.key === "Enter" && validateCode()}
                              placeholder="Ex: KNK-2024-0847"
                              className="w-full pl-9 pr-4 py-3 rounded-xl text-sm font-medium text-white placeholder:text-white/25 border border-white/[0.08] bg-white/[0.04] focus:outline-none focus:border-emerald-400/40"
                              autoFocus />

                              </div>
                              <motion.button
                            onClick={validateCode}
                            disabled={manualCode.trim().length < 3}
                            className="px-5 py-3 rounded-xl font-semibold text-sm bg-emerald-500/20 text-emerald-400 border border-emerald-400/25 disabled:opacity-30 disabled:cursor-not-allowed"
                            whileTap={{ scale: 0.97 }}>

                                OK
                              </motion.button>
                            </div>
                            <button
                          onClick={() => {setShowManualInput(false);setManualCode("");}}
                          className="text-xs text-white/30 font-medium">

                              Annuler
                            </button>
                          </motion.div>
                      }
                      </AnimatePresence>

                      {/* Code validated → show actions */}
                      <AnimatePresence>
                        {codeValidated &&
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex flex-col gap-3">

                            {/* Validated badge */}
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-emerald-400/20 bg-emerald-500/10">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span className="text-sm font-semibold text-emerald-400">{manualCode}</span>
                              <button
                            onClick={() => {setCodeValidated(false);setShowManualInput(true);}}
                            className="ml-auto text-[10px] text-white/40 font-medium">

                                Modifier
                              </button>
                            </div>

                            {/* Action grid */}
                            <div className="grid grid-cols-2 gap-2">
                              {codeActions.map((a) =>
                          <motion.button
                            key={a.action}
                            onClick={() => handleCodeAction(a.action)}
                            className="flex items-center gap-2.5 p-3 rounded-xl border border-white/[0.06] bg-white/[0.04]"
                            whileTap={{ scale: 0.96 }}>

                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10">
                                    <a.icon className="w-4 h-4 text-emerald-400" />
                                  </div>
                                  <span className="text-[11px] font-semibold text-white/80">{a.label}</span>
                                </motion.button>
                          )}
                            </div>
                          </motion.div>
                      }
                      </AnimatePresence>
                    </div>
                  </motion.div>
                }

                {/* ── Mon QR Tab ── */}
                {activeTab === "mon_qr" &&
                <motion.div key="mon_qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center px-5 pt-2">
                    <p className="text-xs text-white/40 mb-4 self-start">Ma carte QR</p>
                    <div className="w-full rounded-2xl p-6 flex flex-col items-center border border-white/[0.06] bg-white/[0.03]">
                      <div className="bg-white rounded-xl p-4 mb-3">
                        <QRCodeDisplay value="konnekt://user/client-demo-id" size={170} />
                      </div>
                      <p className="text-[11px] text-white/35 mt-1">Présentez ce QR au transporteur</p>
                    </div>
                    <div className="flex items-center gap-3 w-full my-5">
                      <div className="flex-1 h-px bg-white/[0.06]" />
                      <span className="text-[10px] text-white/30 font-medium">Ou</span>
                      <div className="flex-1 h-px bg-white/[0.06]" />
                    </div>
                    <button onClick={() => setActiveTab("scanner")} className="w-full py-3 rounded-xl border border-white/[0.08] bg-white/[0.04] flex items-center justify-center gap-2 text-white/50 text-sm font-medium">
                      <QrCode className="w-4 h-4" />
                      Scanner un QR
                    </button>
                  </motion.div>
                }

                {/* ── Mes Colis Tab — Interactive with expandable QR ── */}
                {activeTab === "mes_colis" &&
                <motion.div key="mes_colis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5 pt-2">
                    <p className="text-xs text-white/40 mb-3">Mes colis — Appuyez pour afficher le QR</p>

                    <div className="flex flex-col gap-2.5">
                      {mockColis.map((colis) => {
                      const isExpanded = expandedColis === colis.id;
                      return (
                        <motion.div
                          key={colis.id}
                          layout
                          className="rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">

                            {/* Colis row */}
                            <button
                            onClick={() => setExpandedColis(isExpanded ? null : colis.id)}
                            className="flex items-center gap-3 p-3.5 w-full text-left">

                              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/10">
                                <Package className="w-5 h-5 text-emerald-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white/90 truncate">{colis.id}</p>
                                <p className="text-[11px] text-white/35">{colis.dest} · {colis.weight}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                "text-[10px] font-semibold px-2 py-1 rounded-full",
                                colis.status === "Livré" ? "bg-emerald-500/15 text-emerald-400" :
                                colis.status === "En transit" ? "bg-sky-500/15 text-sky-400" :
                                "bg-amber-500/15 text-amber-400"
                              )}>{colis.status}</span>
                                <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                  <ChevronDown className="w-4 h-4 text-white/30" />
                                </motion.div>
                              </div>
                            </button>

                            {/* Expanded QR section */}
                            <AnimatePresence>
                              {isExpanded &&
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden">

                                  <div className="px-4 pb-4 pt-1 flex flex-col items-center gap-3">
                                    <div className="h-px w-full bg-white/[0.05]" />
                                    <p className="text-[10px] text-white/30 font-medium">QR à présenter au GP pour scan rapide</p>
                                    <div className="bg-white rounded-xl p-3">
                                      <QRCodeDisplay value={`konnekt://colis/${colis.id}`} size={140} />
                                    </div>
                                    <p className="text-[10px] text-white/25 font-mono">{colis.id}</p>
                                    <div className="flex gap-2 w-full">
                                      <button
                                    onClick={() => {setScanViewOpen(false);handleOpenChange(false);navigate(`/tracking?code=${colis.id}`);}}
                                    className="flex-1 py-2.5 rounded-lg text-xs font-semibold border border-emerald-400/20 bg-emerald-500/10 text-emerald-400">

                                        Suivre
                                      </button>
                                      <button
                                    onClick={() => {setScanViewOpen(false);handleOpenChange(false);navigate("/delivery-confirmation");}}
                                    className="flex-1 py-2.5 rounded-lg text-xs font-semibold border border-white/[0.08] bg-white/[0.04] text-white/60">

                                        Confirmer
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                            }
                            </AnimatePresence>
                          </motion.div>);

                    })}
                    </div>
                  </motion.div>
                }
              </AnimatePresence>
            </div>

            {/* Quitter */}
            <div className="px-5 pb-6 pt-3">
              <button onClick={() => setScanViewOpen(false)} className="w-full py-3 rounded-xl border border-white/[0.08] text-white/40 text-sm font-semibold">
                Quitter
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ═══ LAYER 1: Main scan popup ═══ */}
      <Sheet open={open && !cameraActive && !scanViewOpen} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[92vh] rounded-t-3xl p-0 border-t-0 overflow-hidden"
          style={{ background: BG_GRADIENT }}>

          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="relative px-5 pt-2 pb-4">
            



            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white">Scanner avec Konnekt</h2>
                <p className="text-xs mt-0.5 text-white/50">Paiement · Suivi · Confirmation</p>

                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => setShowBalance(!showBalance)} className="flex items-center gap-2">
                    {showBalance ? <EyeOff className="w-3.5 h-3.5 text-white/40" /> : <Eye className="w-3.5 h-3.5 text-white/40" />}
                    {showBalance ?
                    <span className="text-lg font-bold text-white">12 500 FCFA</span> :

                    <span className="text-sm tracking-[0.3em] text-white/40 font-medium">••••••</span>
                    }
                  </button>
                </div>

                <button onClick={() => {handleOpenChange(false);navigate("/client/wallet");}} className="flex items-center gap-1 mt-1.5 text-xs font-medium text-emerald-400">
                  Voir le wallet <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* ★ QR Scan button → opens Layer 2 */}
              <motion.button
                onClick={openScanView}
                className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0"
                whileTap={{ scale: 0.95 }}>

                <div className="absolute inset-0 rounded-2xl border-2 border-emerald-400/40" />
                <motion.div className="absolute -inset-0.5 rounded-2xl border border-emerald-400/15" animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 3, repeat: Infinity }} />
                <div className="absolute inset-[3px] rounded-xl flex flex-col items-center justify-center gap-1 bg-emerald-500/10">
                  <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2.5, repeat: Infinity }}>
                    <ScanLine className="w-8 h-8 text-emerald-400" />
                  </motion.div>
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Scanner</span>
                </div>
                {["top-0 left-0 border-t-2 border-l-2 rounded-tl-md",
                "top-0 right-0 border-t-2 border-r-2 rounded-tr-md",
                "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-md",
                "bottom-0 right-0 border-b-2 border-r-2 rounded-br-md"].
                map((pos) =>
                <div key={pos} className={cn("absolute w-3 h-3 border-emerald-400/60", pos)} />
                )}
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 pb-safe overflow-y-auto" style={{ maxHeight: "calc(92vh - 200px)" }}>
            {scannedCode ?
            <div className="pt-4">
                <UniversalScanner onComplete={() => handleOpenChange(false)} />
              </div> :

            <>
                <div className="grid grid-cols-3 gap-2.5 mt-2">
                  {quickActions.map((action) =>
                <motion.button
                  key={action.action}
                  onClick={() => handleAction(action.action)}
                  className="flex flex-col items-center gap-2 p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm"
                  whileTap={{ scale: 0.95 }}>

                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10">
                        <action.icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="text-[10px] font-semibold text-center leading-tight text-white/80">{action.label}</span>
                    </motion.button>
                )}
                </div>

                <motion.button
                onClick={() => setManualMode(!manualMode)}
                className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03]"
                whileTap={{ scale: 0.98 }}>

                  <Keyboard className="w-4 h-4 text-white/40" />
                  <span className="text-xs font-medium text-white/50">Saisir un code manuellement</span>
                </motion.button>

                <AnimatePresence>
                  {manualMode &&
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                      <UniversalScanner onComplete={() => handleOpenChange(false)} />
                    </motion.div>
                }
                </AnimatePresence>

                <div className="mt-4 mb-4">
                  <AnimatePresence mode="wait">
                    <motion.div
                    key={activeSlide}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-2xl overflow-hidden p-3.5 border border-white/[0.06] bg-white/[0.03]">

                      <div className="flex items-start gap-3">
                        {(() => {
                        const Icon = carouselSlides[activeSlide].icon;
                        return (
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-500/10 flex-shrink-0">
                              <Icon className="w-4.5 h-4.5 text-emerald-400" />
                            </div>);

                      })()}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-xs text-white/90">{carouselSlides[activeSlide].title}</h4>
                          <p className="text-[11px] mt-0.5 text-white/40 leading-relaxed">{carouselSlides[activeSlide].text}</p>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                  <div className="flex justify-center gap-1.5 mt-3">
                    {carouselSlides.map((_, i) =>
                  <button
                    key={i}
                    onClick={() => setActiveSlide(i)}
                    className="h-1 rounded-full transition-all"
                    style={{
                      width: i === activeSlide ? "1.25rem" : "0.3rem",
                      background: i === activeSlide ? "#34d399" : "rgba(255,255,255,0.15)"
                    }} />

                  )}
                  </div>
                </div>
              </>
            }
          </div>
        </SheetContent>
      </Sheet>
    </>);

}