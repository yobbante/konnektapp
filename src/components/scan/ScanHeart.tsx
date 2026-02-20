/**
 * ScanHeart — Unified scan brain with inline camera feed
 * 
 * Camera is embedded directly in the UI frame — no fullscreen overlay.
 * Ready to scan immediately on mount.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, Search, Loader2, CameraOff } from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useScanEngine } from "@/hooks/useScanEngine";
import { useScanRole } from "@/hooks/useScanRole";
import type { ScanEngineResponse } from "@/lib/scanEngine";
import { ScannerInterfaceV2 } from "./v2/ScannerInterfaceV2";
import { cn } from "@/lib/utils";

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
  corner: string;
}> = {
  emerald: {
    border: "border-emerald-400/50", bg: "bg-emerald-500/10", text: "text-emerald-400",
    scanLine: "via-emerald-400/80", btnBorder: "border-emerald-400/25", btnBg: "bg-emerald-500/10",
    btnText: "text-emerald-400", focusBorder: "focus:border-emerald-400/40",
    feedbackBorder: "border-emerald-400/20", feedbackBg: "bg-emerald-500/10",
    corner: "border-emerald-400",
  },
  amber: {
    border: "border-amber-400/50", bg: "bg-amber-500/10", text: "text-amber-400",
    scanLine: "via-amber-400/80", btnBorder: "border-amber-400/25", btnBg: "bg-amber-500/10",
    btnText: "text-amber-400", focusBorder: "focus:border-amber-400/40",
    feedbackBorder: "border-amber-400/20", feedbackBg: "bg-amber-500/10",
    corner: "border-amber-400",
  },
  primary: {
    border: "border-primary/50", bg: "bg-primary/10", text: "text-primary",
    scanLine: "via-primary/80", btnBorder: "border-primary/25", btnBg: "bg-primary/10",
    btnText: "text-primary", focusBorder: "focus:border-primary/40",
    feedbackBorder: "border-primary/20", feedbackBg: "bg-primary/10",
    corner: "border-primary",
  },
};

// Unique ID generator for multiple ScanHeart instances
let instanceCounter = 0;

export function ScanHeart({
  role,
  accent = "emerald",
  darkMode = true,
  onResolved,
  onError,
  autoClose = false,
  continuousMode = false,
  cameraHeight = "52vw",
  className,
  gpId,
}: ScanHeartProps) {
  const [manualCode, setManualCode] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [engineMessage, setEngineMessage] = useState<string | null>(null);
  const [engineStatus, setEngineStatus] = useState<"idle" | "success" | "error">("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [scanResult, setScanResult] = useState<ScanEngineResponse | null>(null);
  const [showResult, setShowResult] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerIdRef = useRef(`scan-heart-${++instanceCounter}`);
  const startedRef = useRef(false);
  const processingRef = useRef(false);

  const { gpId: scannerGpId } = useScanRole();
  const a = ACCENT_CLASSES[accent];

  const { resolve, loading } = useScanEngine({
    autoNavigate: false,
    onResult: (response) => {
      setEngineMessage(response.message);
      if (response.status === "failed") {
        setEngineStatus("error");
        onError?.(response);
        processingRef.current = false;
        setTimeout(() => {
          setEngineStatus("idle");
          setEngineMessage(null);
          processingRef.current = false;
        }, 3000);
      } else {
        setEngineStatus("success");
        setScanResult(response);
        setShowResult(true);
        onResolved?.(response);
      }
    },
  });

  // ─── Start inline camera ───
  const startCamera = useCallback(async () => {
    if (startedRef.current) return;
    try {
      setCameraError(null);
      const devices = await Html5Qrcode.getCameras();
      if (!devices.length) {
        setCameraError("Aucune caméra détectée");
        return;
      }

      const containerId = containerIdRef.current;
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }

      const cameraId = devices.find(d =>
        d.label.toLowerCase().includes("back") ||
        d.label.toLowerCase().includes("arrière") ||
        d.label.toLowerCase().includes("rear")
      )?.id || devices[0].id;

      await scannerRef.current.start(
        cameraId,
        { fps: 12, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
        async (decodedText) => {
          if (processingRef.current) return;
          processingRef.current = true;
          if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
          await resolve(decodedText, role);
          if (continuousMode) {
            setTimeout(() => { processingRef.current = false; }, 1500);
          }
        },
        () => {}
      );

      startedRef.current = true;
      setCameraReady(true);
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        setCameraError("Permission caméra refusée");
      } else {
        setCameraError("Caméra indisponible");
      }
    }
  }, [resolve, role, continuousMode]);

  const stopCamera = useCallback(async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
    } catch (_) {}
    startedRef.current = false;
    setCameraReady(false);
  }, []);

  useEffect(() => {
    // Small delay to let DOM render the container div first
    const timer = setTimeout(() => startCamera(), 120);
    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, []);

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
    processingRef.current = false;
    // Restart camera after viewing result
    setTimeout(() => startCamera(), 200);
  }, [startCamera]);

  const textSoft = darkMode ? "text-white/40" : "text-muted-foreground/70";
  const inputBg = darkMode
    ? "bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25"
    : "bg-background border-border text-foreground placeholder:text-muted-foreground";

  // ─── INLINE RESULT VIEW ───
  if (showResult && scanResult) {
    const resolvedRole = (["gp", "client", "admin", "agent_logistique"].includes(role)
      ? role : "client") as "gp" | "client" | "admin" | "agent_logistique";

    return (
      <div className={cn("flex flex-col", className)}>
        <ScannerInterfaceV2
          engineResponse={scanResult}
          role={resolvedRole}
          gpId={gpId || scannerGpId}
          onBack={resetResult}
          darkMode={darkMode}
          accent={accent}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center", className)}>

      {/* ── Inline Camera Frame ── */}
      <div
        className={cn(
          "relative w-full rounded-2xl overflow-hidden",
          darkMode ? "bg-black" : "bg-muted"
        )}
        style={{ height: cameraHeight, maxHeight: "400px", minHeight: "220px" }}
      >
        {/* html5-qrcode renders the video feed into this div */}
        <div
          id={containerIdRef.current}
          className="w-full h-full"
          style={{
            // Override html5-qrcode internal styles to fill container
          }}
        />

        {/* Corner frame overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="relative" style={{ width: "56%", height: "56%" }}>
            {[
              "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-xl",
              "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-xl",
              "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-xl",
              "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-xl",
            ].map((pos) => (
              <div key={pos} className={cn("absolute w-8 h-8", a.corner, pos)} />
            ))}

            {/* Scanning laser line */}
            {cameraReady && !loading && (
              <motion.div
                className={cn(
                  "absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent to-transparent shadow-lg",
                  a.scanLine
                )}
                style={{ boxShadow: `0 0 8px 2px currentColor` }}
                animate={{ top: ["8%", "92%", "8%"] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </div>
        </div>

        {/* Status overlay — camera not ready or error */}
        <AnimatePresence>
          {(!cameraReady || loading) && !cameraError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-20 pointer-events-none"
              style={{ background: "rgba(0,0,0,0.55)" }}
            >
              <Loader2 className={cn("w-6 h-6 animate-spin", a.text)} />
              <span className="text-[11px] text-white/50 font-medium">
                {loading ? "Résolution…" : "Initialisation caméra…"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Camera error state */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20"
            style={{ background: "rgba(0,0,0,0.7)" }}>
            <CameraOff className="w-8 h-8 text-red-400/70" />
            <span className="text-[12px] text-red-400 font-medium text-center px-6">{cameraError}</span>
            <button
              onClick={() => { startedRef.current = false; startCamera(); }}
              className={cn("px-4 py-1.5 rounded-lg text-xs font-semibold border", a.btnBg, a.btnText, a.btnBorder)}
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Success/Error flash border */}
        <AnimatePresence>
          {engineStatus !== "idle" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "absolute inset-0 rounded-2xl pointer-events-none border-2 z-30",
                engineStatus === "success"
                  ? "border-emerald-400/80 shadow-[0_0_40px_rgba(52,211,153,0.4)]"
                  : "border-red-400/80 shadow-[0_0_40px_rgba(248,113,113,0.4)]"
              )}
            />
          )}
        </AnimatePresence>

        {/* Live indicator */}
        {cameraReady && (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 pointer-events-none">
            <motion.div
              className="w-2 h-2 rounded-full bg-red-500"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <span className="text-[10px] text-white/60 font-medium tracking-wide uppercase">Live</span>
          </div>
        )}
      </div>

      {/* ── Engine feedback ── */}
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

      {/* ── Manual code entry ── */}
      <div className="w-full mt-3">
        {!showManualInput && (
          <motion.button
            onClick={() => setShowManualInput(true)}
            className={cn(
              "w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 border",
              a.btnBorder, a.btnBg, a.btnText
            )}
            whileTap={{ scale: 0.97 }}
          >
            <Keyboard className="w-3.5 h-3.5" />
            Entrez le code manuellement
          </motion.button>
        )}

        <AnimatePresence>
          {showManualInput && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex flex-col gap-2"
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
                      "w-full pl-9 pr-4 py-2.5 rounded-xl text-sm font-medium border focus:outline-none",
                      inputBg, a.focusBorder
                    )}
                    autoFocus
                  />
                </div>
                <motion.button
                  onClick={handleManualSubmit}
                  disabled={manualCode.trim().length < 3 || loading}
                  className={cn(
                    "px-4 py-2.5 rounded-xl font-semibold text-sm border disabled:opacity-30",
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
  );
}
