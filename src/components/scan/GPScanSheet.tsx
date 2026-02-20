/**
 * GPScanSheet MVP V8 — Clean, connected, backend-driven
 *
 * Layer 1: GP command center (balance, quick actions, scan CTA)
 * Layer 2: ScanHeart V2 (camera → scan-engine → ScannerGPView)
 *
 * All buttons navigate to real routes. Zero parallel logic.
 */
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine, X, PackageOpen, PackageCheck, Scale,
  Banknote, Eye, EyeOff, ArrowRight, Zap, ShieldCheck,
  ChevronRight, Clock, Loader2, Layers
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
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

const BG = "linear-gradient(180deg, #0F1923 0%, #15232F 55%, #1A2B3A 100%)";

// ─── Quick actions ─────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    icon: PackageOpen,
    label: "Enregistrer dépôt",
    sub: "Check-in colis",
    route: "/gp/colis",
    accent: "amber",
  },
  {
    icon: PackageCheck,
    label: "Confirmer livraison",
    sub: "Code 6 chiffres",
    route: "/confirm-reception",
    accent: "emerald",
  },
  {
    icon: Scale,
    label: "Ajuster poids",
    sub: "Supplément client",
    route: "/gp/en-cours",
    accent: "sky",
  },
  {
    icon: Banknote,
    label: "Libérer fonds",
    sub: "Escrow → wallet",
    route: "/confirm-reception",
    accent: "emerald",
  },
  {
    icon: ShieldCheck,
    label: "Mon profil public",
    sub: "Visible clients",
    route: "/gp/profil-public",
    accent: "primary",
  },
  {
    icon: Clock,
    label: "Historique ops",
    sub: "Toutes missions",
    route: "/gp/historique",
    accent: "white",
  },
] as const;

type AccentKey = "amber" | "emerald" | "sky" | "primary" | "white";

const ACCENT_STYLES: Record<AccentKey, { icon: string; bg: string; border: string }> = {
  amber:   { icon: "text-amber-400",   bg: "bg-amber-500/12",   border: "border-amber-400/20" },
  emerald: { icon: "text-emerald-400", bg: "bg-emerald-500/12", border: "border-emerald-400/20" },
  sky:     { icon: "text-sky-400",     bg: "bg-sky-500/12",     border: "border-sky-400/20" },
  primary: { icon: "text-primary",     bg: "bg-primary/12",     border: "border-primary/20" },
  white:   { icon: "text-white/60",    bg: "bg-white/[0.05]",   border: "border-white/[0.08]" },
};

// ─── Tab config ───────────────────────────────────────────────────────────────
type TabKey = "scanner" | "mon_qr" | "operations";
const TABS: { key: TabKey; label: string }[] = [
  { key: "scanner",    label: "Scanner" },
  { key: "mon_qr",     label: "Mon QR" },
  { key: "operations", label: "Opérations" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function GPScanSheet({ open, onOpenChange, gpId, isVerified }: GPScanSheetProps) {
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [scanViewOpen, setScanViewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("scanner");

  const swipe1 = useSwipeDown(() => handleClose(false));
  const swipe2 = useSwipeDown(() => setScanViewOpen(false));

  // ── Load wallet balance ──
  useEffect(() => {
    if (!open || !gpId) return;
    setBalanceLoading(true);
    supabase
      .from("gp_wallets")
      .select("balance")
      .eq("gp_id", gpId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setWalletBalance(data.balance);
        setBalanceLoading(false);
      });
  }, [open, gpId]);

  const handleClose = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setScanViewOpen(false);
      setActiveTab("scanner");
      setContinuousMode(false);
    }
    onOpenChange(isOpen);
  }, [onOpenChange]);

  const handleAction = (route: string) => {
    handleClose(false);
    navigate(route);
  };

  const closeBoth = () => {
    setScanViewOpen(false);
    handleClose(false);
  };

  const openScanner = () => {
    setActiveTab("scanner");
    setScanViewOpen(true);
  };

  return (
    <>
      {/* ══════════════════════════════════════════════════
          LAYER 2 — Scan Engine V2 (tabbed)
      ═══════════════════════════════════════════════════ */}
      <Sheet open={scanViewOpen} onOpenChange={(o) => { if (!o) setScanViewOpen(false); }}>
        <SheetContent
          side="bottom"
          className="h-[95vh] rounded-t-3xl p-0 border-t-0 overflow-hidden z-[60]"
          style={{ background: BG }}
        >
          <div className="flex flex-col h-full" {...swipe2}>
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-1 pb-3">
              <button
                onClick={() => setScanViewOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.08] active:bg-white/[0.15]"
              >
                <ArrowRight className="w-4 h-4 text-white/60 rotate-180" />
              </button>
              <div>
                <h2 className="text-[15px] font-bold text-white leading-tight">Konnekt Scan</h2>
                <p className="text-[10px] text-white/30 font-medium">Powered by Konnekt Engine V2</p>
              </div>
              {/* Continuous mode toggle */}
              <motion.button
                onClick={() => setContinuousMode(!continuousMode)}
                className={cn(
                  "ml-auto px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 border transition-all",
                  continuousMode
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-white/[0.05] text-white/40 border-white/[0.08]"
                )}
                whileTap={{ scale: 0.93 }}
              >
                <Zap className="w-2.5 h-2.5" />
                {continuousMode ? "CONTINU ON" : "CONTINU OFF"}
              </motion.button>
            </div>

            {/* Tabs */}
            <div className="px-5 pb-3">
              <div className="flex rounded-xl overflow-hidden border border-amber-400/20 bg-white/[0.02]">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex-1 py-2.5 text-xs font-semibold transition-all duration-200",
                      activeTab === tab.key
                        ? "bg-amber-500/20 text-amber-400"
                        : "text-white/35 hover:text-white/60"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-5 pb-6">
              <AnimatePresence mode="wait">
                {activeTab === "scanner" && (
                  <motion.div
                    key="scanner"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <ScanHeart
                      role="gp"
                      accent="amber"
                      darkMode
                      continuousMode={continuousMode}
                      gpId={gpId}
                      autoClose={false}
                    />
                  </motion.div>
                )}

                {activeTab === "mon_qr" && (
                  <motion.div
                    key="mon_qr"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <ScanQRTab
                      role="gp"
                      accent="amber"
                      darkMode
                      gpId={gpId}
                      isVerified={isVerified}
                      onSwitchToScanner={() => setActiveTab("scanner")}
                    />
                  </motion.div>
                )}

                {activeTab === "operations" && (
                  <motion.div
                    key="operations"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <ScanColisTab
                      role="gp"
                      accent="amber"
                      darkMode
                      gpId={gpId}
                      onClose={closeBoth}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ══════════════════════════════════════════════════
          LAYER 1 — GP Command Center
      ═══════════════════════════════════════════════════ */}
      <Sheet open={open && !scanViewOpen} onOpenChange={handleClose}>
        <SheetContent
          side="bottom"
          className="h-[90vh] rounded-t-3xl p-0 border-t-0 overflow-hidden"
          style={{ background: BG }}
        >
          <div className="flex flex-col h-full" {...swipe1}>
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* ── Header ── */}
            <div className="px-5 pb-4 flex-shrink-0">
              {/* Top bar */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">Espace GP</h2>
                    {isVerified && (
                      <Badge className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-400/30 px-1.5 py-0">
                        <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />
                        Vérifié
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-white/35 mt-0.5">Transport · Livraison · Ajustement</p>
                </div>
                <button
                  onClick={() => handleClose(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.08] active:bg-white/[0.15]"
                >
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>

              {/* Balance + Scan CTA row */}
              <div className="flex items-end gap-3">
                {/* Balance block */}
                <div className="flex-1 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                  <p className="text-[10px] text-white/35 uppercase tracking-wider font-medium mb-2">
                    Solde disponible
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowBalance(!showBalance)}
                      className="flex items-center gap-2"
                    >
                      {showBalance ? (
                        <EyeOff className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                      )}
                      {balanceLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white/30" />
                      ) : showBalance ? (
                        <span className="text-xl font-bold text-white">
                          {walletBalance !== null
                            ? `${walletBalance.toLocaleString()} FCFA`
                            : "— FCFA"}
                        </span>
                      ) : (
                        <span className="text-base tracking-[0.35em] text-white/30 font-medium">
                          ••••••
                        </span>
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => handleAction("/gp/wallet")}
                    className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-amber-400"
                  >
                    Voir les revenus <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* ─── MAIN SCAN BUTTON ─── */}
                <motion.button
                  onClick={openScanner}
                  className="relative w-[100px] h-[100px] rounded-2xl overflow-hidden flex-shrink-0"
                  whileTap={{ scale: 0.94 }}
                  whileHover={{ scale: 1.02 }}
                >
                  {/* Animated border */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl border-2 border-amber-400/50"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <div className="absolute inset-[3px] rounded-xl flex flex-col items-center justify-center gap-1.5 bg-amber-500/10">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <ScanLine className="w-9 h-9 text-amber-400" />
                    </motion.div>
                    <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">
                      Scanner
                    </span>
                  </div>
                  {/* Corner brackets */}
                  {[
                    "top-1 left-1 border-t-2 border-l-2 rounded-tl",
                    "top-1 right-1 border-t-2 border-r-2 rounded-tr",
                    "bottom-1 left-1 border-b-2 border-l-2 rounded-bl",
                    "bottom-1 right-1 border-b-2 border-r-2 rounded-br",
                  ].map((pos) => (
                    <div key={pos} className={cn("absolute w-3 h-3 border-amber-400/70", pos)} />
                  ))}
                </motion.button>
              </div>

              {/* Continuous mode chip */}
              <motion.button
                onClick={() => setContinuousMode(!continuousMode)}
                className={cn(
                  "mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all",
                  continuousMode
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-white/[0.04] text-white/40 border-white/[0.07]"
                )}
                whileTap={{ scale: 0.95 }}
              >
                <Zap className="w-3 h-3" />
                Scan continu {continuousMode ? "ON" : "OFF"}
              </motion.button>
            </div>

            {/* ── Quick Actions grid ── */}
            <div className="flex-1 overflow-y-auto px-5 pb-6">
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-3">
                Actions rapides
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {QUICK_ACTIONS.map((action) => {
                  const s = ACCENT_STYLES[action.accent];
                  return (
                    <motion.button
                      key={action.route + action.label}
                      onClick={() => handleAction(action.route)}
                      className={cn(
                        "flex flex-col items-start gap-2.5 p-3.5 rounded-2xl border text-left transition-all",
                        s.bg, s.border
                      )}
                      whileTap={{ scale: 0.94 }}
                    >
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-black/20")}>
                        <action.icon className={cn("w-4.5 h-4.5", s.icon)} style={{ width: "1.1rem", height: "1.1rem" }} />
                      </div>
                      <div>
                        <p className={cn("text-[11px] font-bold leading-tight text-white/85")}>
                          {action.label}
                        </p>
                        <p className="text-[9px] text-white/30 mt-0.5 leading-tight">{action.sub}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* ── Divider + Secondary actions ── */}
              <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                <button
                  onClick={() => setScanViewOpen(true)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-white/[0.04] transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                    <Layers className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-white/80">Mode scan avancé</p>
                    <p className="text-[10px] text-white/35">QR · Continu · Lot · Opérations</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/25 flex-shrink-0" />
                </button>

                <div className="h-px bg-white/[0.05]" />

                <button
                  onClick={() => handleAction("/gp/wallet")}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-white/[0.04] transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                    <Banknote className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-white/80">Wallet & retraits</p>
                    <p className="text-[10px] text-white/35">Solde · Commissions · Historique</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/25 flex-shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
