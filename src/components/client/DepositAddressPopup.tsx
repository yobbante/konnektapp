/**
 * DepositAddressPopup — Interactive deposit address card with action icons
 * 
 * PRV §9: Adresse visible uniquement après acceptation GP
 * - Shows red badge indicator on trigger icon
 * - Popup with full address, call, maps, whatsapp
 * - Highlight stays active until deposit is done
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Phone, Navigation, MessageCircle, X, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface DepositAddressPopupProps {
  depositAddress: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  gpName: string;
  isActive?: boolean; // True when order is accepted but not yet collected
  className?: string;
  gpId?: string;
  orderId?: string;
}

export function DepositAddressPopup({
  depositAddress,
  phone,
  whatsapp,
  gpName,
  isActive = true,
  className,
  gpId,
  orderId,
}: DepositAddressPopupProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!depositAddress) return null;

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    toast({ title: "Adresse copiée" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenMaps = () => {
    const encoded = encodeURIComponent(depositAddress);
    // Try Google Maps first, falls back to default maps app
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, "_blank");
  };

  const handleCall = () => {
    if (phone) window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = () => {
    setOpen(false);
    const params = new URLSearchParams();
    if (gpId) params.set("gp", gpId);
    if (orderId) params.set("order", orderId);
    navigate(`/messages${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <>
      {/* Trigger Button — Icon with red badge */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        className={cn(
          "relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
          isActive
            ? "bg-primary/10 border border-primary/30 text-primary"
            : "bg-muted/50 text-muted-foreground",
          className
        )}
      >
        <MapPin className="w-4 h-4" />
        <span className="text-xs font-medium truncate max-w-[140px]">
          Adresse de dépôt
        </span>
        {/* Red badge indicator */}
        {isActive && (
          <motion.span
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-destructive"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Popup Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Adresse de dépôt</h3>
                  <p className="text-xs text-muted-foreground">{gpName}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="px-4 py-3">
            <div className="p-3 bg-muted/50 rounded-xl border border-border">
              <p className="text-sm font-medium leading-relaxed">{depositAddress}</p>
            </div>
          </div>

          {/* Interactive Action Buttons */}
          <div className="px-4 pb-4 grid grid-cols-2 gap-2">
            {/* Google Maps */}
            <Button
              variant="outline"
              className="h-12 gap-2 rounded-xl"
              onClick={handleOpenMaps}
            >
              <Navigation className="w-4 h-4 text-blue-500" />
              <span className="text-xs">Google Maps</span>
            </Button>

            {/* Copy Address */}
            <Button
              variant="outline"
              className="h-12 gap-2 rounded-xl"
              onClick={handleCopyAddress}
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span className="text-xs">{copied ? "Copié !" : "Copier"}</span>
            </Button>

            {/* Call */}
            {phone && (
              <Button
                variant="outline"
                className="h-12 gap-2 rounded-xl"
                onClick={handleCall}
              >
                <Phone className="w-4 h-4 text-green-600" />
                <span className="text-xs">Appeler</span>
              </Button>
            )}

            {/* WhatsApp */}
            {(whatsapp || gpId) && (
              <Button
                variant="outline"
                className="h-12 gap-2 rounded-xl"
                onClick={handleWhatsApp}
              >
                <MessageCircle className="w-4 h-4 text-primary" />
                <span className="text-xs">Message sécurisé</span>
              </Button>
            )}
          </div>

          {/* Hint */}
          <div className="px-4 pb-4">
            <p className="text-[11px] text-muted-foreground text-center">
              Présentez votre QR code au transporteur lors du dépôt
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
