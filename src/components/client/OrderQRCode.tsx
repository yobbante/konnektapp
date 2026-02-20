import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { QrCode, Download, Share2, Copy, CheckCircle, Info, Package, MapPin, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MiniLoader } from "@/components/ui/MiniLoader";

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

/**
 * Client-side QR Code display for order
 * 
 * Shows QR code that encodes the order number for GP scanning
 * Available after payment is confirmed
 */
export function OrderQRCode({ orderNumber, orderId, status, weight, originCity, destinationCity, totalPrice, currency }: OrderQRCodeProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [qrLoaded, setQrLoaded] = useState(false);
  const [qrError, setQrError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-refresh QR every 15s for faster action sync
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(k => k + 1);
      setQrLoaded(false);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Generate QR code URL with cache busting
  const qrData = encodeURIComponent(orderNumber);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}&format=png&margin=10&t=${refreshKey}`;
  const qrCodeSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}&format=svg&margin=10`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(orderNumber);
    setCopied(true);
    toast({ title: "Code copié", description: orderNumber });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Code Konnekt: ${orderNumber}`,
          text: `Mon code de suivi Konnekt: ${orderNumber}`,
          url: window.location.href,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          handleCopyCode();
        }
      }
    } else {
      handleCopyCode();
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = qrCodeUrl.replace("svg", "png");
    link.download = `qrcode-${orderNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "QR Code téléchargé" });
  };

  // Only show QR after order is accepted
  // V2 state machine: show QR for all active states after acceptance
  const canShowQR = [
    "accepted", "paid_held", "checked_in", "collected",
    "weight_pending_payment", "scheduled_departure",
    "in_transit", "arrived_destination", "delivery_pending",
    "delivery_confirmed", "delivered", "released"
  ].includes(status);

  if (!canShowQR) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <QrCode className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            Le QR code sera disponible après acceptation par le transporteur
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" />
            Votre QR Code
          </span>
          <Badge variant="secondary" className="text-xs">
            {status === "delivered" ? "Livré" : "Actif"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code Display */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex justify-center"
        >
          <div className="p-4 bg-white rounded-xl shadow-sm border relative">
            {!qrLoaded && !qrError && (
              <div className="w-48 h-48 flex items-center justify-center">
                <MiniLoader size="md" />
              </div>
            )}
            {qrError ? (
              <div className="w-48 h-48 flex flex-col items-center justify-center text-center">
                <QrCode className="w-12 h-12 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">QR Code</p>
                <p className="font-mono text-sm font-bold mt-1">{orderNumber}</p>
              </div>
            ) : (
              <img 
                src={qrCodeUrl} 
                alt={`QR Code ${orderNumber}`}
                className={`w-48 h-48 ${qrLoaded ? 'block' : 'hidden'}`}
                onLoad={() => setQrLoaded(true)}
                onError={() => setQrError(true)}
              />
            )}
          </div>
        </motion.div>

        {/* Parcel info summary if active */}
        {(weight || originCity || destinationCity) && status !== "delivered" && (
          <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
            <div className="flex items-center gap-2 text-xs">
              <Package className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium">{weight ? `${weight} kg` : ""}</span>
              {originCity && destinationCity && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {originCity}
                  <ArrowRight className="w-2.5 h-2.5" />
                  {destinationCity}
                </span>
              )}
              {totalPrice && currency && (
                <span className="ml-auto font-semibold text-primary">
                  {totalPrice.toLocaleString()} {currency}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Order Number */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Numéro de commande</p>
          <button
            onClick={handleCopyCode}
            className="font-mono text-lg font-bold text-primary flex items-center gap-2 mx-auto hover:underline"
          >
            {orderNumber}
            {copied ? (
              <CheckCircle className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Partager
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Télécharger
          </Button>
        </div>

        {/* Info */}
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-primary mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <strong>Dépôt:</strong> Présentez ce QR au transporteur. <strong>Réception:</strong> Le destinataire doit présenter ce QR.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
