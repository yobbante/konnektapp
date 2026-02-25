/**
 * RecipientTrackingCard — Stat card shown on the home page for recipients
 * 
 * When a user is the recipient of a parcel, they see a dedicated tracking card
 * that shows incoming parcels addressed to them.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, ArrowRight, MapPin, Clock, Truck, CheckCircle, X, User, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "En préparation", color: "bg-amber-500/20 text-amber-600", icon: Clock },
  accepted: { label: "Confirmé", color: "bg-green-500/20 text-green-600", icon: CheckCircle },
  paid_held: { label: "Paiement reçu", color: "bg-emerald-500/20 text-emerald-600", icon: CheckCircle },
  checked_in: { label: "Déposé", color: "bg-indigo-500/20 text-indigo-600", icon: Package },
  collected: { label: "Collecté", color: "bg-blue-500/20 text-blue-600", icon: Package },
  in_transit: { label: "En route vers vous", color: "bg-blue-500/20 text-blue-600", icon: Truck },
  arrived_destination: { label: "Arrivé !", color: "bg-teal-500/20 text-teal-600", icon: MapPin },
  delivery_pending: { label: "Livraison en cours", color: "bg-cyan-500/20 text-cyan-600", icon: Truck },
  delivered: { label: "Livré", color: "bg-green-500/20 text-green-700", icon: CheckCircle },
};

interface RecipientTrackingCardProps {
  userId: string;
}

export function RecipientTrackingCard({ userId }: RecipientTrackingCardProps) {
  const [parcels, setParcels] = useState<IncomingParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParcel, setSelectedParcel] = useState<IncomingParcel | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadIncomingParcels();
  }, [userId]);

  const loadIncomingParcels = async () => {
    try {
      // Find orders where this user is the recipient
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, origin_city, destination_city, origin_country, destination_country, status, weight, created_at, client_id")
        .eq("recipient_user_id", userId)
        .not("status", "in", '("cancelled","released","delivered")')
        .order("created_at", { ascending: false })
        .limit(10);
      
      console.log("[RecipientTrackingCard] userId:", userId, "data:", data?.length, "error:", error?.message);

      if (error) {
        console.error("Error loading incoming parcels:", error);
        return;
      }

      if (!data || data.length === 0) {
        setParcels([]);
        return;
      }

      // Get sender names
      const clientIds = [...new Set(data.map(o => o.client_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", clientIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      setParcels(data.map(o => ({
        ...o,
        sender_name: profileMap.get(o.client_id) || "Expéditeur",
      })));
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || parcels.length === 0) return null;

  const activeCount = parcels.filter(p => !["delivered", "released"].includes(p.status)).length;

  return (
    <>
      {/* Main Stat Card */}
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
            {/* Icon */}
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

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-violet-500/20 text-violet-600">
                  📦 Pour vous
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

            {/* Arrow */}
            <motion.div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center">
              <Eye className="w-4 h-4 text-violet-600" />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Detail Sheet */}
      <AnimatePresence>
        {selectedParcel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <RecipientParcelDetails
              parcels={parcels}
              onClose={() => setSelectedParcel(null)}
              navigate={navigate}
            />
          </motion.div>
        )}
      </AnimatePresence>
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
  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="h-full flex flex-col bg-background"
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {parcels.map((parcel, i) => {
          const statusInfo = STATUS_MAP[parcel.status] || { label: parcel.status, color: "bg-muted text-muted-foreground", icon: Clock };
          const StatusIcon = statusInfo.icon;
          
          return (
            <motion.div
              key={parcel.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-2xl p-4 space-y-3"
            >
              {/* Route */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <StatusIcon className="w-4 h-4 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold">{parcel.origin_city}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-violet-500" />
                    <span className="text-sm font-bold">{parcel.destination_city}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${statusInfo.color}`}>
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full bg-current"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    {statusInfo.label}
                  </span>
                </div>
              </div>

              {/* Details */}
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

              {/* Order number */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>#{parcel.order_number?.slice(-8)}</span>
                <span>{new Date(parcel.created_at).toLocaleDateString('fr-FR')}</span>
              </div>

              {/* Track button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  onClose();
                  navigate(`/tracking?order=${parcel.id}`);
                }}
              >
                <MapPin className="w-3 h-3 mr-1.5" />
                Suivre ce colis
              </Button>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
