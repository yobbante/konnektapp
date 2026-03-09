/**
 * ExternalHandoverCard — Shown to GP when delivering to an external recipient
 * Displays the delivery code for the recipient to enter on the web confirmation page
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  KeyRound, Share2, Copy, CheckCircle, ExternalLink, Smartphone, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ExternalHandoverCardProps {
  orderId: string;
  orderNumber: string;
  deliveryCode: string;
  recipientName?: string | null;
  recipientPhone?: string | null;
  onConfirmManual: () => void;
  loading?: boolean;
}

export function ExternalHandoverCard({
  orderId,
  orderNumber,
  deliveryCode,
  recipientName,
  recipientPhone,
  onConfirmManual,
  loading,
}: ExternalHandoverCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const deliveryUrl = `${window.location.origin}/deliver/${orderId}`;

  const copyCode = () => {
    navigator.clipboard.writeText(deliveryCode);
    setCopied(true);
    toast({ title: "Code copié" });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    const text = `Votre colis ${orderNumber} est pret !\n\nConfirmez la reception ici:\n${deliveryUrl}\n\nCode de remise: ${deliveryCode}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Konnekt — Confirmation colis", text });
      } catch { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(text);
      toast({ title: "Lien copié dans le presse-papier" });
    }
  };

  return (
    <Card className="border-2 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-amber-700 dark:text-amber-300" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm">Remise à un destinataire externe</h3>
            <p className="text-xs text-muted-foreground">Le destinataire n'a pas l'app Konnekt</p>
          </div>
        </div>

        {/* Recipient info */}
        {(recipientName || recipientPhone) && (
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span>{recipientName || recipientPhone}</span>
          </div>
        )}

        {/* Delivery Code Display */}
        <div className="text-center space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Code de remise</p>
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-background border-2 border-primary/30 rounded-2xl py-4 px-6"
          >
            <p className="text-4xl font-mono font-bold tracking-[0.4em] text-primary">
              {deliveryCode}
            </p>
          </motion.div>
          <p className="text-xs text-muted-foreground">
            Montrez ce code au destinataire
          </p>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={copyCode}
            className="h-11 rounded-xl text-sm gap-2"
          >
            {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copié" : "Copier"}
          </Button>
          <Button
            variant="outline"
            onClick={shareLink}
            className="h-11 rounded-xl text-sm gap-2"
          >
            <Share2 className="w-4 h-4" />
            Partager
          </Button>
        </div>

        {/* Direct link */}
        <Button
          variant="secondary"
          onClick={() => window.open(deliveryUrl, "_blank")}
          className="w-full h-11 rounded-xl text-sm gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Ouvrir la page de confirmation
        </Button>

        {/* Manual confirmation (fallback) */}
        <div className="pt-2 border-t">
          <Button
            onClick={onConfirmManual}
            disabled={loading}
            className="w-full h-12 rounded-xl gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Confirmer la remise manuellement
              </>
            )}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Utilisez cette option si le destinataire ne peut pas scanner
          </p>
        </div>
      </CardContent>
    </Card>
  );
}