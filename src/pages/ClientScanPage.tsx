/**
 * ClientScanPage V2 — Premium dark design + shared ScanHeart
 * 
 * Full-page scan experience with the SAME engine as the sheets.
 * Uses shared ScanHeart, ScanQRTab, ScanColisTab components.
 * Premium "bleu nuit" design matching the sheet experience.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, QrCode, Package, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ScanHeart } from "@/components/scan/ScanHeart";
import { ScanQRTab } from "@/components/scan/ScanQRTab";
import { ScanColisTab } from "@/components/scan/ScanColisTab";

const BG_GRADIENT = "linear-gradient(180deg, #0F1923 0%, #15232F 50%, #1A2B3A 100%)";

type TabKey = "scanner" | "mon_qr" | "mes_colis";
const tabs: { key: TabKey; label: string; icon: typeof ScanLine }[] = [
  { key: "scanner", label: "Scanner", icon: ScanLine },
  { key: "mon_qr", label: "Mon QR", icon: QrCode },
  { key: "mes_colis", label: "Mes Colis", icon: Package },
];

export default function ClientScanPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("scanner");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen pb-24" style={{ background: BG_GRADIENT }}>
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#0F1923]/80 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-5 py-4">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.08]">
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>
          <div className="flex-1">
            <h1 className="text-[15px] font-bold text-white">Scan & QR</h1>
            <p className="text-[10px] text-white/35 font-medium">Powered by Konnekt Engine</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        {/* Tabs */}
        <div className="px-5 pb-3">
          <div className="flex rounded-xl overflow-hidden border border-emerald-400/20 bg-white/[0.03]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5",
                    activeTab === tab.key ? "bg-emerald-500/20 text-emerald-400" : "text-white/40"
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

      {/* Content */}
      <div className="px-5 py-4">
        <AnimatePresence mode="wait">
          {activeTab === "scanner" && (
            <motion.div key="scanner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-4">
              <ScanHeart
                role="client"
                accent="emerald"
                darkMode
                cameraHeight="45vh"
              />

              {/* Explainer card */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
                <h4 className="text-xs font-semibold text-white/70">Comment ça marche ?</h4>
                {[
                  { n: "1", text: "Scannez le QR d'un transporteur pour voir son profil et vos colis." },
                  { n: "2", text: "Scannez le QR d'un client pour l'ajouter comme destinataire." },
                  { n: "3", text: "Entrez un numéro CMD-XXXX pour retrouver un colis manuellement." },
                ].map((item) => (
                  <div key={item.n} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{item.n}</span>
                    <span className="text-[11px] text-white/40 leading-relaxed">{item.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "mon_qr" && (
            <motion.div key="qr" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <ScanQRTab
                role="client"
                accent="emerald"
                darkMode
                onSwitchToScanner={() => setActiveTab("scanner")}
              />

              {/* QR Explainer */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3 mt-5">
                <h4 className="text-xs font-semibold text-white/70">À quoi sert mon QR ?</h4>
                {[
                  { n: "1", text: "Remise de colis : Présentez-le au transporteur pour confirmation instantanée." },
                  { n: "2", text: "Identité : Un autre client peut vous scanner pour vous ajouter comme destinataire." },
                  { n: "3", text: "Partagez-le par message pour des remises sans saisie manuelle." },
                ].map((item) => (
                  <div key={item.n} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{item.n}</span>
                    <span className="text-[11px] text-white/40 leading-relaxed">{item.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "mes_colis" && (
            <motion.div key="colis" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-4">
              <ScanColisTab
                role="client"
                accent="emerald"
                darkMode
                userId={userId}
              />

              {/* Colis Explainer */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
                <h4 className="text-xs font-semibold text-white/70">Vos colis en un clin d'œil</h4>
                {[
                  { n: "1", text: "Appuyez sur un colis pour voir ses détails et son QR Code." },
                  { n: "2", text: "Présentez le QR du colis au transporteur lors du dépôt." },
                  { n: "3", text: "Chaque scan met à jour le statut en temps réel." },
                ].map((item) => (
                  <div key={item.n} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{item.n}</span>
                    <span className="text-[11px] text-white/40 leading-relaxed">{item.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}