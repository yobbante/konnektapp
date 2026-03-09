/**
 * RecipientTrackingCard — Interactive card for recipients with QR, address & messaging
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Package, ArrowRight, MapPin, Clock, Truck, CheckCircle, X,
  User, Eye, MessageCircle, QrCode, Navigation, Copy, ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { notify } from "@/components/ui/AppleNotification";

interface IncomingParcel {
  id: string;
  order_number: string;
  origin_city: string;
  destination_city: string;
  origin_country: string;
  destination_country: string;
  status: string;
  weight: number;
  sender_name: string;
  created_at: string;
  gp_id: string;
  deposit_address?: string;
  reception_address?: string;
  gp_business_name?: string;
  gp_phone?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "En préparation", color: "bg-amber-500/20 text-amber-600", icon: Clock },
  accepted: { label: "Confirmé", color: "bg-green-500/20 text-green-600", icon: CheckCircle },
  paid_held: { label: "Paiement reçu", color: "bg-emerald-500/20 text-emerald-600", icon: CheckCircle },
  checked_in: { label: "Déposé", color: "bg-indigo-500/20 text-indigo-600", icon: Package },
  collected: { label: "Collecté", color: "bg-blue-500/20 text-blue-600", icon: Package },
  scheduled_departure: { label: "Départ programmé", color: "bg-sky-500/20 text-sky-600", icon: Clock },
  in_transit: { label: "En route vers vous", color: "bg-blue-500/20 text-blue-600", icon: Truck },
  arrived_destination: { label: "Arrivé !", color: "bg-teal-500/20 text-teal-600", icon: MapPin },
  delivery_pending: { label: "Livraison en cours", color: "bg-cyan-500/20 text-cyan-600", icon: Truck },
  delivery_confirmed: { label: "Livré ✓", color: "bg-green-500/20 text-green-700", icon: CheckCircle },
  delivered: { label: "Livré", color: "bg-green-500/20 text-green-700", icon: CheckCircle },
  released: { label: "Terminé", color: "bg-green-500/20 text-green-700", icon: CheckCircle },
};

const TERMINAL_STATUSES = ["delivered", "released", "cancelled", "delivery_confirmed"];

interface RecipientTrackingCardProps {
  userId: string;
  listMode?: boolean;
}

export function RecipientTrackingCard({ userId, listMode = false }: RecipientTrackingCardProps) {
  const [parcels, setParcels] = useState<IncomingParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParcel, setSelectedParcel] = useState<IncomingParcel | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadIncomingParcels();
  }, [userId]);

  const loadIncomingParcels = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, origin_city, destination_city, origin_country, destination_country, status, weight, created_at, client_id, gp_id")
        .eq("recipient_user_id", userId)
        .not("status", "in", '("cancelled","released")')
        .order("created_at", { ascending: false })
        .limit(10);

      if (error || !data || data.length === 0) {
        setParcels([]);
        return;
      }

      // Get sender names
      const clientIds = [...new Set(data.map(o => o.client_id))];
      const gpIds = [...new Set(data.map(o => o.gp_id))];

      const [profilesRes, gpRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name").in("user_id", clientIds),
        supabase.from("gp_profiles").select("id, business_name, phone, deposit_address, reception_address").in("id", gpIds),
      ]);

      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p.full_name]) || []);
      const gpMap = new Map(gpRes.data?.map(g => [g.id, g]) || []);

      setParcels(data.map(o => {
        const gp = gpMap.get(o.gp_id);
        return {
          ...o,
          sender_name: profileMap.get(o.client_id) || "Expéditeur",
          gp_business_name: gp?.business_name,
          gp_phone: gp?.phone,
          deposit_address: gp?.deposit_address,
          reception_address: gp?.reception_address,
        };
      }));
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && listMode) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loading || parcels.length === 0) {
    if (listMode) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
            <Package className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">Aucun colis pour vous</p>
          <p className="text-xs text-muted-foreground mt-1">Les colis qui vous sont destinés apparaîtront ici</p>
        </div>
      );
    }
    return null;
  }

  const activeCount = parcels.filter(p => !TERMINAL_STATUSES.includes(p.status)).length;

  if (activeCount === 0 && !listMode) return null;

  // List mode: show individual cards like the "actives" tab
  if (listMode) {
    const activeParcels = parcels.filter(p => !TERMINAL_STATUSES.includes(p.status));
    if (activeParcels.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
            <Package className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">Aucun colis pour vous</p>
          <p className="text-xs text-muted-foreground mt-1">Les colis qui vous sont destinés apparaîtront ici</p>
        </div>
      );
    }
    return (
      <>
        <div className="px-4 pt-3 space-y-2">
          {activeParcels.map((parcel, i) => {
            const statusInfo = STATUS_MAP[parcel.status] || { label: parcel.status, color: "bg-muted text-muted-foreground", icon: Clock };
            const StatusIcon = statusInfo.icon;
            return (
              <motion.div
                key={parcel.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelectedParcel(parcel)}
                className="bg-card border border-border rounded-xl p-3 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-violet-500/10">
                    <StatusIcon className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-foreground truncate">
                        {parcel.origin_city} → {parcel.destination_city}
                      </p>
                      <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        #{parcel.order_number?.slice(-6)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {parcel.sender_name}</span>
                      {parcel.weight && <span>{parcel.weight} kg</span>}
                      {parcel.gp_business_name && <span className="truncate">· {parcel.gp_business_name}</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {selectedParcel && (
          <div
            className="fixed inset-0 z-[80] bg-background"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <RecipientParcelDetails
              parcels={activeParcels}
              onClose={() => setSelectedParcel(null)}
              navigate={navigate}
            />
          </div>
        )}
      </>
    );
  }

  // Banner mode (default): compact summary card
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mb-3"
      >
        <div
          onClick={() => setSelectedParcel(parcels[0])}
          className="relative overflow-hidden bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-violet-500/10 border border-violet-500/20 rounded-2xl shadow-md cursor-pointer active:scale-[0.98] transition-transform"
        >
          <motion.div whileTap={{ scale: 0.99 }} className="p-3 flex items-center gap-3">
            <div className="relative">
              <motion.div
                className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br from-violet-500 to-purple-600"
                animate={{ boxShadow: ["0 0 0 0 rgba(139,92,246,0.3)", "0 0 0 6px rgba(139,92,246,0)"] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Package className="w-5 h-5 text-white" />
              </motion.div>
              {activeCount > 0 && (
                <motion.div
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-violet-500 rounded-full border-2 border-background"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-violet-500/20 text-violet-600">
                  Pour vous
                </Badge>
                <p className="text-sm font-bold text-foreground truncate">
                  {activeCount} colis en route
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  De {parcels[0].sender_name} • {parcels[0].origin_city} → {parcels[0].destination_city}
                </span>
              </div>
            </div>

            <motion.div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center">
              <Eye className="w-4 h-4 text-violet-600" />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {selectedParcel && (
        <div
          className="fixed inset-0 z-[80] bg-background"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <RecipientParcelDetails
            parcels={parcels}
            onClose={() => setSelectedParcel(null)}
            navigate={navigate}
          />
        </div>
      )}
    </>
  );
}

/** Full-screen details for recipient */
function RecipientParcelDetails({
  parcels,
  onClose,
  navigate,
}: {
  parcels: IncomingParcel[];
  onClose: () => void;
  navigate: (path: string) => void;
}) {
  const [expandedQR, setExpandedQR] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    notify.success("Copié !");
  };

  const openGPMessage = async (parcel: IncomingParcel) => {
    // Navigate to messages with this GP context
    onClose();
    navigate(`/messages?gp=${parcel.gp_id}&order=${parcel.id}`);
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="h-[100dvh] flex flex-col bg-background pb-[calc(env(safe-area-inset-bottom)+88px)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Colis pour vous</h2>
            <p className="text-xs text-muted-foreground">{parcels.length} colis entrant{parcels.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-36 space-y-3" style={{ WebkitOverflowScrolling: 'touch' }}>
        {parcels.map((parcel, i) => {
          const statusInfo = STATUS_MAP[parcel.status] || { label: parcel.status, color: "bg-muted text-muted-foreground", icon: Clock };
          const StatusIcon = statusInfo.icon;
          const isDelivered = TERMINAL_STATUSES.includes(parcel.status);
          const showQR = expandedQR === parcel.id;
          const pickupAddress = parcel.reception_address || parcel.deposit_address;

          return (
            <motion.div
              key={parcel.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-2xl overflow-hidden"
            >
              {/* Main content */}
              <div className="p-3.5 space-y-2.5">
                {/* Route + Status */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <StatusIcon className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold">{parcel.origin_city}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-violet-500" />
                      <span className="text-sm font-bold">{parcel.destination_city}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${statusInfo.color}`}>
                      {!isDelivered && (
                        <motion.span
                          className="w-1.5 h-1.5 rounded-full bg-current"
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      )}
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-muted-foreground">Expéditeur</p>
                    <p className="font-medium flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {parcel.sender_name}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-muted-foreground">Poids</p>
                    <p className="font-medium">{parcel.weight || '—'} kg</p>
                  </div>
                </div>

                {/* Pickup address */}
                {pickupAddress && !isDelivered && (
                  <div className="bg-violet-500/5 border border-violet-500/15 rounded-xl p-2.5">
                    <div className="flex items-start gap-2">
                      <Navigation className="w-3.5 h-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Adresse de récupération</p>
                        <p className="text-xs font-medium text-foreground">{pickupAddress}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(pickupAddress)}
                        className="p-1 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                )}

                {/* GP info + transporter name */}
                {parcel.gp_business_name && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Truck className="w-3 h-3" />
                    <span>Transporteur : <strong className="text-foreground">{parcel.gp_business_name}</strong></span>
                  </div>
                )}

                {/* Order number */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>#{parcel.order_number?.slice(-8)}</span>
                  <span>{new Date(parcel.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="border-t border-border bg-muted/20 px-3 py-2 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs h-8"
                  onClick={() => {
                    onClose();
                    navigate(`/tracking?order=${parcel.id}`);
                  }}
                >
                  <MapPin className="w-3 h-3 mr-1" />
                  Suivre
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setExpandedQR(showQR ? null : parcel.id)}
                >
                  <QrCode className="w-3 h-3 mr-1" />
                  QR
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => openGPMessage(parcel)}
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  Message
                </Button>
              </div>

              {/* Expandable QR */}
              <motion.div
                initial={false}
                animate={{
                  height: showQR ? "auto" : 0,
                  opacity: showQR ? 1 : 0,
                }}
                transition={{ type: "spring", damping: 22, stiffness: 260 }}
                style={{ overflow: "hidden" }}
              >
                {showQR && (
                  <div className="border-t border-border p-4 flex flex-col items-center gap-2.5 bg-muted/30">
                    <p className="text-[11px] text-muted-foreground font-medium">Montrez ce QR au livreur</p>
                    <div className="bg-white p-3 rounded-xl shadow-sm">
                      <QRCode
                        value={`https://konnektapp.lovable.app/tracking?order=${parcel.id}`}
                        size={130}
                        level="M"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono">{parcel.order_number}</p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
