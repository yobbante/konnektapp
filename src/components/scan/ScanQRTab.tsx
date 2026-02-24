/**
 * ScanQRTab — Shared "Mon QR" identity tab
 * 
 * Used by ClientScanSheet, GPScanSheet, and ClientScanPage.
 * Displays the user's personal QR code with share/copy actions.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { QrCode, ShieldCheck, Copy, Share2, CheckCircle, Loader2 } from "lucide-react";
import QRCodeDisplay from "react-qr-code";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ScanAccent } from "./ScanHeart";

interface ScanQRTabProps {
  role: "client" | "gp";
  accent?: ScanAccent;
  darkMode?: boolean;
  gpId?: string | null;
  isVerified?: boolean;
  onSwitchToScanner?: () => void;
  className?: string;
}

export function ScanQRTab({ role, accent = "emerald", darkMode = true, gpId, isVerified, onSwitchToScanner, className }: ScanQRTabProps) {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      setLoading(false);
    };
    load();
  }, []);

  // Full URLs so native cameras can redirect externally
  // The scan-engine also parses these URLs in-app (lines 152-163)
  const publishedDomain = "https://konnektapp.lovable.app";
  const qrValue = role === "gp" && gpId
    ? `${publishedDomain}/client/transporteurs/${gpId}`
    : userId
      ? `${publishedDomain}/track/user/${userId}`
      : "";

  const fullId = role === "gp" && gpId ? gpId : userId || "";

  const handleCopy = () => {
    navigator.clipboard.writeText(fullId);
    setCopied(true);
    toast({ title: "ID copié", description: fullId });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!navigator.share) return handleCopy();
    try {
      await navigator.share({
        title: `Mon QR Konnekt ${role === "gp" ? "GP" : ""}`,
        text: `Mon identifiant Konnekt`,
        url: `${window.location.origin}/track/user/${userId}`,
      });
    } catch { handleCopy(); }
  };

  const textMain = darkMode ? "text-white/90" : "text-foreground";
  const textSub = darkMode ? "text-white/35" : "text-muted-foreground";
  const cardBg = darkMode ? "bg-white/[0.03] border-white/[0.06]" : "bg-card border-border";
  const iconText = accent === "amber" ? "text-amber-400" : accent === "emerald" ? "text-emerald-400" : "text-primary";
  const btnClass = darkMode ? "border-white/[0.08] bg-white/[0.04] text-white/50" : "border-border bg-muted text-muted-foreground";

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-16", className)}>
        <Loader2 className={cn("w-6 h-6 animate-spin", iconText)} />
      </div>
    );
  }

  if (!userId && !gpId) {
    return (
      <div className={cn("flex flex-col items-center py-12 gap-3", className)}>
        <QrCode className={cn("w-12 h-12 opacity-30", textSub)} />
        <p className={cn("text-sm", textSub)}>Connectez-vous pour voir votre QR</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center pt-2", className)}>
      <p className={cn("text-xs mb-4 self-start", textSub)}>
        {role === "gp" ? "Mon identité GP" : "Ma carte QR"}
      </p>

      {/* QR Card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn("w-full rounded-2xl p-6 flex flex-col items-center border", cardBg)}
      >
        <div className="bg-white rounded-xl p-4 mb-3 shadow-sm">
          <QRCodeDisplay value={qrValue} size={170} />
        </div>
        <p className={cn("text-[10px] font-mono mt-2 px-2 py-1 rounded bg-black/5 dark:bg-white/5 break-all select-all", textSub)}>
          {fullId}
        </p>
        <p className={cn("text-[11px] mt-1", textSub)}>
          {role === "gp" ? "Les clients scannent ce QR pour déposer" : "Présentez ce QR au transporteur"}
        </p>
        {role === "gp" && isVerified && (
          <div className="flex items-center gap-1 mt-2 text-amber-400 text-[10px]">
            <ShieldCheck className="w-3 h-3" /> Transporteur vérifié
          </div>
        )}

        {/* ID + Actions */}
        <div className="flex items-center gap-3 mt-4">
          <button onClick={handleCopy} className={cn("flex items-center gap-1.5 text-xs font-medium", iconText)}>
            {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copié" : "Copier ID"}
          </button>
          <div className={cn("w-px h-4", darkMode ? "bg-white/10" : "bg-border")} />
          <button onClick={handleShare} className={cn("flex items-center gap-1.5 text-xs font-medium", iconText)}>
            <Share2 className="w-3.5 h-3.5" />
            Partager
          </button>
        </div>
      </motion.div>

      {/* Switch to scanner */}
      {onSwitchToScanner && (
        <>
          <div className="flex items-center gap-3 w-full my-5">
            <div className={cn("flex-1 h-px", darkMode ? "bg-white/[0.06]" : "bg-border")} />
            <span className={cn("text-[10px] font-medium", textSub)}>Ou</span>
            <div className={cn("flex-1 h-px", darkMode ? "bg-white/[0.06]" : "bg-border")} />
          </div>
          <button
            onClick={onSwitchToScanner}
            className={cn("w-full py-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium", btnClass)}
          >
            <QrCode className="w-4 h-4" />
            Scanner un QR {role === "gp" ? "client" : ""}
          </button>
        </>
      )}
    </div>
  );
}