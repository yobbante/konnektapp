/**
 * ClientScanSheet V8 — Unified with ScanHeart
 * Layer 1: Quick actions + balance dashboard
 * Layer 2: ScanHeart + ScanQRTab + ScanColisTab (shared components)
 * 
 * "One scan heart" — all logic through shared ScanHeart component.
 */
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine, CreditCard, ShieldCheck, Clock,
  PackageCheck, TrendingUp, Eye, EyeOff, ArrowRight, Lock, Sparkles
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSwipeDown } from "@/hooks/useSwipeDown";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ScanHeart } from "./ScanHeart";
import { ScanQRTab } from "./ScanQRTab";
import { ScanColisTab } from "./ScanColisTab";

interface ClientScanSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BG_GRADIENT = "linear-gradient(180deg, #0F1923 0%, #15232F 50%, #1A2B3A 100%)";

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

type TabKey = "scanner" | "mon_qr" | "mes_colis";
const tabs: { key: TabKey; label: string }[] = [
  { key: "scanner", label: "Scanner" },
  { key: "mon_qr", label: "Mon QR" },
  { key: "mes_colis", label: "Mes Colis" },
];

export function ClientScanSheet({ open, onOpenChange }: ClientScanSheetProps) {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);
  const [showBalance, setShowBalance] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [scanViewOpen, setScanViewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("scanner");

  const swipeLayer1 = useSwipeDown(() => handleOpenChange(false));
  const swipeLayer2 = useSwipeDown(() => setScanViewOpen(false));

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("client_wallets").select("available_balance").eq("user_id", user.id).maybeSingle();
      if (data) setWalletBalance(data.available_balance);
    };
    load();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setActiveSlide(prev => (prev + 1) % carouselSlides.length), 4000);
    return () => clearInterval(timer);
  }, [open]);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) { setScanViewOpen(false); setActiveTab("scanner"); }
    onOpenChange(isOpen);
  }, [onOpenChange]);

  const handleAction = (action: string) => {
    handleOpenChange(false);
    const routes: Record<string, string> = {
      pay_supplement: "/payer-supplement", confirm_delivery: "/confirmer-reception",
      track: "/tracking", wallet: "/client/wallet", insurance: "/assurance", history: "/historique",
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
              <h2 className="text-[15px] font-semibold text-white">Konnekt Scan</h2>
              <Badge variant="outline" className="ml-auto text-[9px] border-emerald-400/30 text-emerald-400 px-1.5">ENGINE</Badge>
            </div>

            {/* Tabs */}
            <div className="px-5 pb-3">
              <div className="flex rounded-xl overflow-hidden border border-emerald-400/20 bg-white/[0.03]">
                {tabs.map((tab) => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={cn("flex-1 py-2.5 text-xs font-semibold transition-all duration-200",
                      activeTab === tab.key ? "bg-emerald-500/20 text-emerald-400" : "text-white/40"
                    )}>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-5 pb-6">
              <AnimatePresence mode="wait">
                {activeTab === "scanner" && (
                  <motion.div key="scanner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ScanHeart
                      role="client"
                      accent="emerald"
                      darkMode
                      autoClose={false}
                    />
                  </motion.div>
                )}
                {activeTab === "mon_qr" && (
                  <motion.div key="qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ScanQRTab role="client" accent="emerald" darkMode onSwitchToScanner={() => setActiveTab("scanner")} />
                  </motion.div>
                )}
                {activeTab === "mes_colis" && (
                  <motion.div key="colis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ScanColisTab role="client" accent="emerald" darkMode userId={userId} onClose={closeBoth} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ═══ LAYER 1: Dashboard popup ═══ */}
      <Sheet open={open && !scanViewOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl p-0 border-t-0 overflow-hidden" style={{ background: BG_GRADIENT }}>
          <div {...swipeLayer1}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-white/20" /></div>

            <div className="relative px-5 pt-2 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-white">Scanner avec Konnekt</h2>
                  <p className="text-xs mt-0.5 text-white/50">Paiement · Suivi · Confirmation</p>
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => setShowBalance(!showBalance)} className="flex items-center gap-2">
                      {showBalance ? <EyeOff className="w-3.5 h-3.5 text-white/40" /> : <Eye className="w-3.5 h-3.5 text-white/40" />}
                      {showBalance ? (
                        <span className="text-lg font-bold text-white">{walletBalance !== null ? `${walletBalance.toLocaleString()} FCFA` : "-- FCFA"}</span>
                      ) : (
                        <span className="text-sm tracking-[0.3em] text-white/40 font-medium">••••••</span>
                      )}
                    </button>
                  </div>
                  <button onClick={() => { handleOpenChange(false); navigate("/client/wallet"); }} className="flex items-center gap-1 mt-1.5 text-xs font-medium text-emerald-400">
                    Voir le wallet <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Scan button → opens Layer 2 */}
                <motion.button onClick={() => setScanViewOpen(true)} className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0" whileTap={{ scale: 0.95 }}>
                  <div className="absolute inset-0 rounded-2xl border-2 border-emerald-400/40" />
                  <motion.div className="absolute -inset-0.5 rounded-2xl border border-emerald-400/15" animate={{ opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 3, repeat: Infinity }} />
                  <div className="absolute inset-[3px] rounded-xl flex flex-col items-center justify-center gap-1 bg-emerald-500/10">
                    <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2.5, repeat: Infinity }}>
                      <ScanLine className="w-8 h-8 text-emerald-400" />
                    </motion.div>
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Scanner</span>
                  </div>
                  {["top-0 left-0 border-t-2 border-l-2 rounded-tl-md", "top-0 right-0 border-t-2 border-r-2 rounded-tr-md",
                    "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-md", "bottom-0 right-0 border-b-2 border-r-2 rounded-br-md"
                  ].map((pos) => (<div key={pos} className={cn("absolute w-3 h-3 border-emerald-400/60", pos)} />))}
                </motion.button>
              </div>
            </div>

            <div className="px-4 pb-safe overflow-y-auto" style={{ maxHeight: "calc(92vh - 200px)" }}>
              <div className="grid grid-cols-3 gap-2.5 mt-2">
                {quickActions.map((action) => (
                  <motion.button key={action.action} onClick={() => handleAction(action.action)}
                    className="flex flex-col items-center gap-2 p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm" whileTap={{ scale: 0.95 }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10">
                      <action.icon className="w-5 h-5 text-emerald-400" />
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
                      {(() => { const Icon = carouselSlides[activeSlide].icon; return (
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-500/10 flex-shrink-0"><Icon className="w-4 h-4 text-emerald-400" /></div>
                      ); })()}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs text-white/90">{carouselSlides[activeSlide].title}</h4>
                        <p className="text-[11px] mt-0.5 text-white/40 leading-relaxed">{carouselSlides[activeSlide].text}</p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
                <div className="flex justify-center gap-1.5 mt-3">
                  {carouselSlides.map((_, i) => (
                    <button key={i} onClick={() => setActiveSlide(i)} className="h-1 rounded-full transition-all"
                      style={{ width: i === activeSlide ? "1.25rem" : "0.3rem", background: i === activeSlide ? "#34d399" : "rgba(255,255,255,0.15)" }} />
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