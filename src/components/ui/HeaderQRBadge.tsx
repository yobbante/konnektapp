/**
 * HeaderQRBadge V2 — Identity QR using Konnekt Scan Engine format
 * 
 * Generates USER:{userId} or GP:{gpId} QR codes compatible with scan-engine.
 * Uses Dialog for proper layering. Premium bleu nuit layout.
 */
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { X, Download, Share2, ScanLine, ShieldCheck, Fingerprint, Copy, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import QRCodeDisplay from "react-qr-code";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface HeaderQRBadgeProps {
  userId?: string;
  gpId?: string;
  label: string;
  subLabel?: string;
  variant?: "client" | "transporter";
  isVerified?: boolean;
  className?: string;
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
        ctx.fillStyle = "#0F1923";
        ctx.fillRect(0, 0, 600, 600);
        ctx.fillStyle = "#ffffff";
        const m = 80, r = 20, w = 600 - m * 2;
        ctx.beginPath();
        ctx.moveTo(m + r, m);
        ctx.lineTo(m + w - r, m); ctx.quadraticCurveTo(m + w, m, m + w, m + r);
        ctx.lineTo(m + w, m + w - r); ctx.quadraticCurveTo(m + w, m + w, m + w - r, m + w);
        ctx.lineTo(m + r, m + w); ctx.quadraticCurveTo(m, m + w, m, m + w - r);
        ctx.lineTo(m, m + r); ctx.quadraticCurveTo(m, m, m + r, m);
        ctx.fill();
        ctx.drawImage(img, m + 20, m + 20, w - 40, w - 40);
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

  const accentClass = isTransporter ? "text-amber-400" : "text-emerald-400";
  const accentBg = isTransporter ? "bg-amber-400" : "bg-emerald-400";
  const accentBgSoft = isTransporter ? "bg-amber-500/15" : "bg-emerald-500/15";

  return (
    <>
      {/* Trigger */}
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
        <span className={cn("absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse", accentBg)} />
      </motion.button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[340px] p-0 border-none bg-transparent shadow-none [&>button]:hidden" aria-describedby={undefined}>
          <span className="sr-only">{label} - QR Konnekt</span>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="rounded-3xl overflow-hidden"
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
            <div className="text-center px-5 pb-3">
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
            <div className="flex justify-center px-5 pb-3">
              <div ref={qrRef} className="bg-white rounded-2xl p-4 relative">
                <QRCodeDisplay
                  id="identity-qr-svg"
                  value={qrValue}
                  size={170}
                  level="M"
                  className="w-[170px] h-[170px]"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white shadow-sm">
                    <span className="text-[9px] font-black text-[#0F1923] tracking-tight">KKT</span>
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
            <div className="flex items-center justify-center pb-3">
              <div className="px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08]">
                <span className="text-[10px] font-mono text-white/30">ID: {shortId}</span>
              </div>
            </div>

            {/* Divider */}
            <div className="mx-5 h-px bg-white/[0.06]" />

            {/* Actions */}
            <div className="flex items-center gap-2 p-4">
              <button
                onClick={handleCopy}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold transition-all",
                  "bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1]",
                  copied ? accentClass : "text-white/50"
                )}
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copié" : "Copier"}
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold transition-all bg-white/[0.05] border border-white/[0.08] text-white/50 hover:bg-white/[0.1]"
              >
                <Download className="w-3.5 h-3.5" />
                Télécharger
              </button>
              <button
                onClick={handleShare}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold transition-all",
                  accentBgSoft, accentClass, "border border-white/[0.08]"
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
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
}
