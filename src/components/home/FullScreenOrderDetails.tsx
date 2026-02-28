import { motion } from "framer-motion";
import { Package, MapPin, ArrowRight, X, AlertTriangle, Truck, Calendar, Clock, Phone, Navigation, User, ExternalLink, TruckIcon, MessageCircle, Sparkles, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DepositAddressPopup } from "@/components/client/DepositAddressPopup";
import QRCode from "react-qr-code";

interface FullScreenOrderDetailsProps {
  order: any;
  onClose: () => void;
  navigate: (path: string) => void;
}

function getStatusInfoFull(status: string) {
  switch (status) {
    case 'pending': return { label: 'En attente', color: 'bg-amber-500/20 text-amber-600', icon: Clock };
    case 'accepted': return { label: 'Accepté', color: 'bg-green-500/20 text-green-600', icon: User };
    case 'paid_held': return { label: 'Paiement reçu', color: 'bg-emerald-500/20 text-emerald-600', icon: Package };
    case 'checked_in': return { label: 'Déposé', color: 'bg-indigo-500/20 text-indigo-600', icon: Package };
    case 'weight_pending_payment': return { label: 'Supplément requis', color: 'bg-orange-500/20 text-orange-600', icon: AlertTriangle };
    case 'collected': return { label: 'Collecté', color: 'bg-blue-500/20 text-blue-600', icon: Package };
    case 'scheduled_departure': return { label: 'Départ programmé', color: 'bg-violet-500/20 text-violet-600', icon: Calendar };
    case 'in_transit': return { label: 'En transit', color: 'bg-blue-500/20 text-blue-600', icon: Truck };
    case 'arrived_destination': return { label: 'Arrivé', color: 'bg-teal-500/20 text-teal-600', icon: MapPin };
    case 'delivery_pending': return { label: 'Livraison en cours', color: 'bg-cyan-500/20 text-cyan-600', icon: Truck };
    case 'delivery_confirmed': return { label: 'Livraison confirmée', color: 'bg-green-500/20 text-green-600', icon: Package };
    case 'delivered': return { label: 'Livré', color: 'bg-green-500/20 text-green-700', icon: Package };
    case 'released': return { label: 'Finalisé', color: 'bg-green-600/20 text-green-700', icon: Sparkles };
    case 'cancelled': return { label: 'Annulé', color: 'bg-destructive/20 text-destructive', icon: X };
    default: return { label: status, color: 'bg-muted text-muted-foreground', icon: Clock };
  }
}

export function FullScreenOrderDetails({ order, onClose, navigate }: FullScreenOrderDetailsProps) {
  const statusInfo = getStatusInfoFull(order.status);
  const StatusIcon = statusInfo.icon;
  const isAccepted = ['accepted', 'paid_held', 'checked_in', 'collected', 'weight_pending_payment', 'scheduled_departure', 'in_transit', 'arrived_destination', 'delivery_pending', 'delivery_confirmed', 'delivered', 'released'].includes(order.status);
  const isCollected = ['checked_in', 'collected', 'weight_pending_payment', 'scheduled_departure', 'in_transit', 'arrived_destination', 'delivery_pending', 'delivery_confirmed', 'delivered', 'released'].includes(order.status);
  const isDelivered = ['delivered', 'released'].includes(order.status);
  const hasPickup = order.logistics_options?.pickup_enabled || false;
  const hasDelivery = order.logistics_options?.delivery_enabled || false;

  return (
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <motion.div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}>
            <StatusIcon className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <h2 className="font-bold text-foreground">Commande #{order.order_number?.slice(-6) || 'N/A'}</h2>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAccepted && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="cursor-pointer" onClick={() => navigate(`/order/${order.id}/qrcode`)}>
              <div className="w-9 h-9 bg-white/90 backdrop-blur-sm rounded-xl p-1 shadow-md border border-primary/20">
                <QRCode value={order.order_number || order.id} size={28} level="L" style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
              </div>
            </motion.div>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full"><X className="w-5 h-5" /></Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Départ</p>
                <p className="font-bold text-lg text-foreground">{order.origin_city}</p>
                <p className="text-xs text-muted-foreground">{order.origin_country}</p>
              </div>
              <div className="flex flex-col items-center">
                <Truck className="w-5 h-5 text-primary mb-1" />
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Arrivée</p>
                <p className="font-bold text-lg text-foreground">{order.destination_city}</p>
                <p className="text-xs text-muted-foreground">{order.destination_country}</p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Poids</p>
              <p className="font-bold text-lg">{order.weight || 0} kg</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Prix total</p>
              <p className="font-bold text-lg text-primary">{order.total_price?.toLocaleString() || 0} {order.currency}</p>
            </div>
            {order.pickup_date && (
              <div className="bg-card border border-border rounded-xl p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1"><Calendar className="w-3 h-3" /><p className="text-xs">Date de collecte</p></div>
                <p className="font-medium text-sm">{new Date(order.pickup_date).toLocaleDateString('fr-FR')}</p>
              </div>
            )}
          </motion.div>
          {isAccepted ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 border-b border-border">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-green-700 dark:text-green-400"><User className="w-4 h-4" />Contact Transporteur</h3>
              </div>
              <div className="p-4 space-y-3">
                {hasPickup ? (
                  <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0"><TruckIcon className="w-4 h-4 text-blue-600" /></div>
                    <div className="flex-1">
                      <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide font-medium">Enlèvement Konnekt</p>
                      <p className="font-medium text-sm text-blue-800 dark:text-blue-200">Un livreur viendra récupérer votre colis</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">📍 {order.logistics_options?.pickup_address || "Adresse configurée"}</p>
                    </div>
                  </div>
                ) : !isCollected ? (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Navigation className="w-4 h-4 text-primary" /></div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Adresse de dépôt</p>
                      <p className="font-medium text-sm text-foreground">{order.gp_deposit_address || "Disponible après acceptation"}</p>
                    </div>
                    {order.gp_deposit_address && <DepositAddressPopup depositAddress={order.gp_deposit_address} phone={order.gp_whatsapp} whatsapp={order.gp_whatsapp} gpName="Transporteur" isActive={order.status === "accepted"} />}
                  </div>
                ) : (
                  <div className="flex items-start gap-3 bg-muted/30 p-3 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0"><Package className="w-4 h-4 text-green-600" /></div>
                    <div className="flex-1">
                      <p className="text-xs text-green-600 uppercase tracking-wide font-medium">Colis déposé ✓</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Votre colis est entre les mains du transporteur</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0"><Phone className="w-4 h-4 text-green-600" /></div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">WhatsApp GP</p>
                    <p className="font-medium text-sm text-foreground">{order.gp_whatsapp || "Contact disponible"}</p>
                  </div>
                </div>
                {hasDelivery ? (
                  <div className="flex items-start gap-3 bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0"><TruckIcon className="w-4 h-4 text-purple-600" /></div>
                    <div className="flex-1">
                      <p className="text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wide font-medium">Livraison Konnekt</p>
                      <p className="font-medium text-sm text-purple-800 dark:text-purple-200">Un livreur livrera votre colis</p>
                      {isDelivered && <p className="text-xs text-purple-600 mt-1">📍 {order.logistics_options?.delivery_address || "Adresse configurée"}</p>}
                      {!isDelivered && <p className="text-xs text-purple-500 mt-1 italic">Adresse visible après livraison</p>}
                    </div>
                  </div>
                ) : (
                  <>
                    {isDelivered && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0"><MapPin className="w-4 h-4 text-secondary" /></div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Adresse de réception</p>
                          <p className="font-medium text-sm text-foreground">{order.gp_reception_address || "Adresse de destination"}</p>
                        </div>
                      </div>
                    )}
                    {!isDelivered && (
                      <div className="flex items-start gap-3 opacity-60">
                        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0"><MapPin className="w-4 h-4 text-muted-foreground" /></div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Adresse de réception</p>
                          <p className="text-xs text-muted-foreground italic">Disponible après livraison</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-400 text-sm">En attente de confirmation</p>
                  <p className="text-xs text-amber-700 dark:text-amber-500">Les coordonnées seront disponibles après acceptation</p>
                </div>
              </div>
            </motion.div>
          )}
          {order.content_nature && order.content_nature.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-card border border-border rounded-2xl p-4">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><Package className="w-4 h-4 text-muted-foreground" />Nature du contenu</h3>
              <div className="flex flex-wrap gap-2">
                {order.content_nature.map((item: string, i: number) => <Badge key={i} variant="secondary" className="text-xs">{item}</Badge>)}
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <div className="p-4 border-t border-border bg-card space-y-2 mb-[51px]" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
        <div className="flex gap-2">
          <Button className="flex-1 gap-2" onClick={() => { onClose(); navigate(`/tracking?order=${order.id}`); }}>
            <MapPin className="w-4 h-4" />Suivi détaillé
          </Button>
          <Button variant="outline" className="flex-1 gap-2" onClick={() => { onClose(); navigate(`/messages`); }}>
            <MessageCircle className="w-4 h-4" />Contacter
          </Button>
        </div>
        <Button variant="ghost" className="w-full" onClick={() => { onClose(); navigate(`/booking/confirmation/${order.id}`); }}>
          <ExternalLink className="w-4 h-4 mr-2" />Voir la confirmation complète
        </Button>
      </div>
    </motion.div>
  );
}
