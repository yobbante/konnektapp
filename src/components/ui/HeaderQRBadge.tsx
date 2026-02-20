/**
 * HeaderQRBadge V2 — Identity QR using Konnekt Scan Engine format
 * 
 * Generates USER:{userId} or GP:{gpId} QR codes that are fully compatible
 * with the scan-engine backend. Scannable by in-app camera, external cameras,
 * and resolves correctly for GP, client, or external scanners.
 * 
 * Premium "bleu nuit" layout matching Konnekt's scan identity.
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, X, Download, Share2, ScanLine, ShieldCheck, Fingerprint, Copy, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import QRCodeDisplay from "react-qr-code";

interface HeaderQRBadgeProps {
  /** User ID for QR generation */
  userId?: string;
  /** GP ID (if transporter) */
  gpId?: string;
  /** Display name shown on the card */
  label: string;
  /** Sub label (e.g. role or order number) */
  subLabel?: string;
  /** Visual variant */
  variant?: "client" | "transporter";
  /** Is GP verified */
  isVerified?: boolean;
  /** Custom class for the trigger button */
  className?: string;
  /** Legacy prop — ignored, QR value is auto-generated */
  qrValue?: string;
}

export function HeaderQRBadge({
  userId,
  gpId,
  label,
  subLabel,
  variant = "client",
  isVerified,
  className,
}: HeaderQRBadgeProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const isTransporter = variant === "transporter";

  // Generate scan-engine compatible QR value
  const qrValue = isTransporter && gpId
    ? `GP:${gpId}`
    : userId
      ? `USER:${userId}`
      : "";

  const shortId = (isTransporter && gpId ? gpId : userId || "").substring(0, 8).toUpperCase();

  const handleDownload = () => {
    const svg = document.getElementById("identity-qr-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 600;
      canvas.height = 600;
      if (ctx) {
        // Dark background matching the card
        ctx.fillStyle = "#0F1923";
        ctx.fillRect(0, 0, 600, 600);
        // White rounded rect for QR
        ctx.fillStyle = "#ffffff";
        const m = 80;
        const r = 20;
        const w = 600 - m * 2;
        ctx.beginPath();
        ctx.moveTo(m + r, m);
        ctx.lineTo(m + w - r, m);
        ctx.quadraticCurveTo(m + w, m, m + w, m + r);
        ctx.lineTo(m + w, m + w - r);
        ctx.quadraticCurveTo(m + w, m + w, m + w - r, m + w);
        ctx.lineTo(m + r, m + w);
        ctx.quadraticCurveTo(m, m + w, m, m + w - r);
        ctx.lineTo(m, m + r);
        ctx.quadraticCurveTo(m, m, m + r, m);
        ctx.fill();
        ctx.drawImage(img, m + 20, m + 20, w - 40, w - 40);
        // Branding
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "bold 18px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(`KONNEKT · ${label}`, 300, 570);
      }
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `konnekt-${isTransporter ? "gp" : "client"}-${shortId}.png`;
      link.href = pngUrl;
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `QR Konnekt — ${label}`,
          text: `Scannez ce QR pour me retrouver sur Konnekt`,
          url: `${window.location.origin}/profile/${isTransporter ? "gp" : "user"}/${isTransporter ? gpId : userId}`,
        });
        return;
      } catch { /* cancelled */ }
    }
    handleCopy();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(isTransporter && gpId ? gpId : userId || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!qrValue) return null;

  const accentColor = isTransporter ? "amber" : "emerald";
  const accentClass = isTransporter ? "text-amber-400" : "text-emerald-400";
  const accentBg = isTransporter ? "bg-amber-400" : "bg-emerald-400";
  const accentBgSoft = isTransporter ? "bg-amber-500/15" : "bg-emerald-500/15";
  const glowColor = isTransporter ? "shadow-amber-500/20" : "shadow-emerald-500/20";

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setOpen(true)}
        className={cn(
          "relative w-8 h-8 rounded-lg flex items-center justify-center transition-all",
          isTransporter
            ? "bg-white/10 hover:bg-white/20 text-inherit"
            : "bg-primary/8 hover:bg-primary/15 text-foreground/60 hover:text-foreground",
          className
        )}
        title="Mon QR Konnekt"
      >
        <Fingerprint className="w-4 h-4" />
        <span className={cn(
          "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse",
          accentBg
        )} />
      </motion.button>

      {/* Full Identity Card — Premium Bleu Nuit */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
            onClick={() => setOpen(false)}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Card */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[340px] z-10"
            >
              <div
                className={cn(
                  "rounded-3xl overflow-hidden shadow-2xl",
                  glowColor
                )}
                style={{ background: "linear-gradient(180deg, #0F1923 0%, #15232F 50%, #1A2B3A 100%)" }}
              >
                {/* Top bar */}
                <div className="flex items-center justify-between px-5 pt-5 pb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full animate-pulse", accentBg)} />
                    <span className="text-[10px] font-bold text-white/30 tracking-widest uppercase">
                      Identité Konnekt
                    </span>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-white/50 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* User Info */}
                <div className="text-center px-5 pb-4">
                  <h3 className="text-white font-bold text-lg leading-tight">{label}</h3>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    {isTransporter && isVerified && (
                      <ShieldCheck className="w-3 h-3 text-amber-400" />
                    )}
                    <p className={cn("text-[11px]", accentClass)}>
                      {subLabel || (isTransporter ? "Transporteur GP" : "Client Konnekt")}
                    </p>
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex justify-center px-5 pb-4">
                  <div
                    ref={qrRef}
                    className={cn(
                      "bg-white rounded-2xl p-4 shadow-lg relative",
                      `shadow-xl ${glowColor}`
                    )}
                  >
                    <QRCodeDisplay
                      id="identity-qr-svg"
                      value={qrValue}
                      size={180}
                      level="M"
                      className="w-[180px] h-[180px]"
                    />
                    {/* Center logo overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center",
                        accentBgSoft
                      )} style={{ background: "white" }}>
                        <span className="text-[10px] font-black text-[#0F1923] tracking-tight">KKT</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scan hint */}
                <div className="flex items-center justify-center gap-2 px-5 pb-2">
                  <ScanLine className={cn("w-3.5 h-3.5", accentClass)} />
                  <span className="text-[11px] text-white/40">
                    {isTransporter
                      ? "Les clients scannent ce QR pour déposer"
                      : "Présentez au GP ou scannez avec une caméra"}
                  </span>
                </div>

                {/* Short ID */}
                <div className="flex items-center justify-center gap-2 pb-4">
                  <div className="px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08]">
                    <span className="text-[10px] font-mono text-white/30">
                      ID: {shortId}
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="mx-5 h-px bg-white/[0.06]" />

                {/* Actions */}
                <div className="flex items-center gap-2 p-4">
                  <button
                    onClick={handleCopy}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all",
                      "bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1]",
                      copied ? accentClass : "text-white/50"
                    )}
                  >
                    {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copié !" : "Copier ID"}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all bg-white/[0.05] border border-white/[0.08] text-white/50 hover:bg-white/[0.1]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Télécharger
                  </button>
                  <button
                    onClick={handleShare}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all",
                      accentBgSoft, accentClass,
                      "border border-white/[0.08]"
                    )}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Partager
                  </button>
                </div>

                {/* Footer */}
                <div className="text-center pb-4">
                  <span className="text-[9px] text-white/20 font-medium tracking-wider uppercase">
                    Powered by Konnekt Engine
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
