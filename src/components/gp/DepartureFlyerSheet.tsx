/**
 * DepartureFlyerSheet — Shows generated promo flyer with download & share
 */
import { useState, useEffect } from "react";
import { Download, Share2, X, Sparkles } from "lucide-react";
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

  useEffect(() => {
    if (open && data) {
      setGenerating(true);
      setImageUrl(null);
      generateDepartureFlyer(data).then((url) => {
        setImageUrl(url);
        setGenerating(false);
      });
    }
  }, [open, data]);

  const handleDownload = () => {
    if (!imageUrl || !data) return;
    const link = document.createElement("a");
    link.download = `Konnekt-${data.originCity}-${data.destinationCity}-${data.departureDate}.png`;
    link.href = imageUrl;
    link.click();
    toast({ title: "Image téléchargée !" });
  };

  const handleShare = async () => {
    if (!imageUrl || !data) return;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File(
        [blob],
        `Konnekt-${data.originCity}-${data.destinationCity}.png`,
        { type: "image/png" }
      );

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Départ ${data.originCity} → ${data.destinationCity}`,
          text: `Depart ${data.originCity} → ${data.destinationCity} le ${data.departureDate} — Reservez sur Konnekt !`,
          files: [file],
        });
      } else {
        // Fallback: download
        handleDownload();
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        handleDownload();
      }
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[95vh] focus:outline-none [&>div:first-child]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-sm">Votre visuel promo</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4 overflow-y-auto">
          {/* Subtitle */}
          <p className="text-xs text-muted-foreground text-center">
            Téléchargez et partagez ce visuel sur vos groupes Facebook, WhatsApp, etc.
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
                  <p className="text-xs text-muted-foreground">Génération en cours...</p>
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
                Télécharger
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

          {/* Skip */}
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
