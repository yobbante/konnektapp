/**
 * ClientScanSheet — Konnekt Scan fullscreen experience
 * Camera-first with tabs: Scanner | Mon QR | Mes Colis
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Keyboard, QrCode, Package, ScanLine
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { QRCameraScanner } from "@/components/gp/QRCameraScanner";
import { UniversalScanner } from "@/components/scan/UniversalScanner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import QRCodeDisplay from "react-qr-code";

type TabKey = "scanner" | "mon_qr" | "mes_colis";

const tabs: { key: TabKey; label: string }[] = [
  { key: "scanner", label: "Scanner" },
  { key: "mon_qr", label: "Mon QR" },
  { key: "mes_colis", label: "Mes Colis" },
];

const mockColis = [
  { id: "KNK-2024-0847", status: "En transit", dest: "Paris → Dakar" },
  { id: "KNK-2024-0923", status: "Livré", dest: "Abidjan → Paris" },
  { id: "KNK-2024-1002", status: "En attente", dest: "Dakar → Marseille" },
];

interface ClientScanSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientScanSheet({ open, onOpenChange }: ClientScanSheetProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("scanner");
  const [manualMode, setManualMode] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setManualMode(false);
      setCameraActive(false);
      setActiveTab("scanner");
    }
    onOpenChange(isOpen);
  }, [onOpenChange]);

  const handleScan = (code: string) => {
    setCameraActive(false);
    handleOpenChange(false);
    navigate(`/tracking?code=${code}`);
  };

  return (
    <>
      <QRCameraScanner
        isOpen={cameraActive}
        onScan={handleScan}
        onClose={() => setCameraActive(false)}
      />

      <Sheet open={open && !cameraActive} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[100dvh] rounded-none p-0 border-0 overflow-hidden"
          style={{ background: "#0B1520" }}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
              <button
                onClick={() => handleOpenChange(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.08]"
              >
                <ChevronLeft className="w-5 h-5 text-white/70" />
              </button>
              <h2 className="text-[15px] font-semibold text-white">
                Konnekt Scan
              </h2>
            </div>

            {/* Tabs */}
            <div className="px-4 pb-4">
              <div className="flex rounded-xl overflow-hidden border border-[#2563eb]/30 bg-[#0d1f33]">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex-1 py-2.5 text-xs font-semibold transition-all duration-200",
                      activeTab === tab.key
                        ? "bg-[#2563eb] text-white"
                        : "text-white/50 hover:text-white/70"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {activeTab === "scanner" && (
                  <motion.div
                    key="scanner"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center h-full"
                  >
                    {/* Camera viewport area */}
                    <div
                      className="relative w-full mx-4 rounded-2xl overflow-hidden"
                      style={{
                        background: "#0a1520",
                        height: "55vh",
                        maxHeight: "480px",
                      }}
                    >
                      {/* Simulated camera view with scan frame */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-60 h-60">
                          {/* Corner brackets */}
                          {[
                            "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-2xl",
                            "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-2xl",
                            "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-2xl",
                            "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-2xl",
                          ].map((pos) => (
                            <div
                              key={pos}
                              className={cn("absolute w-12 h-12 border-[#2563eb]", pos)}
                            />
                          ))}

                          {/* Scan line animation */}
                          <motion.div
                            className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-[#2563eb] to-transparent"
                            animate={{ top: ["10%", "90%", "10%"] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                          />

                          {/* Center icon */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                            <ScanLine className="w-8 h-8 text-[#2563eb]/40" />
                            <span className="text-[11px] text-white/30 font-medium">
                              Placez le QR ici
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Open real camera button overlay */}
                      <button
                        onClick={() => setCameraActive(true)}
                        className="absolute inset-0 w-full h-full z-10"
                      />

                      {/* Tap hint */}
                      <div className="absolute bottom-4 left-0 right-0 text-center">
                        <span className="text-[11px] text-white/40 font-medium bg-black/30 px-3 py-1 rounded-full">
                          Appuyez pour activer la caméra
                        </span>
                      </div>
                    </div>

                    {/* Manual code entry button */}
                    <div className="w-full px-6 mt-6">
                      <motion.button
                        onClick={() => setManualMode(!manualMode)}
                        className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                        style={{
                          background: "#2563eb",
                          color: "white",
                        }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <Keyboard className="w-4 h-4" />
                        Entrez le code colis
                      </motion.button>
                    </div>

                    {/* Manual entry expanded */}
                    <AnimatePresence>
                      {manualMode && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="w-full px-6 mt-3 overflow-hidden"
                        >
                          <UniversalScanner onComplete={() => handleOpenChange(false)} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {activeTab === "mon_qr" && (
                  <motion.div
                    key="mon_qr"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center px-6 pt-2"
                  >
                    <p className="text-sm text-white/50 mb-4 self-start">Ma carte QR</p>

                    {/* QR Card */}
                    <div className="w-full rounded-2xl p-6 flex flex-col items-center"
                      style={{ background: "linear-gradient(135deg, #1a2e4a 0%, #132240 100%)" }}
                    >
                      <div className="bg-white rounded-xl p-4 mb-4">
                        <QRCodeDisplay value="konnekt://user/client-demo-id" size={180} />
                      </div>
                      <p className="text-xs text-white/40 mt-1">
                        Présentez ce QR au transporteur
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3 w-full my-6">
                      <div className="flex-1 h-px bg-[#2563eb]/20" />
                      <span className="text-xs text-[#2563eb]/60 font-medium">Ou</span>
                      <div className="flex-1 h-px bg-[#2563eb]/20" />
                    </div>

                    {/* Scan button */}
                    <button
                      onClick={() => setActiveTab("scanner")}
                      className="w-full py-3.5 rounded-xl border border-white/[0.08] bg-white/[0.04] flex items-center justify-center gap-2 text-white/70 text-sm font-medium"
                    >
                      <QrCode className="w-4 h-4" />
                      Scanner
                    </button>
                  </motion.div>
                )}

                {activeTab === "mes_colis" && (
                  <motion.div
                    key="mes_colis"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-4 pt-2"
                  >
                    <p className="text-sm text-white/50 mb-3 px-2">Mes colis</p>

                    <div className="flex flex-col gap-2.5">
                      {mockColis.map((colis) => (
                        <button
                          key={colis.id}
                          onClick={() => {
                            handleOpenChange(false);
                            navigate(`/tracking?code=${colis.id}`);
                          }}
                          className="flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03] text-left"
                        >
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#2563eb]/10">
                            <Package className="w-5 h-5 text-[#2563eb]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white/90 truncate">{colis.id}</p>
                            <p className="text-[11px] text-white/40">{colis.dest}</p>
                          </div>
                          <span className={cn(
                            "text-[10px] font-semibold px-2 py-1 rounded-full",
                            colis.status === "Livré" ? "bg-emerald-500/15 text-emerald-400" :
                            colis.status === "En transit" ? "bg-[#2563eb]/15 text-[#3b82f6]" :
                            "bg-amber-500/15 text-amber-400"
                          )}>
                            {colis.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom "Quitter" button */}
            <div className="px-6 pb-6 pt-3">
              <button
                onClick={() => handleOpenChange(false)}
                className="w-full py-3 rounded-xl border border-white/[0.1] text-white/60 text-sm font-semibold"
              >
                Quitter
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
