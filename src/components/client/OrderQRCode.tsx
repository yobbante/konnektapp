/**
 * OrderQRCode V2 — Scan-engine compatible order QR
 * 
 * Encodes the order_number (CMD-XXXX) which the scan-engine resolves as QR_COLIS.
 * 
 * When scanned:
 * - By GP: Shows order details + deposit/transit/delivery actions
 * - By Client (owner): View tracking + confirm reception
 * - By Client (other): View public tracking info
 * - By External camera: Redirects to public tracking page
 * 
 * Uses react-qr-code (local, no external API). Premium compact card.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { 
  QrCode, Download, Share2, Copy, CheckCircle, 
  Package, MapPin, ArrowRight, ScanLine, Fingerprint, X 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import QRCodeDisplay from "react-qr-code";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface OrderQRCodeProps {
  orderNumber: string;
  orderId: string;
  status: string;
  weight?: number;
  originCity?: string;
  destinationCity?: string;
  totalPrice?: number;
  currency?: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  accepted: { label: "Acceptée", color: "text-blue-400" },
  paid_held: { label: "Payée", color: "text-emerald-400" },
  checked_in: { label: "Enregistrée", color: "text-cyan-400" },
  collected: { label: "Collectée", color: "text-blue-400" },
  scheduled_departure: { label: "Départ prévu", color: "text-indigo-400" },
  in_transit: { label: "En transit", color: "text-amber-400" },
  arrived_destination: { label: "Arrivée", color: "text-purple-400" },
  delivery_pending: { label: "Livraison en cours", color: "text-orange-400" },
  delivery_confirmed: { label: "Livrée", color: "text-emerald-400" },
  delivered: { label: "Livrée", color: "text-emerald-400" },
  released: { label: "Terminée", color: "text-emerald-400" },
};

export function OrderQRCode({ 
  orderNumber, orderId, status, weight, 
  originCity, destinationCity, totalPrice, currency 
}: OrderQRCodeProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  // QR encodes the order number — scan-engine detects CMD-XXXX as QR_COLIS
  const qrValue = orderNumber;

  const canShowQR = [
    "accepted", "paid_held", "checked_in", "collected",
    "weight_pending_payment", "scheduled_departure",
    "in_transit", "arrived_destination", "delivery_pending",
    "delivery_confirmed", "delivered", "released"
  ].includes(status);

  const handleCopy = () => {
    navigator.clipboard.writeText(orderNumber);
    setCopied(true);
    toast({ title: "Code copié", description: orderNumber });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const svg = document.getElementById("order-qr-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = 600;
      canvas.height = 700;
      if (ctx) {
        ctx.fillStyle = "#0F1923";
        ctx.fillRect(0, 0, 600, 700);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        const m = 80, r = 16, w = 440;
        ctx.moveTo(m + r, m); ctx.lineTo(m + w - r, m);
        ctx.quadraticCurveTo(m + w, m, m + w, m + r);
        ctx.lineTo(m + w, m + w - r); ctx.quadraticCurveTo(m + w, m + w, m + w - r, m + w);
        ctx.lineTo(m + r, m + w); ctx.quadraticCurveTo(m, m + w, m, m + w - r);
        ctx.lineTo(m, m + r); ctx.quadraticCurveTo(m, m, m + r, m);
        ctx.fill();
        ctx.drawImage(img, m + 20, m + 20, w - 40, w - 40);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px monospace";
        ctx.textAlign = "center";
        ctx.fillText(orderNumber, 300, 580);
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "14px system-ui";
        if (originCity && destinationCity) {
          ctx.fillText(`${originCity} → ${destinationCity}`, 300, 615);
        }
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.font = "bold 12px system-ui";
        ctx.fillText("KONNEKT · Scan Engine", 300, 660);
      }
      const link = document.createElement("a");
      link.download = `konnekt-${orderNumber}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Colis ${orderNumber}`,
          text: `Suivez mon colis Konnekt: ${orderNumber}`,
          url: `${window.location.origin}/order/${orderId}/qrcode`,
        });
        return;
      } catch { /* cancelled */ }
    }
    handleCopy();
  };

  if (!canShowQR) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center">
        <QrCode className="w-10 h-10 mx-auto text-muted-foreground/25 mb-2" />
        <p className="text-xs text-muted-foreground">
          QR disponible après acceptation par le transporteur
        </p>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[status] || { label: status, color: "text-white/50" };

  return (
    <>
      {/* Compact inline card — tap to expand */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-border bg-card p-4 flex items-center gap-4 text-left transition-shadow hover:shadow-md"
      >
        {/* Mini QR preview */}
        <div className="bg-white rounded-xl p-2 flex-shrink-0 shadow-sm">
          <QRCodeDisplay value={qrValue} size={56} level="M" className="w-14 h-14" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-sm font-bold text-foreground">{orderNumber}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {statusInfo.label}
            </Badge>
          </div>
          {originCity && destinationCity && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {originCity} <ArrowRight className="w-2.5 h-2.5" /> {destinationCity}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
            <ScanLine className="w-3 h-3" />
            Appuyez pour afficher le QR
          </p>
        </div>

        <QrCode className="w-5 h-5 text-muted-foreground/30 flex-shrink-0" />
      </motion.button>

      {/* Full QR Dialog — Premium Bleu Nuit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[340px] p-0 border-none bg-transparent shadow-none [&>button]:hidden">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: "linear-gradient(180deg, #0F1923 0%, #15232F 50%, #1A2B3A 100%)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] font-bold text-white/30 tracking-widest uppercase">
                  QR Colis
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-white/50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Order number + status */}
            <div className="text-center px-5 pb-3">
              <h3 className="font-mono text-white font-bold text-lg">{orderNumber}</h3>
              <p className={cn("text-[11px] font-medium mt-0.5", statusInfo.color)}>
                {statusInfo.label}
              </p>
            </div>

            {/* Route */}
            {originCity && destinationCity && (
              <div className="flex items-center justify-center gap-2 px-5 pb-3">
                <div className="px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-blue-400" />
                  <span className="text-[11px] text-white/50">{originCity}</span>
                  <ArrowRight className="w-3 h-3 text-white/20" />
                  <span className="text-[11px] text-white/50">{destinationCity}</span>
                </div>
              </div>
            )}

            {/* QR Code */}
            <div className="flex justify-center px-5 pb-3">
              <div className="bg-white rounded-2xl p-4 relative shadow-lg shadow-blue-500/10">
                <QRCodeDisplay
                  id="order-qr-svg"
                  value={qrValue}
                  size={170}
                  level="H"
                  className="w-[170px] h-[170px]"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white shadow-sm">
                    <Package className="w-4 h-4 text-[#0F1923]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Info pills */}
            <div className="flex items-center justify-center gap-2 px-5 pb-2 flex-wrap">
              {weight && (
                <div className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08]">
                  <span className="text-[10px] text-white/40">{weight} kg</span>
                </div>
              )}
              {totalPrice && currency && (
                <div className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08]">
                  <span className="text-[10px] text-white/40">{totalPrice.toLocaleString()} {currency}</span>
                </div>
              )}
            </div>

            {/* Scan hint */}
            <div className="flex items-center justify-center gap-2 px-5 pb-3">
              <ScanLine className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px] text-white/35">
                Scannable par GP, client ou caméra externe
              </span>
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
                  copied ? "text-emerald-400" : "text-white/50"
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
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold transition-all bg-blue-500/15 text-blue-400 border border-white/[0.08]"
              >
                <Share2 className="w-3.5 h-3.5" />
                Partager
              </button>
            </div>

            {/* Role hints */}
            <div className="px-5 pb-4 space-y-1.5">
              {[
                { icon: "🚚", text: "GP : Enregistrer dépôt, ajuster poids, confirmer livraison" },
                { icon: "📦", text: "Client : Suivre le colis, confirmer réception" },
                { icon: "📸", text: "Externe : Redirige vers le suivi public" },
              ].map((h, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[10px]">{h.icon}</span>
                  <span className="text-[10px] text-white/25 leading-relaxed">{h.text}</span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="text-center pb-4">
              <span className="text-[9px] text-white/15 font-medium tracking-wider uppercase">
                Powered by Konnekt Engine
              </span>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  );
}
