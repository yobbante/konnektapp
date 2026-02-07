/**
 * HeaderQRBadge — Subtle interactive QR code badge for headers
 * 
 * Displays a small, theme-matching QR icon in the header that expands
 * into a full card with the QR code when tapped (inspired by WeChat/Alipay style)
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, X, Download, Share2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import QRCode from "react-qr-code";

interface HeaderQRBadgeProps {
  /** The data encoded in the QR code */
  qrValue: string;
  /** Display name shown on the card */
  label: string;
  /** Sub label (e.g. role or order number) */
  subLabel?: string;
  /** Visual variant */
  variant?: "client" | "transporter";
  /** Custom class for the trigger button */
  className?: string;
}

export function HeaderQRBadge({
  qrValue,
  label,
  subLabel,
  variant = "client",
  className,
}: HeaderQRBadgeProps) {
  const [open, setOpen] = useState(false);

  const isTransporter = variant === "transporter";

  const handleDownload = () => {
    const svg = document.getElementById("header-qr-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 512, 512);
        ctx.drawImage(img, 56, 56, 400, 400);
      }
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `konnekt-qr-${label.replace(/\s/g, "-").toLowerCase()}.png`;
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
          text: `Scannez ce code pour accéder au profil ${label} sur Konnekt`,
          url: qrValue.startsWith("http") ? qrValue : undefined,
        });
      } catch {
        // user cancelled
      }
    }
  };

  return (
    <>
      {/* Subtle QR trigger — matches header background */}
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
        <QrCode className="w-4 h-4" />
        {/* Subtle dot indicator */}
        <span className={cn(
          "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full",
          isTransporter ? "bg-green-400" : "bg-primary"
        )} />
      </motion.button>

      {/* Full QR Card Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden bg-transparent border-none shadow-none">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative"
          >
            {/* Card background with pattern */}
            <div className={cn(
              "relative rounded-3xl overflow-hidden",
              isTransporter
                ? "bg-gradient-to-br from-primary via-primary/90 to-accent"
                : "bg-gradient-to-br from-primary/80 via-primary to-primary/90"
            )}>
              {/* Decorative pattern overlay */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px),
                    repeating-linear-gradient(-45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)`,
                }} />
              </div>

              {/* Close button */}
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Content */}
              <div className="relative z-10 p-8 pt-12 flex flex-col items-center">
                {/* Label */}
                <div className="text-center mb-6">
                  <h3 className="text-white font-bold text-xl">{label}</h3>
                  {subLabel && (
                    <p className="text-white/70 text-sm mt-1">{subLabel}</p>
                  )}
                </div>

                {/* QR Code Container */}
                <div className="bg-white rounded-2xl p-5 shadow-xl">
                  <QRCode
                    id="header-qr-svg"
                    value={qrValue}
                    size={200}
                    level="M"
                    className="w-[200px] h-[200px]"
                  />
                </div>

                {/* Scan hint */}
                <div className="flex items-center gap-2 mt-4 text-white/80 text-sm">
                  <ScanLine className="w-4 h-4" />
                  <span>Scannez pour identifier</span>
                </div>

                {/* Konnekt branding */}
                <div className="mt-4 flex items-center gap-1.5">
                  <span className="text-white/60 text-xs font-semibold tracking-wider uppercase">Konnekt</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-center gap-3 mt-4 px-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownload}
                className="rounded-full gap-2 flex-1"
              >
                <Download className="w-4 h-4" />
                Télécharger
              </Button>
              {typeof navigator.share !== 'undefined' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleShare}
                  className="rounded-full gap-2 flex-1"
                >
                  <Share2 className="w-4 h-4" />
                  Partager
                </Button>
              )}
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
}
