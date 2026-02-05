/**
 * OrderQRCode - Dedicated page for viewing, downloading and sharing order QR code
 * 
 * Features:
 * - Large QR code display
 * - Download as PNG
 * - Share via native share API
 * - Copy QR code link
 * - Order summary
 */

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Download, Share2, Copy, CheckCircle, 
  Package, MapPin, Calendar, User, QrCode as QrCodeIcon
} from "lucide-react";
import QRCode from "react-qr-code";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MiniLoader } from "@/components/ui/MiniLoader";

interface OrderInfo {
  id: string;
  order_number: string;
  qr_code: string;
  origin_city: string;
  destination_city: string;
  pickup_date: string | null;
  weight: number;
  status: string;
  gp_name: string;
}

export default function OrderQRCodePage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);
  
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);
  
  const loadOrder = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, order_number, origin_city, destination_city,
          pickup_date, weight, status,
          gp_profiles:gp_id(business_name)
        `)
        .eq("id", orderId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setOrder({
          id: data.id,
          order_number: data.order_number,
          qr_code: data.order_number, // Use order_number as QR code value
          origin_city: data.origin_city,
          destination_city: data.destination_city,
          pickup_date: data.pickup_date,
          weight: data.weight,
          status: data.status,
          gp_name: (data.gp_profiles as any)?.business_name || "Transporteur"
        });
      }
    } catch (error) {
      console.error("Error loading order:", error);
      toast({ 
        title: "Erreur", 
        description: "Impossible de charger la commande", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownload = async () => {
    if (!qrRef.current || !order) return;
    
    try {
      // Create canvas from SVG
      const svg = qrRef.current.querySelector("svg");
      if (!svg) return;
      
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      
      // Set canvas size with padding
      const size = 400;
      const padding = 40;
      canvas.width = size + padding * 2;
      canvas.height = size + padding * 2 + 80; // Extra space for text
      
      img.onload = () => {
        if (!ctx) return;
        
        // White background
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw QR code
        ctx.drawImage(img, padding, padding, size, size);
        
        // Add order number text
        ctx.fillStyle = "#1a1a1a";
        ctx.font = "bold 20px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(order.order_number, canvas.width / 2, size + padding + 40);
        
        ctx.font = "14px Inter, sans-serif";
        ctx.fillStyle = "#666";
        ctx.fillText(`${order.origin_city} → ${order.destination_city}`, canvas.width / 2, size + padding + 65);
        
        // Download
        const link = document.createElement("a");
        link.download = `qr-${order.order_number}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        
        toast({ title: "✅ QR Code téléchargé" });
      };
      
      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    } catch (error) {
      console.error("Download error:", error);
      toast({ title: "Erreur de téléchargement", variant: "destructive" });
    }
  };
  
  const handleShare = async () => {
    if (!order) return;
    
    const shareData = {
      title: `QR Code - ${order.order_number}`,
      text: `QR Code pour la commande ${order.order_number}\n${order.origin_city} → ${order.destination_city}`,
      url: window.location.href
    };
    
    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // User cancelled or error
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy link
      handleCopyLink();
    }
  };
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast({ title: "✅ Lien copié" });
    setTimeout(() => setCopied(false), 2000);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <MiniLoader size="lg" showText text="Chargement..." />
      </div>
    );
  }
  
  if (!order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <QrCodeIcon className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-semibold mb-2">Commande non trouvée</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Ce QR code n'est pas disponible.
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold">Mon QR Code</h1>
          <div className="w-10" />
        </div>
      </header>
      
      <div className="px-4 py-6 space-y-6 max-w-md mx-auto">
        {/* QR Code Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-6 flex flex-col items-center">
              {/* QR Code */}
              <div 
                ref={qrRef}
                className="bg-white p-4 rounded-xl shadow-sm border"
              >
                <QRCode
                  value={order.qr_code || order.order_number}
                  size={200}
                  level="H"
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              </div>
              
              {/* Order Number */}
              <div className="mt-4 text-center">
                <p className="font-mono text-lg font-bold text-foreground">
                  {order.order_number}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Présentez ce code lors du dépôt
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="flex flex-col h-auto py-4 gap-2"
            onClick={handleDownload}
          >
            <Download className="w-5 h-5 text-primary" />
            <span className="text-xs">Télécharger</span>
          </Button>
          
          <Button
            variant="outline"
            className="flex flex-col h-auto py-4 gap-2"
            onClick={handleShare}
          >
            <Share2 className="w-5 h-5 text-primary" />
            <span className="text-xs">Partager</span>
          </Button>
          
          <Button
            variant="outline"
            className="flex flex-col h-auto py-4 gap-2"
            onClick={handleCopyLink}
          >
            {copied ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <Copy className="w-5 h-5 text-primary" />
            )}
            <span className="text-xs">{copied ? "Copié" : "Copier lien"}</span>
          </Button>
        </div>
        
        {/* Order Summary */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground">
              Récapitulatif commande
            </h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{order.origin_city} → {order.destination_city}</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Package className="w-4 h-4 text-amber-500" />
                <span>{order.weight} kg</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-blue-500" />
                <span>{order.gp_name}</span>
              </div>
              
              {order.pickup_date && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-green-500" />
                  <span>
                    {format(new Date(order.pickup_date), "d MMMM yyyy", { locale: fr })}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Instructions */}
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="p-4">
            <h4 className="font-medium text-sm mb-2">💡 Comment ça marche ?</h4>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>• Présentez ce QR code au transporteur lors du dépôt</li>
              <li>• Le transporteur scannera le code pour confirmer la réception</li>
              <li>• Vous pouvez envoyer ce code à une personne de confiance</li>
              <li>• Conservez ce code jusqu'à la livraison complète</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
