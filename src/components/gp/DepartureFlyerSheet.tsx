/**
 * DepartureFlyerSheet — Shows generated promo flyer with download & share
 * No emojis. Professional design.
 */
import { useState, useEffect, useRef } from "react";
import { Download, Share2, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { generateDepartureFlyer, type FlyerData } from "@/lib/generateDepartureFlyer";
import { motion } from "framer-motion";

interface DepartureFlyerSheetProps {
  open: boolean;
  onClose: () => void;
  data: FlyerData | null;
}

export function DepartureFlyerSheet({ open, onClose, data }: DepartureFlyerSheetProps) {
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => {
    if (open && data) {
      setGenerating(true);
      setImageUrl(null);
      blobRef.current = null;
      generateDepartureFlyer(data).then((url) => {
        setImageUrl(url);
        // Pre-convert to blob
        try {
          const parts = url.split(",");
          const mime = parts[0].match(/:(.*?);/)?.[1] || "image/png";
          const byteString = atob(parts[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          blobRef.current = new Blob([ab], { type: mime });
        } catch { /* fallback */ }
        setGenerating(false);
      });
    }
  }, [open, data]);

  const handleDownload = async () => {
    if (!imageUrl || !data) return;
    try {
      const blob = blobRef.current;
      if (!blob) {
        toast({ title: "Erreur de generation", variant: "destructive" });
        return;
      }

      const fileName = `Konnekt-${data.originCity}-${data.destinationCity}-${data.departureDate}.png`;

      // Try using the download attribute with an anchor
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      a.style.display = "none";
      document.body.appendChild(a);
      
      // Use click() on next tick for mobile Safari compatibility
      setTimeout(() => {
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        }, 500);
      }, 100);

      toast({ title: "Telechargement lance" });
    } catch {
      // Fallback: open in new tab so user can long-press to save
      if (imageUrl) {
        const w = window.open();
        if (w) {
          w.document.write(`<img src="${imageUrl}" style="width:100%;max-width:600px" />`);
          w.document.title = "Konnekt Flyer";
        }
      }
      toast({ title: "Maintenez l'image pour enregistrer", variant: "default" });
    }
  };

  const handleShare = async () => {
    if (!imageUrl || !data) return;

    const shareText = [
      `Je voyage de ${data.originCity} vers ${data.destinationCity} le ${data.departureDate}.`,
      `Reservez votre colis sur Konnekt :`,
      data.bookingUrl,
    ].join("\n");

    try {
      const blob = blobRef.current;
      if (blob) {
        const file = new File(
          [blob],
          `Konnekt-${data.originCity}-${data.destinationCity}.png`,
          { type: "image/png" }
        );

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: `Depart ${data.originCity} - ${data.destinationCity}`,
            text: shareText,
            files: [file],
          });
          return;
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
    }

    // Fallback: open WhatsApp with text (no image)
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, "_blank");
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[95vh] focus:outline-none [&>div:first-child]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-sm">Votre visuel promo</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4 overflow-y-auto">
          <p className="text-xs text-muted-foreground text-center">
            Telechargez et partagez ce visuel sur vos groupes Facebook, WhatsApp, etc.
          </p>

          {/* Preview */}
          <div className="flex justify-center">
            {generating ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full aspect-[4/5] max-w-[320px] rounded-2xl bg-muted/50 flex items-center justify-center"
              >
                <div className="text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground">Generation en cours...</p>
                </div>
              </motion.div>
            ) : imageUrl ? (
              <motion.img
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                src={imageUrl}
                alt="Flyer promotionnel"
                className="w-full max-w-[320px] rounded-2xl shadow-xl border border-border/50"
              />
            ) : null}
          </div>

          {/* Actions */}
          {imageUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex gap-2 pb-safe"
            >
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl font-semibold gap-2"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4" />
                Telecharger
              </Button>
              <Button
                className="flex-1 h-12 rounded-xl font-semibold gap-2"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4" />
                Partager
              </Button>
            </motion.div>
          )}

          <button
            onClick={onClose}
            className="w-full text-center text-xs text-muted-foreground py-2 hover:text-foreground transition-colors"
          >
            Passer
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
