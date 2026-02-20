/**
 * GPScanPage V2 — Connectée au ScanHeart + Konnekt Engine
 *
 * Architecture:
 *   GPScanPage
 *     → ScanHeart (scanner + résolution)
 *       → scan-engine (backend)
 *         → ScannerGPView | ScannerClientView | UnifiedScanRouter
 *
 * INVARIANTS:
 * - Aucune logique métier ici
 * - Tout passe par ScanHeart → scan-engine
 * - GPScanPage est une page terrain GP, accent ambre
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, QrCode, ListChecks, ArrowLeft,
  Shield, Star, Truck, Package, User,
  Zap, AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { ScanHeart } from "@/components/scan/ScanHeart";
import { ScanQRTab } from "@/components/scan/ScanQRTab";
import { BulkScanner } from "@/components/scan/BulkScanner";
import { Badge } from "@/components/ui/badge";
import QRCode from "react-qr-code";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GPProfile {
  id: string;
  business_name: string;
  gp_type: string;
  status: string;
  rating: number | null;
  total_deliveries: number | null;
  verified_at: string | null;
  base_origin_city: string | null;
  base_destination_city: string | null;
}

type TabKey = "scanner" | "mon_qr" | "lot";

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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GPScanPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<GPProfile | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [activeOffersCount, setActiveOffersCount] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>("scanner");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: profile } = await supabase
        .from("gp_profiles")
        .select("id, business_name, gp_type, status, rating, total_deliveries, verified_at, base_origin_city, base_destination_city")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) { navigate("/gp/inscription"); return; }
      setGpProfile(profile);

      const [{ count: pending }, { count: active }, { count: offers }] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("gp_id", profile.id).eq("status", "pending"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("gp_id", profile.id).in("status", ["accepted", "collected", "in_transit", "checked_in"]),
        supabase.from("gp_offers").select("*", { count: "exact", head: true }).eq("gp_id", profile.id).eq("status", "active"),
      ]);

      setPendingCount(pending || 0);
      setActiveOrdersCount(active || 0);
      setActiveOffersCount(offers || 0);
    } catch (error) {
      console.error("GPScanPage error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader message="Chargement scanner..." />;
  if (!gpProfile) return null;

  // ── Restriction bagages_international ──
  if (gpProfile.gp_type !== "bagages_international") {
    return (
      <GPDashboardLayout
        gpProfile={gpProfile}
        pendingCount={pendingCount}
        activeOrdersCount={activeOrdersCount}
        activeTab="scan"
      >
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-amber-400/60" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Scan réservé aux GP Bagages</p>
            <p className="text-sm text-muted-foreground mt-1">
              Le scanner QR est disponible uniquement pour les transporteurs GP Bagages Internationaux.
            </p>
          </div>
        </div>
      </GPDashboardLayout>
    );
  }

  // Build GP QR — secured JSON identity token
  const gpQRData = JSON.stringify({
    type: "gp_profile",
    gp_id: gpProfile.id,
    name: gpProfile.business_name,
    v: 2,
  });

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "scanner", label: "Scanner", icon: Camera },
    { key: "mon_qr", label: "Mon QR", icon: QrCode },
    { key: "lot", label: "Lot", icon: ListChecks },
  ];

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingCount}
      activeOrdersCount={activeOrdersCount}
      activeTab="scan"
    >
      {/* ── Dark header ── */}
      <div
        className="sticky top-0 z-10 border-b border-white/[0.06] backdrop-blur-xl"
        style={{ background: "rgba(15, 25, 35, 0.92)" }}
      >
        <div className="flex items-center gap-3 px-5 py-3.5">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-bold text-white">Konnekt Scan — GP</h1>
              {gpProfile.verified_at && (
                <Badge className="text-[9px] bg-amber-500/20 text-amber-400 border-amber-400/30 px-1.5 py-0 gap-0.5">
                  <Shield className="w-2.5 h-2.5" /> Vérifié
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-white/30 font-medium">Powered by Konnekt Engine</p>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] text-amber-400/70 font-medium">LIVE</span>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-0 px-5 pb-3">
          {[
            { label: "En attente", value: pendingCount, color: "text-amber-400" },
            { label: "En cours", value: activeOrdersCount, color: "text-sky-400" },
            { label: "Offres actives", value: activeOffersCount, color: "text-emerald-400" },
          ].map((stat, i) => (
            <div key={stat.label} className={cn(
              "flex-1 text-center",
              i < 2 ? "border-r border-white/[0.06]" : ""
            )}>
              <p className={cn("text-lg font-bold", stat.color)}>{stat.value}</p>
              <p className="text-[9px] text-white/30 uppercase tracking-wide">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="px-5 pb-3">
          <div className="flex rounded-xl overflow-hidden border border-amber-400/20 bg-white/[0.03]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5",
                    activeTab === tab.key
                      ? "bg-amber-500/20 text-amber-400"
                      : "text-white/35 hover:text-white/60"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="px-5 py-4 min-h-screen" style={{ background: BG_GRADIENT }}>
        <AnimatePresence mode="wait">

          {/* ── Scanner Tab — ScanHeart → scan-engine → ScannerGPView ── */}
          {activeTab === "scanner" && (
            <motion.div
              key="scanner"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Engine badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-500/15 flex items-center justify-center">
                    <Zap className="w-2.5 h-2.5 text-amber-400" />
                  </div>
                  <span className="text-[10px] font-bold text-amber-400/70 uppercase tracking-widest">
                    Scan & QR · Konnekt Engine
                  </span>
                </div>
                <span className="text-[9px] text-white/20 font-mono">v2</span>
              </div>

              {/* ScanHeart — the V2 engine-driven scanner */}
              <ScanHeart
                role="gp"
                accent="amber"
                darkMode
                cameraHeight="45vh"
                gpId={gpProfile.id}
                autoClose={false}
              />

              {/* Terrain explainer */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
                <h4 className="text-xs font-semibold text-white/60">Guide terrain GP</h4>
                {[
                  { n: "1", text: "Scannez le QR d'une commande pour enregistrer le dépôt ou valider le poids." },
                  { n: "2", text: "Scannez le QR d'un client pour voir ses commandes actives liées." },
                  { n: "3", text: "Utilisez le mode Lot pour scanner plusieurs colis d'affilée." },
                ].map((item) => (
                  <div key={item.n} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {item.n}
                    </span>
                    <span className="text-[11px] text-white/40 leading-relaxed">{item.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Mon QR Tab ── */}
          {activeTab === "mon_qr" && (
            <motion.div
              key="mon_qr"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Identity card */}
              <div className="rounded-2xl border border-amber-400/20 bg-white/[0.03] p-5 space-y-5">
                {/* GP header */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center border border-amber-400/20">
                    <Truck className="w-7 h-7 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white/90 truncate">{gpProfile.business_name}</p>
                    {gpProfile.base_origin_city && gpProfile.base_destination_city && (
                      <p className="text-xs text-white/40 mt-0.5">
                        {gpProfile.base_origin_city} → {gpProfile.base_destination_city}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      {gpProfile.verified_at && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-full">
                          <Shield className="w-2.5 h-2.5" /> Vérifié
                        </span>
                      )}
                      {gpProfile.rating && (
                        <span className="text-[10px] text-amber-400">⭐ {gpProfile.rating.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-2xl shadow-lg">
                    <QRCode value={gpQRData} size={180} level="H" />
                  </div>
                </div>

                {/* ID */}
                <div className="text-center">
                  <span className="font-mono text-xs text-white/30 bg-white/[0.04] px-3 py-1.5 rounded-lg">
                    GP-{gpProfile.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "En cours", value: activeOrdersCount, color: "text-sky-400" },
                    { label: "Livrés", value: gpProfile.total_deliveries || 0, color: "text-emerald-400" },
                    { label: "Offres", value: activeOffersCount, color: "text-amber-400" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-2.5 text-center">
                      <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
                      <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Role-based visibility info */}
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

              {/* Explainer */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
                <h4 className="text-xs font-semibold text-white/60">À quoi sert mon QR ?</h4>
                {[
                  { n: "1", text: "Clients : Présentez votre QR pour qu'ils vous trouvent rapidement." },
                  { n: "2", text: "Dépôt : Un client scanne votre QR pour initier une remise de colis." },
                  { n: "3", text: "Admin : Les agents peuvent vérifier votre profil sur le terrain." },
                ].map((item) => (
                  <div key={item.n} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {item.n}
                    </span>
                    <span className="text-[11px] text-white/40 leading-relaxed">{item.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Lot Tab — Bulk scanning ── */}
          {activeTab === "lot" && (
            <motion.div
              key="lot"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Engine badge */}
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-500/15 flex items-center justify-center">
                  <ListChecks className="w-2.5 h-2.5 text-amber-400" />
                </div>
                <span className="text-[10px] font-bold text-amber-400/70 uppercase tracking-widest">
                  Mode lot — Scan multiple
                </span>
              </div>

              <BulkScanner gpId={gpProfile.id} onComplete={loadData} />

              {/* Lot explainer */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
                <h4 className="text-xs font-semibold text-white/60">Mode lot</h4>
                {[
                  { n: "1", text: "Scannez plusieurs QR de colis successivement sans interruption." },
                  { n: "2", text: "Idéal lors de l'enregistrement d'un groupe de bagages à l'aéroport." },
                  { n: "3", text: "Chaque scan est validé par le moteur et journalisé automatiquement." },
                ].map((item) => (
                  <div key={item.n} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {item.n}
                    </span>
                    <span className="text-[11px] text-white/40 leading-relaxed">{item.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GPDashboardLayout>
  );
}
