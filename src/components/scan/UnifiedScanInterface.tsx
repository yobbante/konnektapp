/**
 * UnifiedScanInterface — Single scan interface for all roles
 * 
 * Used by:
 *   - GPScanSheet (inside Sheet)
 *   - ClientScanSheet (inside Sheet)
 *   - GPScanPage (standalone page)
 *   - ClientScanPage (standalone page)
 * 
 * Role-adaptive:
 *   GP → Scanner | Mon QR | Lot (amber accent)
 *   Client → Scanner | Mon QR | Mes Colis (emerald accent)
 * 
 * All scan logic → ScanHeart → scan-engine backend
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, QrCode, ListChecks, Package,
  Shield, Star, Truck, User, Zap,
  AlertTriangle, Clock, Loader2, Eye, MapPin
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScanHeart } from "./ScanHeart";
import { ScanQRTab } from "./ScanQRTab";
import { ScanColisTab } from "./ScanColisTab";
import { GPDistributionList } from "./GPDistributionList";
import QRCode from "react-qr-code";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScanRole = "gp" | "client";
export type ScanTier = "standard" | "premium" | "pro" | "occasionnel";

type GPTabKey = "scanner" | "mon_qr" | "lot";
type ClientTabKey = "scanner" | "mon_qr" | "mes_colis";
type TabKey = GPTabKey | ClientTabKey;

interface GPContext {
  gpId: string;
  businessName: string;
  gpType: string;
  verified: boolean;
  rating: number | null;
  totalDeliveries: number | null;
  baseOriginCity: string | null;
  baseDestinationCity: string | null;
}

interface ClientContext {
  userId: string;
  fullName: string | null;
}

interface ScanStats {
  label: string;
  value: number;
  color: string;
}

export interface UnifiedScanInterfaceProps {
  role: ScanRole;
  /** GP tier for color theming */
  tier?: ScanTier;
  /** GP context — required when role="gp" */
  gpContext?: GPContext;
  /** Client context — required when role="client" */
  clientContext?: ClientContext;
  /** Stats to display in the header strip */
  stats?: ScanStats[];
  /** Whether component is inside a sheet (affects height) */
  isSheet?: boolean;
  /** Called when data changes (e.g. after successful action) */
  onRefresh?: () => void;
  /** Override default tab */
  defaultTab?: TabKey;
}

const BG_GRADIENT = "linear-gradient(180deg, #0F1923 0%, #15232F 50%, #1A2B3A 100%)";

// ─── Role info component ──────────────────────────────────────────────────────

function RoleScanInfo({ icon: Icon, role, info, color }: {
  icon: React.ComponentType<{ className?: string }>;
  role: string;
  info: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.05] flex-shrink-0">
        <Icon className={cn("w-3.5 h-3.5", color)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white/80">{role}</p>
        <p className="text-[10px] text-white/35 leading-tight">{info}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function UnifiedScanInterface({
  role,
  tier = "standard",
  gpContext,
  clientContext,
  stats,
  isSheet = false,
  onRefresh,
  defaultTab,
}: UnifiedScanInterfaceProps) {
  const isGP = role === "gp";

  // ── Tier-based color system ──
  const getTierColors = () => {
    if (!isGP) {
      // Client: teal accent
      return {
        accent: "emerald",
        tabBorder: "border-teal-400/20",
        tabActiveBg: "bg-teal-500/20 text-teal-400",
        dotColor: "bg-teal-400",
        liveColor: "text-teal-400/70",
        accentBg: "bg-teal-500/15",
        accentText: "text-teal-400",
        headerBg: "rgba(10, 24, 20, 0.96)",
      };
    }
    switch (tier) {
      case "pro":
        return {
          accent: "indigo",
          tabBorder: "border-indigo-400/20",
          tabActiveBg: "bg-indigo-500/20 text-indigo-400",
          dotColor: "bg-indigo-400",
          liveColor: "text-indigo-400/70",
          accentBg: "bg-indigo-500/15",
          accentText: "text-indigo-400",
          headerBg: "rgba(14, 10, 28, 0.96)",
        };
      case "premium":
        return {
          accent: "amber",
          tabBorder: "border-amber-400/20",
          tabActiveBg: "bg-amber-500/20 text-amber-400",
          dotColor: "bg-amber-400",
          liveColor: "text-amber-400/70",
          accentBg: "bg-amber-500/15",
          accentText: "text-amber-400",
          headerBg: "rgba(20, 16, 8, 0.96)",
        };
      case "occasionnel":
        return {
          accent: "orange",
          tabBorder: "border-orange-400/20",
          tabActiveBg: "bg-orange-500/20 text-orange-400",
          dotColor: "bg-orange-400",
          liveColor: "text-orange-400/70",
          accentBg: "bg-orange-500/15",
          accentText: "text-orange-400",
          headerBg: "rgba(20, 14, 8, 0.96)",
        };
      default: // standard
        return {
          accent: "sky",
          tabBorder: "border-sky-400/20",
          tabActiveBg: "bg-sky-500/20 text-sky-400",
          dotColor: "bg-sky-400",
          liveColor: "text-sky-400/70",
          accentBg: "bg-sky-500/15",
          accentText: "text-sky-400",
          headerBg: "rgba(10, 18, 24, 0.96)",
        };
    }
  };

  const colors = getTierColors();
  const accent = colors.accent;

  // Determine initial tab
  const initialTab: TabKey = defaultTab || "scanner";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Auto-load stats if not provided
  const [autoStats, setAutoStats] = useState<ScanStats[]>([]);
  const [statsLoading, setStatsLoading] = useState(!stats);

  useEffect(() => {
    if (stats) return;
    loadStats();
  }, [role, gpContext?.gpId, clientContext?.userId]);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      if (isGP && gpContext?.gpId) {
        const [{ count: pending }, { count: active }, { count: offers }] = await Promise.all([
          supabase.from("orders").select("*", { count: "exact", head: true }).eq("gp_id", gpContext.gpId).eq("status", "pending"),
          supabase.from("orders").select("*", { count: "exact", head: true }).eq("gp_id", gpContext.gpId).in("status", ["accepted", "collected", "in_transit", "checked_in", "paid_held"] as any),
          supabase.from("gp_offers").select("*", { count: "exact", head: true }).eq("gp_id", gpContext.gpId).eq("status", "active"),
        ]);
        setAutoStats([
          { label: "En attente", value: pending || 0, color: colors.accentText },
          { label: "En cours", value: active || 0, color: "text-sky-400" },
          { label: "Offres actives", value: offers || 0, color: "text-emerald-400" },
        ]);
      } else if (!isGP && clientContext?.userId) {
        const [{ count: active }, { count: supplements }, { count: transit }] = await Promise.all([
          supabase.from("orders").select("*", { count: "exact", head: true }).eq("client_id", clientContext.userId).in("status", ["pending", "accepted", "collected", "checked_in", "paid_held", "in_transit"] as any),
          supabase.from("orders").select("*", { count: "exact", head: true }).eq("client_id", clientContext.userId).eq("financial_status", "adjustment_required" as any),
          supabase.from("orders").select("*", { count: "exact", head: true }).eq("client_id", clientContext.userId).in("status", ["in_transit", "arrived_destination"] as any),
        ]);
        setAutoStats([
          { label: "Colis actifs", value: active || 0, color: "text-teal-400" },
          { label: "Suppléments", value: supplements || 0, color: "text-amber-400" },
          { label: "En transit", value: transit || 0, color: "text-sky-400" },
        ]);
      }
    } catch (err) {
      console.error("Stats load error:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const displayStats = stats || autoStats;

  // Tab definitions
  const gpTabs: { key: GPTabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "scanner", label: "Scanner", icon: Camera },
    { key: "mon_qr", label: "Mon QR", icon: QrCode },
    { key: "lot", label: "Lot", icon: ListChecks },
  ];

  const clientTabs: { key: ClientTabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "scanner", label: "Scanner", icon: Camera },
    { key: "mon_qr", label: "Mon QR", icon: QrCode },
    { key: "mes_colis", label: "Mes Colis", icon: Package },
  ];

  const tabs = isGP ? gpTabs : clientTabs;

  // Title with tier badge
  const tierLabel = tier === "pro" ? "PRO" : tier === "premium" ? "PREMIUM" : tier === "occasionnel" ? "OCC" : "";
  const title = isGP
    ? `Konnekt Scan — GP`
    : `Konnekt Scan`;

  const subtitle = "Powered by Konnekt Engine";

  // GP QR data — Full URL so native cameras redirect correctly
  const gpQRData = gpContext
    ? `https://konnektapp.lovable.app/client/transporteurs/${gpContext.gpId}`
    : "";

  return (
    <div className="flex flex-col h-full">
      {/* ── Compact dark header ── */}
      <div
        className="sticky top-0 z-10 border-b border-white/[0.06] backdrop-blur-xl flex-shrink-0"
        style={{ background: colors.headerBg }}
      >
        {/* Title row — ultra compact */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-bold text-white truncate">{title}</h1>
            {isGP && gpContext?.verified && (
              <Badge className="text-[8px] bg-amber-500/20 text-amber-400 border-amber-400/30 px-1 py-0 gap-0.5 flex-shrink-0">
                <Shield className="w-2 h-2" /> Vérifié
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", colors.dotColor)} />
            <span className={cn("text-[9px] font-medium", colors.liveColor)}>LIVE</span>
          </div>
        </div>

        {/* Stats strip — inline compact */}
        {displayStats.length > 0 && (
          <div className="flex items-center px-4 pb-2">
            {displayStats.map((stat, i) => (
              <div key={stat.label} className={cn(
                "flex-1 text-center",
                i < displayStats.length - 1 ? "border-r border-white/[0.06]" : ""
              )}>
                <p className={cn("text-base font-bold leading-none", stat.color)}>
                  {statsLoading ? "…" : stat.value}
                </p>
                <p className="text-[8px] text-white/30 uppercase tracking-wide mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs — tight, pill style */}
        <div className="px-4 pb-2.5">
          <div className={cn("flex rounded-xl overflow-hidden border bg-white/[0.03]", colors.tabBorder)}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex-1 py-2 text-[11px] font-semibold transition-all duration-200 flex items-center justify-center gap-1",
                    activeTab === tab.key
                      ? colors.tabActiveBg
                      : "text-white/35 active:text-white/60"
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tab content — optimized scroll ── */}
      <div
        className={cn("flex-1 overflow-y-auto overscroll-contain px-4 py-3", isSheet && "pb-16")}
        style={{ 
          background: BG_GRADIENT,
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
        }}
      >
        <AnimatePresence mode="wait">

          {/* ═══ SCANNER TAB ═══ */}
          {activeTab === "scanner" && (
            <motion.div
              key="scanner"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* ScanHeart — full width, optimized camera height */}
              <ScanHeart
                role={role}
                accent={accent as any}
                darkMode
                cameraHeight={isSheet ? "42vh" : "50vh"}
                gpId={gpContext?.gpId}
                autoClose={false}
              />

              {/* Compact guide — collapsible tips */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 space-y-2">
                <h4 className="text-[10px] font-semibold text-white/50 uppercase tracking-wide">
                  {isGP ? "Guide rapide" : "Comment ça marche"}
                </h4>
                {(isGP ? [
                  { n: "1", text: "Scannez QR commande → dépôt / poids" },
                  { n: "2", text: "Scannez QR client → commandes liées" },
                  { n: "3", text: "Mode Lot → scan en série" },
                ] : [
                  { n: "1", text: "Scannez QR transporteur → profil & départs" },
                  { n: "2", text: "Scannez QR commande → suivi temps réel" },
                  { n: "3", text: "Montrez votre QR → dépôt / réception" },
                ]).map((item) => (
                  <div key={item.n} className="flex items-center gap-2">
                    <span className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0",
                      colors.accentBg, colors.accentText
                    )}>
                      {item.n}
                    </span>
                    <span className="text-[10px] text-white/40">{item.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ MON QR TAB ═══ */}
          {activeTab === "mon_qr" && (
            <motion.div
              key="mon_qr"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {isGP && gpContext ? (
                <>
                  {/* GP Identity card */}
                  <div className="rounded-2xl border border-amber-400/20 bg-white/[0.03] p-5 space-y-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center border border-amber-400/20">
                        <Truck className="w-7 h-7 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white/90 truncate">{gpContext.businessName}</p>
                        {gpContext.baseOriginCity && gpContext.baseDestinationCity && (
                          <p className="text-xs text-white/40 mt-0.5">
                            {gpContext.baseOriginCity} → {gpContext.baseDestinationCity}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          {gpContext.verified && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-full">
                              <Shield className="w-2.5 h-2.5" /> Vérifié
                            </span>
                          )}
                          {gpContext.rating && (
                            <span className="text-[10px] text-amber-400">{gpContext.rating.toFixed(1)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <div className="bg-white p-4 rounded-2xl shadow-lg">
                        <QRCode value={gpQRData} size={180} level="H" />
                      </div>
                    </div>

                    <div className="text-center">
                      <span className="font-mono text-xs text-white/30 bg-white/[0.04] px-3 py-1.5 rounded-lg">
                        GP-{gpContext.gpId.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Role visibility info */}
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
                    <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
                      Informations visibles selon le rôle du scanneur
                    </p>
                    <div className="space-y-2">
                      <RoleScanInfo icon={User} role="Client" info="Profil public + départs disponibles" color="text-sky-400" />
                      <RoleScanInfo icon={Truck} role="Autre GP" info="Informations limitées" color="text-purple-400" />
                      <RoleScanInfo icon={Shield} role="Admin / Agent" info="Accès étendu — commandes, statuts" color="text-amber-400" />
                      <RoleScanInfo icon={Package} role="Livreur" info="Commandes liées — enlèvement / livraison" color="text-emerald-400" />
                    </div>
                  </div>
                </>
              ) : (
                /* Client QR tab */
                <ScanQRTab
                  role="client"
                  accent="emerald"
                  darkMode
                  onSwitchToScanner={() => setActiveTab("scanner")}
                />
              )}
            </motion.div>
          )}

          {/* ═══ MES COLIS TAB (Client only) ═══ */}
          {activeTab === "mes_colis" && !isGP && (
            <motion.div
              key="mes_colis"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ScanColisTab
                role="client"
                accent="emerald"
                darkMode
                userId={clientContext?.userId}
              />
            </motion.div>
          )}

          {/* ═══ LOT TAB (GP only) — Distribution list ═══ */}
          {activeTab === "lot" && isGP && gpContext && (
            <motion.div
              key="lot"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-500/15 flex items-center justify-center">
                  <ListChecks className="w-2.5 h-2.5 text-amber-400" />
                </div>
                <span className="text-[10px] font-bold text-amber-400/70 uppercase tracking-widest">
                  Distribution — Mes colis
                </span>
              </div>

              <GPDistributionList gpId={gpContext.gpId} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
