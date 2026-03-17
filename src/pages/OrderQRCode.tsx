/**
 * OrderQRCode Page V2 — Full-page scan-engine QR for orders
 * 
 * Premium bleu nuit layout. QR encodes CMD-XXXX (scan-engine QR_COLIS).
 * Includes logistics label, barcode backup, and role-based scan hints.
 */
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Download, Share2, Copy, CheckCircle, 
  Package, MapPin, Calendar, User, ScanLine, X
} from "lucide-react";
import QRCodeDisplay from "react-qr-code";
import JsBarcode from "jsbarcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { LogisticsLabelGenerator } from "@/components/logistics/LogisticsLabelGenerator";
import { cn } from "@/lib/utils";

interface OrderInfo {
  id: string;
  order_number: string;
  origin_city: string;
  destination_city: string;
  origin_country: string;
  destination_country: string;
  pickup_date: string | null;
  weight: number;
  status: string;
  gp_name: string;
  client_name: string;
  description: string | null;
}

const BG = "linear-gradient(180deg, #0F1923 0%, #15232F 50%, #1A2B3A 100%)";

export default function OrderQRCodePage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const barcodeRef = useRef<HTMLCanvasElement>(null);

  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (orderId) loadOrder();
  }, [orderId]);

  useEffect(() => {
    if (order && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, order.order_number, {
          format: "CODE128", width: 2, height: 36, displayValue: false,
          margin: 4, background: "transparent", lineColor: "rgba(255,255,255,0.3)",
        });
      } catch { /* */ }
    }
  }, [order]);

  const loadOrder = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("orders")
        .select(`id, order_number, origin_city, destination_city, origin_country, destination_country, pickup_date, weight, status, description, client_id, gp_profiles:gp_id(business_name)`)
        .eq("id", orderId)
        .single();
      if (error) throw error;

      let clientName = "Client";
      if (data && user) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", data.client_id).single();
        clientName = profile?.full_name || "Client";
      }

      if (data) {
        setOrder({
          id: data.id, order_number: data.order_number,
          origin_city: data.origin_city, destination_city: data.destination_city,
          origin_country: data.origin_country || "", destination_country: data.destination_country || "",
          pickup_date: data.pickup_date, weight: data.weight, status: data.status,
          gp_name: (data.gp_profiles as any)?.business_name || "Transporteur",
          client_name: clientName, description: data.description,
        });
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger la commande", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById("page-order-qr-svg");
    if (!svg || !order) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = 600; canvas.height = 700;
      if (ctx) {
        ctx.fillStyle = "#0F1923"; ctx.fillRect(0, 0, 600, 700);
        ctx.fillStyle = "#ffffff";
        const m = 80, w = 440, r = 16;
        ctx.beginPath();
        ctx.moveTo(m+r,m); ctx.lineTo(m+w-r,m); ctx.quadraticCurveTo(m+w,m,m+w,m+r);
        ctx.lineTo(m+w,m+w-r); ctx.quadraticCurveTo(m+w,m+w,m+w-r,m+w);
        ctx.lineTo(m+r,m+w); ctx.quadraticCurveTo(m,m+w,m,m+w-r);
        ctx.lineTo(m,m+r); ctx.quadraticCurveTo(m,m,m+r,m); ctx.fill();
        ctx.drawImage(img, m+20, m+20, w-40, w-40);
        ctx.fillStyle = "#fff"; ctx.font = "bold 22px monospace"; ctx.textAlign = "center";
        ctx.fillText(order.order_number, 300, 580);
        ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "14px system-ui";
        ctx.fillText(`${order.origin_city} → ${order.destination_city}`, 300, 615);
        ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.font = "bold 12px system-ui";
        ctx.fillText("KONNEKT · Scan Engine", 300, 660);
      }
      const link = document.createElement("a");
      link.download = `konnekt-${order.order_number}.png`;
      link.href = canvas.toDataURL("image/png"); link.click();
      toast({ title: "✅ QR téléchargé" });
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleShare = async () => {
    if (!order) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Colis ${order.order_number}`,
          text: `Suivez mon colis Konnekt: ${order.order_number}\n${order.origin_city} → ${order.destination_city}`,
          url: window.location.href,
        });
        return;
      } catch { /* */ }
    }
    handleCopy();
  };

  const handleCopy = () => {
    if (!order) return;
    navigator.clipboard.writeText(order.order_number);
    setCopied(true);
    toast({ title: "Code copié", description: order.order_number });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <MiniLoader size="lg" showText text="Chargement..." />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: BG }}>
        <Package className="w-14 h-14 text-white/15 mb-4" />
        <h2 className="text-lg font-semibold text-white/80 mb-2">Commande non trouvée</h2>
        <p className="text-white/30 text-sm mb-4">Ce QR code n'est pas disponible.</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="bg-white/[0.05] border-white/[0.1] text-white/60">
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-safe" style={{ background: BG }}>
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#0F1923]/80 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-5 py-4" style={{ paddingTop: "calc(12px + var(--safe-top, 0px))" }}>
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.08]">
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>
          <div className="flex-1">
            <h1 className="text-[15px] font-bold text-white">QR Colis</h1>
            <p className="text-[10px] text-white/30 font-mono">{order.order_number}</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        </div>
      </div>

      <div className="px-5 py-6 space-y-5 max-w-md mx-auto">
        {/* QR Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl overflow-hidden border border-white/[0.06] bg-white/[0.03] p-6 flex flex-col items-center"
        >
          {/* Route */}
          <div className="flex items-center gap-2 mb-4">
            <div className="px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-blue-400" />
              <span className="text-[11px] text-white/50">{order.origin_city}</span>
              <span className="text-[10px] text-white/20">→</span>
              <span className="text-[11px] text-white/50">{order.destination_city}</span>
            </div>
          </div>

          {/* QR */}
          <div className="bg-white rounded-2xl p-5 relative shadow-lg shadow-blue-500/10">
            <QRCodeDisplay
              id="page-order-qr-svg"
              value={order.order_number}
              size={200}
              level="H"
              className="w-[200px] h-[200px]"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white shadow">
                <Package className="w-4.5 h-4.5 text-[#0F1923]" />
              </div>
            </div>
          </div>

          {/* Order number */}
          <p className="font-mono text-lg font-bold text-white mt-4">{order.order_number}</p>

          {/* Barcode backup */}
          <div className="mt-3 opacity-40">
            <canvas ref={barcodeRef} className="max-w-full" />
          </div>

          {/* Scan hint */}
          <div className="flex items-center gap-2 mt-3">
            <ScanLine className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] text-white/35">Présentez lors du dépôt ou de la livraison</span>
          </div>

          {/* Info pills */}
          <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
            <div className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center gap-1">
              <Package className="w-3 h-3 text-white/30" />
              <span className="text-[10px] text-white/40">{order.weight} kg</span>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center gap-1">
              <User className="w-3 h-3 text-white/30" />
              <span className="text-[10px] text-white/40">{order.gp_name}</span>
            </div>
            {order.pickup_date && (
              <div className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center gap-1">
                <Calendar className="w-3 h-3 text-white/30" />
                <span className="text-[10px] text-white/40">{format(new Date(order.pickup_date), "d MMM yyyy", { locale: fr })}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold transition-all",
              "bg-white/[0.05] border border-white/[0.08]",
              copied ? "text-emerald-400" : "text-white/50"
            )}
          >
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copié" : "Copier code"}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold transition-all bg-white/[0.05] border border-white/[0.08] text-white/50"
          >
            <Download className="w-4 h-4" /> Télécharger
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold transition-all bg-blue-500/15 text-blue-400 border border-white/[0.08]"
          >
            <Share2 className="w-4 h-4" /> Partager
          </button>
        </div>

        {/* Logistics Label */}
        <LogisticsLabelGenerator
          order={{
            orderNumber: order.order_number, orderId: order.id,
            clientName: order.client_name, gpName: order.gp_name,
            originCity: order.origin_city, destinationCity: order.destination_city,
            originCountry: order.origin_country, destinationCountry: order.destination_country,
            weight: order.weight, description: order.description, pickupDate: order.pickup_date,
          }}
          required
        />

        {/* Role explainer */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
          <h4 className="text-xs font-semibold text-white/50">Qui peut scanner ce QR ?</h4>
          {[
            { icon: "T", title: "Transporteur (GP)", desc: "Enregistrer le depot, ajuster le poids, confirmer la livraison avec code a 6 chiffres" },
            { icon: "C", title: "Client (vous)", desc: "Voir le suivi en temps reel, confirmer la reception du colis" },
            { icon: "S", title: "Camera externe", desc: "Redirige vers la page de suivi public du colis" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="text-[10px] font-bold w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">{item.icon}</span>
              <div>
                <p className="text-[11px] font-semibold text-white/60">{item.title}</p>
                <p className="text-[10px] text-white/30 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
