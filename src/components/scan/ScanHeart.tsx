/**
 * ScanHeart — The unified scan brain/core component
 * 
 * Shared by ClientScanSheet, GPScanSheet, and ClientScanPage.
 * Provides: camera area, manual code input, engine feedback, AND inline result display.
 * The "one scan heart" principle — all scan logic flows through here.
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, Keyboard, Search, Loader2 } from "lucide-react";
import { QRCameraScanner } from "@/components/gp/QRCameraScanner";
import { useScanEngine } from "@/hooks/useScanEngine";
import { useScanRole } from "@/hooks/useScanRole";
import type { ScanEngineResponse } from "@/lib/scanEngine";
import { ScannerInterfaceV2 } from "./v2/ScannerInterfaceV2";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ScanAccent = "emerald" | "amber" | "primary";

interface ScanHeartProps {
  role: string;
  accent?: ScanAccent;
  darkMode?: boolean;
  onResolved?: (response: ScanEngineResponse) => void;
  onError?: (response: ScanEngineResponse) => void;
  autoClose?: boolean;
  continuousMode?: boolean;
  cameraHeight?: string;
  className?: string;
  gpId?: string | null;
}

const ACCENT_CLASSES: Record<ScanAccent, {
  border: string; bg: string; text: string; scanLine: string;
  btnBorder: string; btnBg: string; btnText: string;
  focusBorder: string; feedbackBorder: string; feedbackBg: string;
}> = {
  emerald: {
    border: "border-emerald-400/50", bg: "bg-emerald-500/10", text: "text-emerald-400",
    scanLine: "via-emerald-400/60", btnBorder: "border-emerald-400/25", btnBg: "bg-emerald-500/10",
    btnText: "text-emerald-400", focusBorder: "focus:border-emerald-400/40",
    feedbackBorder: "border-emerald-400/20", feedbackBg: "bg-emerald-500/10",
  },
  amber: {
    border: "border-amber-400/50", bg: "bg-amber-500/10", text: "text-amber-400",
    scanLine: "via-amber-400/60", btnBorder: "border-amber-400/25", btnBg: "bg-amber-500/10",
    btnText: "text-amber-400", focusBorder: "focus:border-amber-400/40",
    feedbackBorder: "border-amber-400/20", feedbackBg: "bg-amber-500/10",
  },
  primary: {
    border: "border-primary/50", bg: "bg-primary/10", text: "text-primary",
    scanLine: "via-primary/60", btnBorder: "border-primary/25", btnBg: "bg-primary/10",
    btnText: "text-primary", focusBorder: "focus:border-primary/40",
    feedbackBorder: "border-primary/20", feedbackBg: "bg-primary/10",
  },
};

export function ScanHeart({
  role,
  accent = "emerald",
  darkMode = true,
  onResolved,
  onError,
  autoClose = false,
  continuousMode = false,
  cameraHeight = "50vh",
  className,
  gpId,
}: ScanHeartProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [engineMessage, setEngineMessage] = useState<string | null>(null);
  const [engineStatus, setEngineStatus] = useState<"idle" | "success" | "error">("idle");
  
  // Scan result state — render inline instead of navigating away
  const [scanResult, setScanResult] = useState<ScanEngineResponse | null>(null);
  const [showResult, setShowResult] = useState(false);

  const { scanRole, gpId: scannerGpId, logScan } = useScanRole();

  const a = ACCENT_CLASSES[accent];

  const { resolve, loading } = useScanEngine({
    autoNavigate: false, // We handle display ourselves
    onResult: (response) => {
      setEngineMessage(response.message);
      if (response.status === "failed") {
        setEngineStatus("error");
        onError?.(response);
        setTimeout(() => setEngineStatus("idle"), 3000);
      } else {
        setEngineStatus("success");
        setScanResult(response);
        setShowResult(true);
        onResolved?.(response);
      }
    },
  });

  const handleCameraScan = useCallback(async (code: string) => {
    setCameraActive(false);
    await resolve(code, role);
    if (continuousMode) {
      setTimeout(() => setCameraActive(true), 1200);
    }
  }, [resolve, role, continuousMode]);

  const handleManualSubmit = useCallback(async () => {
    if (manualCode.trim().length < 3) return;
    await resolve(manualCode.trim(), role);
    setManualCode("");
    setShowManualInput(false);
  }, [manualCode, resolve, role]);

  const resetResult = useCallback(() => {
    setShowResult(false);
    setScanResult(null);
    setEngineMessage(null);
    setEngineStatus("idle");
  }, []);

  const textMuted = darkMode ? "text-white/25" : "text-muted-foreground";
  const textSoft = darkMode ? "text-white/40" : "text-muted-foreground/70";
  const inputBg = darkMode ? "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25" : "bg-background border-border text-foreground placeholder:text-muted-foreground";
  const cardBorder = darkMode ? "border-white/[0.06]" : "border-border/50";

  // ─── RENDER SCAN RESULT INLINE — V2 ───
  if (showResult && scanResult) {
    const scanRole = (role === "gp" || role === "client" || role === "admin" || role === "agent_logistique")
      ? role as "gp" | "client" | "admin" | "agent_logistique"
      : "client" as const;
    const effectiveGpId = gpId || scannerGpId;

    return (
      <div className={cn("flex flex-col", className)}>
        <ScannerInterfaceV2
          engineResponse={scanResult}
          role={scanRole}
          gpId={effectiveGpId}
          onBack={resetResult}
          darkMode={darkMode}
          accent={accent}
        />
      </div>
    );
  }

  // ─── SCANNER VIEW ───
  return (
    <>
      <QRCameraScanner
        isOpen={cameraActive}
        onScan={handleCameraScan}
        onClose={() => setCameraActive(false)}
      />

      <div className={cn("flex flex-col items-center", className)}>
        {/* ── Camera Zone ── */}
        <div
          className={cn("relative w-full rounded-2xl overflow-hidden", cardBorder, "border")}
          style={{ background: darkMode ? "rgba(0,0,0,0.3)" : undefined, height: cameraHeight, maxHeight: "420px" }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-52 h-52">
              {["top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-2xl",
                "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-2xl",
                "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-2xl",
                "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-2xl"
              ].map((pos) => (
                <div key={pos} className={cn("absolute w-10 h-10", a.border, pos)} />
              ))}
              <motion.div
                className={cn("absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent to-transparent", a.scanLine)}
                animate={{ top: ["10%", "90%", "10%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                {loading ? (
                  <Loader2 className={cn("w-7 h-7 animate-spin", a.text)} />
                ) : (
                  <ScanLine className={cn("w-7 h-7 opacity-30", a.text)} />
                )}
                <span className={cn("text-[11px] font-medium", textMuted)}>
                  {loading ? "Résolution..." : "Placez le QR ici"}
                </span>
              </div>
            </div>
          </div>
          <button onClick={() => setCameraActive(true)} className="absolute inset-0 w-full h-full z-10" />
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <span className={cn(
              "text-[10px] font-medium px-3 py-1 rounded-full",
              darkMode ? "text-white/35 bg-black/20" : "text-muted-foreground bg-muted/50"
            )}>
              Appuyez pour activer la caméra
            </span>
          </div>
          <AnimatePresence>
            {engineStatus !== "idle" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "absolute inset-0 rounded-2xl pointer-events-none border-2",
                  engineStatus === "success" ? "border-emerald-400/60 shadow-[0_0_30px_rgba(52,211,153,0.3)]" : "border-red-400/60 shadow-[0_0_30px_rgba(248,113,113,0.3)]"
                )}
              />
            )}
          </AnimatePresence>
        </div>

        {/* ── Engine Feedback ── */}
        <AnimatePresence>
          {engineMessage && !showResult && (
            <motion.div
              initial={{ opacity: 0, y: 5, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -5, height: 0 }}
              className={cn(
                "w-full mt-3 p-2.5 rounded-xl border text-xs font-medium overflow-hidden",
                engineStatus === "error"
                  ? "border-red-400/20 bg-red-500/10 text-red-400"
                  : cn(a.feedbackBorder, a.feedbackBg, a.text)
              )}
            >
              {engineMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Manual Code Entry ── */}
        <div className="w-full mt-4">
          {!showManualInput && (
            <motion.button
              onClick={() => setShowManualInput(true)}
              className={cn(
                "w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border",
                a.btnBorder, a.btnBg, a.btnText
              )}
              whileTap={{ scale: 0.97 }}
            >
              <Keyboard className="w-4 h-4" />
              Entrez le code manuellement
            </motion.button>
          )}

          <AnimatePresence>
            {showManualInput && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex flex-col gap-3"
              >
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", textSoft)} />
                    <input
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                      placeholder="CMD-XXXX ou ID utilisateur"
                      className={cn(
                        "w-full pl-9 pr-4 py-3 rounded-xl text-sm font-medium border focus:outline-none",
                        inputBg, a.focusBorder
                      )}
                      autoFocus
                    />
                  </div>
                  <motion.button
                    onClick={handleManualSubmit}
                    disabled={manualCode.trim().length < 3 || loading}
                    className={cn(
                      "px-5 py-3 rounded-xl font-semibold text-sm border disabled:opacity-30 disabled:cursor-not-allowed",
                      a.btnBg, a.btnText, a.btnBorder
                    )}
                    whileTap={{ scale: 0.97 }}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "OK"}
                  </motion.button>
                </div>
                <button
                  onClick={() => { setShowManualInput(false); setManualCode(""); }}
                  className={cn("text-xs font-medium", textSoft)}
                >
                  Annuler
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
