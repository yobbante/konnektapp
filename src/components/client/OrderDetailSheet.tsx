import { motion, AnimatePresence } from "framer-motion";
import { X, Plane, Truck, Ship, Luggage, Package, MapPin, Calendar, Weight, Hash, User, Phone, Shield, QrCode, ExternalLink, Lock, MapPinned, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-amber-500/20 text-amber-600" },
  accepted: { label: "Accepté", color: "bg-green-500/20 text-green-600" },
  collected: { label: "Collecté", color: "bg-blue-500/20 text-blue-600" },
  paid_held: { label: "Paiement reçu", color: "bg-emerald-500/20 text-emerald-600" },
  checked_in: { label: "Déposé", color: "bg-indigo-500/20 text-indigo-600" },
  weight_pending_payment: { label: "Supplément requis", color: "bg-orange-500/20 text-orange-600" },
  scheduled_departure: { label: "Départ programmé", color: "bg-violet-500/20 text-violet-600" },
  in_transit: { label: "En transit", color: "bg-blue-500/20 text-blue-600" },
  arrived_destination: { label: "Arrivé", color: "bg-teal-500/20 text-teal-600" },
  delivery_pending: { label: "Livraison en cours", color: "bg-cyan-500/20 text-cyan-600" },
  delivered: { label: "Livré", color: "bg-green-500/20 text-green-700" },
  delivery_confirmed: { label: "Livré ✓", color: "bg-emerald-500/20 text-emerald-700" },
  cancelled: { label: "Annulée", color: "bg-destructive/20 text-destructive" },
  rejected: { label: "Refusée", color: "bg-destructive/20 text-destructive" },
  expired: { label: "Expirée", color: "bg-muted text-muted-foreground" },
};

export function getTransportIcon(gpType?: string) {
  switch (gpType) {
    case "aerien": return Plane;
    case "routier": return Truck;
    case "maritime": return Ship;
    case "express":
    case "bagages_international":
    case "voyageur": return Luggage;
    case "agence": return Package;
    default: return Package;
  }
}

export function getTransportLabel(gpType?: string) {
  switch (gpType) {
    case "aerien": return "Aérien";
    case "routier": return "Routier";
    case "maritime": return "Maritime";
    case "express": return "GP Express";
    case "bagages_international": return "GP via Bagages";
    case "voyageur": return "Voyageur";
    case "agence": return "Agence";
    default: return "Transport";
  }
}

interface OrderDetailSheetProps {
  order: any;
  open: boolean;
  onClose: () => void;
}

export function OrderDetailSheet({ order, open, onClose }: OrderDetailSheetProps) {
  const navigate = useNavigate();
  const [showQR, setShowQR] = useState(false);

  if (!order) return null;

  const cfg = STATUS_CONFIG[order.status] || { label: order.status, color: "bg-muted text-muted-foreground" };
  const gpType = order.gp_profiles?.gp_type;
  const TransportIcon = getTransportIcon(gpType);
  const trackingUrl = `${window.location.origin}/tracking?id=${order.id}`;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TransportIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {order.origin_city} → {order.destination_city}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    #{order.order_number?.slice(-6)} · {getTransportLabel(gpType)}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Status badge */}
            <div className="px-4 pb-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>

            {/* Info grid */}
            <div className="px-4 grid grid-cols-2 gap-2 pb-3">
              <InfoItem icon={MapPin} label="Origine" value={`${order.origin_city}, ${order.origin_country}`} />
              <InfoItem icon={MapPin} label="Destination" value={`${order.destination_city}, ${order.destination_country}`} />
              <InfoItem icon={Weight} label="Poids" value={order.weight ? `${order.weight} kg` : "—"} />
              <InfoItem icon={Hash} label="Prix/kg" value={order.price_per_kg ? `${order.price_per_kg.toLocaleString()} ${order.currency}` : "—"} />
              <InfoItem icon={Calendar} label="Collecte" value={order.pickup_date ? format(new Date(order.pickup_date), "d MMM yyyy", { locale: fr }) : "—"} />
              <InfoItem icon={Calendar} label="Créée le" value={format(new Date(order.created_at), "d MMM yyyy", { locale: fr })} />
            </div>

            {/* Price summary */}
            <div className="mx-4 mb-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-base font-bold text-foreground">
                  {order.total_price?.toLocaleString()} {order.currency || "FCFA"}
                </span>
              </div>
              {order.has_insurance && (
                <div className="flex items-center gap-1 mt-1">
                  <Shield className="w-3 h-3 text-emerald-600" />
                  <span className="text-[10px] text-emerald-600 font-medium">Assuré</span>
                </div>
              )}
            </div>

            {/* GP Info - Progressive release */}
            {order.gp_profiles && (
              <GPInfoSection
                order={order}
                onMessage={() => navigate(`/messages?gp=${order.gp_id}&order=${order.id}`)}
              />
            )}

            {/* Recipient */}
            {order.recipient_name && (
              <div className="mx-4 mb-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                <p className="text-[10px] text-muted-foreground mb-1">Destinataire</p>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{order.recipient_name}</span>
                </div>
                {order.recipient_phone && (
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{order.recipient_phone}</span>
                  </div>
                )}
              </div>
            )}

            {/* QR Code toggle */}
            <div className="mx-4 mb-3">
              <button
                onClick={() => setShowQR(!showQR)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted/40 border border-border/50 text-sm font-medium text-foreground"
              >
                <QrCode className="w-4 h-4" />
                {showQR ? "Masquer QR" : "Afficher QR de suivi"}
              </button>
              <AnimatePresence>
                {showQR && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 22, stiffness: 260 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="flex flex-col items-center py-4 gap-2">
                      <div className="bg-white p-3 rounded-xl shadow-sm">
                        <QRCode value={trackingUrl} size={160} />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Scannez pour suivre ce colis</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="px-4 pb-8 flex gap-2">
              <button
                onClick={() => { onClose(); navigate(`/tracking?id=${order.id}`); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
              >
                <ExternalLink className="w-4 h-4" />
                Suivi détaillé
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="p-2 rounded-lg bg-muted/30 border border-border/30">
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className="w-3 h-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-xs font-medium text-foreground truncate">{value}</p>
    </div>
  );
}

const POST_ACCEPTED = ['accepted', 'collected', 'paid_held', 'checked_in', 'weight_pending_payment', 'scheduled_departure', 'in_transit', 'arrived_destination', 'delivery_pending', 'delivered', 'delivery_confirmed'];
const POST_COLLECTED = ['collected', 'checked_in', 'weight_pending_payment', 'scheduled_departure', 'in_transit', 'arrived_destination', 'delivery_pending', 'delivered', 'delivery_confirmed'];

function GPInfoSection({ order, onMessage }: { order: any; onMessage: () => void }) {
  const gp = order.gp_profiles;
  const status = order.status;
  const isAccepted = POST_ACCEPTED.includes(status);
  const isCollected = POST_COLLECTED.includes(status);

  return (
    <div className="mx-4 mb-3 p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2.5">
      <p className="text-[10px] text-muted-foreground">Transporteur</p>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{gp.business_name}</p>
          {gp.rating && (
            <p className="text-[10px] text-muted-foreground">⭐ {gp.rating.toFixed(1)}</p>
          )}
        </div>
      </div>

      {/* Phone - visible after acceptance */}
      {isAccepted && gp.phone ? (
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/30">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-foreground font-medium">{gp.phone}</span>
          </div>
          <button onClick={onMessage} className="text-[11px] px-2 py-1 rounded-md bg-primary/10 text-primary font-medium inline-flex items-center gap-1">
            <MessageCircle className="w-3 h-3" /> Message
          </button>
        </div>
      ) : !isAccepted && (
        <LockedInfo label="Téléphone visible après acceptation" />
      )}

      {/* Deposit address - visible after acceptance */}
      {isAccepted && gp.deposit_address ? (
        <div className="flex items-start gap-2 pt-1 border-t border-border/30">
          <MapPinned className="w-3.5 h-3.5 text-primary mt-0.5" />
          <div>
            <p className="text-[10px] text-muted-foreground">Adresse de dépôt</p>
            <p className="text-xs text-foreground">{gp.deposit_address}</p>
          </div>
        </div>
      ) : !isAccepted && (
        <LockedInfo label="Adresse de dépôt visible après acceptation" />
      )}

      {/* Reception address - visible after collection */}
      {isCollected && gp.reception_address ? (
        <div className="flex items-start gap-2 pt-1 border-t border-border/30">
          <MapPin className="w-3.5 h-3.5 text-primary mt-0.5" />
          <div>
            <p className="text-[10px] text-muted-foreground">Adresse de réception</p>
            <p className="text-xs text-foreground">{gp.reception_address}</p>
          </div>
        </div>
      ) : !isCollected && (
        <LockedInfo label="Adresse de réception visible après collecte" />
      )}
    </div>
  );
}

function LockedInfo({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 pt-1 border-t border-border/30">
      <Lock className="w-3 h-3 text-muted-foreground/50" />
      <span className="text-[10px] text-muted-foreground/70 italic">{label}</span>
    </div>
  );
}
