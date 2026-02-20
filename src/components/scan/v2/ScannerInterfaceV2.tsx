/**
 * ScannerInterfaceV2 — Unified scan result entry point
 * 
 * This is the SINGLE point of truth for rendering scan results.
 * It routes to ScannerGPView or ScannerClientView based on role.
 * 
 * ARCHITECTURE:
 *   ScanHeart (camera/input)
 *     → scan-engine (backend: resolve)
 *     → ScannerInterfaceV2 (this file)
 *       → ScannerGPView | ScannerClientView | UnifiedScanRouter
 * 
 * INVARIANTS:
 * - No business logic here
 * - No DB calls
 * - Pure routing + layout
 * - onActionComplete() triggers parent re-fetch → engine re-resolve
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ScanLine, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ScanEngineResponse } from "@/lib/scanEngine";
import { ScannerGPView } from "./ScannerGPView";
import { ScannerClientView } from "./ScannerClientView";
import { UnifiedScanRouter } from "@/components/scan/UnifiedScanRouter";

type ScanRole = "gp" | "client" | "admin" | "agent_logistique";

interface ScannerInterfaceV2Props {
  /** Engine response from scan-engine/resolve */
  engineResponse: ScanEngineResponse;
  /** Active user role */
  role: ScanRole;
  /** GP ID if role === "gp" */
  gpId?: string | null;
  /** Called to go back to scanner */
  onBack: () => void;
  /** Dark mode */
  darkMode?: boolean;
  /** Accent color */
  accent?: "emerald" | "amber" | "primary";
}

// ─── Re-fetch hook ────────────────────────────────────────────────────────────
// When an action completes, we need to re-resolve the same QR
// to get the updated allowed_actions from the backend.
// The parent (ScanHeart) controls the camera/input lifecycle,
// so we signal via onBack() + show a "refreshed" indicator.

function useActionRefresh(onBack: () => void) {
  const [refreshed, setRefreshed] = useState(false);

  const handleActionComplete = useCallback(() => {
    setRefreshed(true);
    // Brief delay to show success state, then go back to scanner
    setTimeout(() => {
      setRefreshed(false);
      onBack();
    }, 1800);
  }, [onBack]);

  return { refreshed, handleActionComplete };
}

// ─── Layout wrapper ───────────────────────────────────────────────────────────

function V2Header({
  onBack, role, accent, darkMode, refreshed,
}: {
  onBack: () => void;
  role: ScanRole;
  accent: "emerald" | "amber" | "primary";
  darkMode: boolean;
  refreshed: boolean;
}) {
  const accentColor = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    primary: "text-primary",
  }[accent];

  const accentBg = {
    emerald: "bg-emerald-500/15 border-emerald-400/20",
    amber: "bg-amber-500/15 border-amber-400/20",
    primary: "bg-primary/15 border-primary/20",
  }[accent];

  return (
    <div className="flex items-center gap-3 mb-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className={cn(
          "gap-1.5 h-8 px-3 rounded-xl text-xs font-medium",
          darkMode ? "text-white/50 hover:text-white hover:bg-white/[0.08]" : ""
        )}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Nouveau scan
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <AnimatePresence>
          {refreshed && (
            <motion.span
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border",
                accentBg, accentColor
              )}
            >
              <Zap className="w-2.5 h-2.5" />
              Mis à jour
            </motion.span>
          )}
        </AnimatePresence>

        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider",
          accentBg, accentColor
        )}>
          <ScanLine className="w-2.5 h-2.5" />
          {role === "gp" ? "GP" : role === "client" ? "Client" : "Admin"}
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ScannerInterfaceV2({
  engineResponse,
  role,
  gpId,
  onBack,
  darkMode = true,
  accent = "emerald",
}: ScannerInterfaceV2Props) {
  const { refreshed, handleActionComplete } = useActionRefresh(onBack);
  const data = engineResponse.data;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col"
    >
      <V2Header
        onBack={onBack}
        role={role}
        accent={accent}
        darkMode={darkMode}
        refreshed={refreshed}
      />

      {/* ── USER QR scanned → show linked orders router ── */}
      {(engineResponse.qr_type === "QR_USER" || engineResponse.qr_type === "QR_GP") && data?.user && (
        <UnifiedScanRouter
          scannedUserId={data.user.user_id || ""}
          onComplete={onBack}
        />
      )}

      {/* ── ORDER QR scanned → role-specific V2 view ── */}
      {engineResponse.qr_type === "QR_COLIS" && data?.order && (
        <>
          {(role === "gp") && (
            <ScannerGPView
              engineResponse={engineResponse}
              onActionComplete={handleActionComplete}
              darkMode={darkMode}
            />
          )}
          {role === "client" && (
            <ScannerClientView
              engineResponse={engineResponse}
              darkMode={darkMode}
            />
          )}
          {(role === "admin" || role === "agent_logistique") && (
            // Admin/agent still uses GP view with full allowed_actions
            <ScannerGPView
              engineResponse={engineResponse}
              onActionComplete={handleActionComplete}
              darkMode={darkMode}
            />
          )}
        </>
      )}

      {/* ── GP QR scanned by client → GP profile link ── */}
      {engineResponse.qr_type === "QR_GP" && !data?.user && data?.redirect && (
        <div className={cn(
          "text-center py-8 space-y-3",
          darkMode ? "text-white/60" : "text-muted-foreground"
        )}>
          <p className="text-sm">{engineResponse.message}</p>
          <Button onClick={() => window.location.href = data.redirect}>
            Voir le profil transporteur
          </Button>
        </div>
      )}

      {/* ── External QR ── */}
      {engineResponse.qr_type === "QR_EXTERNAL" && (
        <div className={cn("text-center py-8 space-y-3", darkMode ? "text-white/50" : "text-muted-foreground")}>
          <ScanLine className="w-10 h-10 mx-auto opacity-30" />
          <p className="text-sm">{engineResponse.message}</p>
          {data?.raw && data?.is_url && (
            <Button variant="outline" onClick={() => window.open(data.raw, "_blank")}>
              Ouvrir le lien
            </Button>
          )}
        </div>
      )}

      {/* ── Fallback ── */}
      {!data?.order && !data?.user && !data?.redirect &&
        engineResponse.qr_type !== "QR_EXTERNAL" && (
        <div className={cn(
          "text-center py-8",
          darkMode ? "text-white/40" : "text-muted-foreground"
        )}>
          <p className="text-sm">{engineResponse.message}</p>
        </div>
      )}
    </motion.div>
  );
}
