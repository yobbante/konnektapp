import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Package, MessageCircle, MapPin, History, Bell, Heart, ArrowRight, Clock, ChevronDown, Phone, Navigation, User, ExternalLink, X, AlertTriangle, Truck, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
interface ClientAppHomeProps {
  userName?: string;
  recentOrders?: any[];
  unreadMessages?: number;
  activeOrdersCount?: number;
}
export function ClientAppHome({
  userName,
  recentOrders = [],
  unreadMessages = 0,
  activeOrdersCount = 0
}: ClientAppHomeProps) {
  const navigate = useNavigate();
  const firstName = userName?.split(' ')[0] || 'Bienvenue';
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Bonjour' : currentHour < 18 ? 'Bon après-midi' : 'Bonsoir';

  // Track which order is in full-screen mode
  const [fullScreenOrderId, setFullScreenOrderId] = useState<string | null>(null);

  // Get ALL active orders
  const activeOrders = recentOrders.filter(o => ['pending', 'accepted', 'collected', 'in_transit'].includes(o.status));
  const openFullScreen = (orderId: string) => {
    setFullScreenOrderId(orderId);
  };
  const closeFullScreen = () => {
    setFullScreenOrderId(null);
  };
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'in_transit':
        return {
          label: 'En transit',
          color: 'bg-blue-500/20 text-blue-600',
          icon: Truck
        };
      case 'collected':
        return {
          label: 'Collecté',
          color: 'bg-amber-500/20 text-amber-600',
          icon: Package
        };
      case 'accepted':
        return {
          label: 'Accepté',
          color: 'bg-green-500/20 text-green-600',
          icon: User
        };
      default:
        return {
          label: 'En attente',
          color: 'bg-primary/20 text-primary',
          icon: Clock
        };
    }
  };
  const selectedOrder = fullScreenOrderId ? activeOrders.find(o => o.id === fullScreenOrderId) : null;
  return <div className="flex flex-col overflow-hidden relative" style={{
    height: 'calc(100vh - 60px - 64px - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
    minHeight: '400px'
  }}>
      {/* Full-Screen Order Details Overlay */}
      <AnimatePresence>
        {selectedOrder && <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} className="fixed inset-0 z-50 bg-background" style={{
        paddingTop: 'env(safe-area-inset-top)'
      }}>
            <FullScreenOrderDetails order={selectedOrder} onClose={closeFullScreen} navigate={navigate} />
          </motion.div>}
      </AnimatePresence>

      {/* Greeting Section - Compact */}
      <motion.div initial={{
      opacity: 0,
      y: -10
    }} animate={{
      opacity: 1,
      y: 0
    }} className="px-4 pt-3 pb-2">
        <h1 className="text-lg font-bold text-foreground">
          {greeting}, <span className="text-primary">{firstName}</span> 👋
        </h1>
      </motion.div>

      {/* Active Orders List - Clickable Cards */}
      {activeOrders.length > 0 && <motion.div initial={{
      opacity: 0,
      y: -10
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      delay: 0.1
    }} className="mx-4 mb-3 space-y-2 max-h-[35vh] overflow-y-auto">
          {activeOrders.map((order, index) => {
        const statusInfo = getStatusInfo(order.status);
        const StatusIcon = statusInfo.icon;
        return <motion.div key={order.id} initial={{
          opacity: 0,
          x: -20
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          delay: index * 0.05
        }} onClick={() => openFullScreen(order.id)} className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-secondary/5 to-primary/10 border border-primary/20 rounded-2xl shadow-md cursor-pointer active:scale-[0.98] transition-transform">
                <motion.div whileTap={{
            scale: 0.99
          }} className="p-3 flex items-center gap-3">
                  {/* Status Icon */}
                  <div className="relative">
                    <motion.div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm" animate={{
                boxShadow: ["0 0 0 0 rgba(var(--primary), 0.3)", "0 0 0 6px rgba(var(--primary), 0)"]
              }} transition={{
                duration: 1.5,
                repeat: Infinity
              }}>
                      <StatusIcon className="w-5 h-5 text-white" />
                    </motion.div>
                    <motion.div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" animate={{
                scale: [1, 1.2, 1]
              }} transition={{
                duration: 1,
                repeat: Infinity
              }} />
                  </div>
                  
                  {/* Order Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-sm font-bold text-foreground truncate">
                        {order.origin_city}
                      </p>
                      <ArrowRight className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <p className="text-sm font-bold text-foreground truncate">
                        {order.destination_city}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        <motion.span className="w-1.5 h-1.5 rounded-full bg-current" animate={{
                    opacity: [1, 0.5, 1]
                  }} transition={{
                    duration: 1,
                    repeat: Infinity
                  }} />
                        {statusInfo.label}
                      </span>
                      {order.weight && <span className="text-xs text-muted-foreground">{order.weight} kg</span>}
                    </div>
                  </div>
                  
                  {/* Tap indicator */}
                  <motion.div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <ChevronDown className="w-4 h-4 text-primary" />
                  </motion.div>
                </motion.div>
              </motion.div>;
      })}
        </motion.div>}

      {/* Primary Actions - 2x2 Grid */}
      <motion.div initial={{
      opacity: 0,
      y: 10
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      delay: 0.15
    }} className="grid grid-cols-2 gap-3 px-4 flex-1">
        {/* Envoyer un colis - Primary CTA → Universal selector */}
        <Link to="/envoyer" className="block">
          <motion.div whileTap={{
          scale: 0.97
        }} className="h-full bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg" style={{
          minHeight: '120px'
        }}>
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Envoyer</h3>
              <p className="text-white/70 text-xs">Nouveau colis</p>
            </div>
          </motion.div>
        </Link>

        {/* Voir les offres */}
        <Link to="/offres" className="block">
          <motion.div whileTap={{
          scale: 0.97
        }} className="h-full bg-card border-2 border-border rounded-2xl p-4 flex flex-col justify-between hover:border-primary/30 transition-colors" style={{
          minHeight: '120px'
        }}>
            <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Offres</h3>
              <p className="text-muted-foreground text-xs">Transporteurs</p>
            </div>
          </motion.div>
        </Link>

        {/* Messages */}
        <Link to="/messages" className="block">
          <motion.div whileTap={{
          scale: 0.97
        }} className="h-full bg-card border-2 border-border rounded-2xl p-4 flex flex-col justify-between hover:border-primary/30 transition-colors relative" style={{
          minHeight: '120px'
        }}>
            {unreadMessages > 0 && <Badge className="absolute top-2 right-2 h-5 min-w-[20px] bg-red-500 text-white border-0 text-[10px]">
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </Badge>}
            <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Messages</h3>
              <p className="text-muted-foreground text-xs">
                {unreadMessages > 0 ? `${unreadMessages} non lu${unreadMessages > 1 ? 's' : ''}` : 'Discussions'}
              </p>
            </div>
          </motion.div>
        </Link>

        {/* Mes envois - Redirect to full history page */}
        <Link to="/historique" className="block">
          <motion.div whileTap={{
          scale: 0.97
        }} className="h-full bg-card border-2 border-border rounded-2xl p-4 flex flex-col justify-between hover:border-primary/30 transition-colors relative" style={{
          minHeight: '120px'
        }}>
            {activeOrdersCount > 0 && <Badge className="absolute top-2 right-2 h-5 min-w-[20px] bg-amber-500 text-white border-0 text-[10px]">
                {activeOrdersCount}
              </Badge>}
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <History className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Mes envois</h3>
              <p className="text-muted-foreground text-xs">Suivi & historique</p>
            </div>
          </motion.div>
        </Link>
      </motion.div>

      {/* Quick Links Row */}
      <motion.div initial={{
      opacity: 0,
      y: 10
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      delay: 0.25
    }} className="flex gap-2 px-4 py-3 mt-auto">
        <Link to="/favorites" className="flex-1">
          <motion.div whileTap={{
          scale: 0.97
        }} className="bg-muted/50 rounded-xl p-3 flex items-center justify-center gap-2">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-foreground">Favoris</span>
          </motion.div>
        </Link>
        <Link to="/alerts" className="flex-1">
          <motion.div whileTap={{
          scale: 0.97
        }} className="bg-muted/50 rounded-xl p-3 flex items-center justify-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-foreground">Alertes</span>
          </motion.div>
        </Link>
        <Link to="/tracking" className="flex-1">
          <motion.div whileTap={{
          scale: 0.97
        }} className="bg-muted/50 rounded-xl p-3 flex items-center justify-center gap-2">
            <MapPin className="w-4 h-4 text-secondary" />
            <span className="text-xs font-medium text-foreground">Suivi</span>
          </motion.div>
        </Link>
      </motion.div>
    </div>;
}

// Full-Screen Order Details Component
interface FullScreenOrderDetailsProps {
  order: any;
  onClose: () => void;
  navigate: (path: string) => void;
}
function FullScreenOrderDetails({
  order,
  onClose,
  navigate
}: FullScreenOrderDetailsProps) {
  const statusInfo = getStatusInfoFull(order.status);
  const StatusIcon = statusInfo.icon;

  // Determine what info is released based on status
  const isAccepted = ['accepted', 'collected', 'in_transit', 'delivered'].includes(order.status);
  const isCollected = ['collected', 'in_transit', 'delivered'].includes(order.status);
  const isDelivered = order.status === 'delivered';
  return <motion.div initial={{
    y: "100%"
  }} animate={{
    y: 0
  }} exit={{
    y: "100%"
  }} transition={{
    type: "spring",
    damping: 25,
    stiffness: 300
  }} className="h-full flex flex-col bg-background">
      {/* Header with close button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <motion.div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center" animate={{
          scale: [1, 1.05, 1]
        }} transition={{
          duration: 2,
          repeat: Infinity
        }}>
            <StatusIcon className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <h2 className="font-bold text-foreground">Commande #{order.order_number?.slice(-6) || 'N/A'}</h2>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Route Card */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.1
        }} className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-4">
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

          {/* Order Details Grid */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.15
        }} className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Poids</p>
              <p className="font-bold text-lg">{order.weight || 0} kg</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Prix total</p>
              <p className="font-bold text-lg text-primary">{order.total_price?.toLocaleString() || 0} {order.currency}</p>
            </div>
            {order.pickup_date && <div className="bg-card border border-border rounded-xl p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="w-3 h-3" />
                  <p className="text-xs">Date de collecte</p>
                </div>
                <p className="font-medium text-sm">{new Date(order.pickup_date).toLocaleDateString('fr-FR')}</p>
              </div>}
            {order.insurance_amount && <div className="bg-card border border-border rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">Assurance</p>
                <p className="font-medium text-sm">{order.insurance_amount.toLocaleString()} FCFA</p>
              </div>}
          </motion.div>

          {/* Contact Info - Progressive release */}
          {isAccepted ? <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.2
        }} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 border-b border-border">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
                  <User className="w-4 h-4" />
                  Contact Transporteur
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {/* Dépôt Address */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Navigation className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Adresse de dépôt</p>
                    <p className="font-medium text-sm text-foreground">
                      {order.gp_deposit_address || "Adresse disponible après acceptation"}
                    </p>
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">WhatsApp GP</p>
                    <p className="font-medium text-sm text-foreground">
                      {order.gp_whatsapp || "Contact disponible"}
                    </p>
                  </div>
                </div>

                {/* Reception Address - Only after delivery */}
                {isDelivered && <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Adresse de réception</p>
                      <p className="font-medium text-sm text-foreground">
                        {order.gp_reception_address || "Adresse de destination"}
                      </p>
                    </div>
                  </div>}
              </div>
            </motion.div> : <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.2
        }} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-400 text-sm">En attente de confirmation</p>
                  <p className="text-xs text-amber-700 dark:text-amber-500">
                    Les coordonnées du transporteur seront disponibles après acceptation
                  </p>
                </div>
              </div>
            </motion.div>}

          {/* Content Nature if available */}
          {order.content_nature && order.content_nature.length > 0 && <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.25
        }} className="bg-card border border-border rounded-2xl p-4">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                Nature du contenu
              </h3>
              <div className="flex flex-wrap gap-2">
                {order.content_nature.map((item: string, i: number) => <Badge key={i} variant="secondary" className="text-xs">
                    {item}
                  </Badge>)}
              </div>
            </motion.div>}
        </div>
      </div>

      {/* Action Buttons - Fixed at bottom */}
      <div className="p-4 border-t border-border bg-card space-y-2 px-px mx-0 my-[50px]" style={{
      paddingBottom: 'calc(16px + env(safe-area-inset-bottom))'
    }}>
        <div className="flex gap-2">
          <Button className="flex-1 gap-2" onClick={() => {
          onClose();
          navigate(`/tracking?order=${order.id}`);
        }}>
            <MapPin className="w-4 h-4" />
            Suivi détaillé
          </Button>
          <Button variant="outline" className="flex-1 gap-2" onClick={() => {
          onClose();
          navigate(`/messages`);
        }}>
            <MessageCircle className="w-4 h-4" />
            Contacter
          </Button>
        </div>
        <Button variant="ghost" className="w-full" onClick={() => {
        onClose();
        navigate(`/booking/confirmation/${order.id}`);
      }}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Voir la confirmation complète
        </Button>
      </div>
    </motion.div>;
}
function getStatusInfoFull(status: string) {
  switch (status) {
    case 'in_transit':
      return {
        label: 'En transit',
        color: 'bg-blue-500/20 text-blue-600',
        icon: Truck
      };
    case 'collected':
      return {
        label: 'Collecté',
        color: 'bg-amber-500/20 text-amber-600',
        icon: Package
      };
    case 'accepted':
      return {
        label: 'Accepté',
        color: 'bg-green-500/20 text-green-600',
        icon: User
      };
    case 'delivered':
      return {
        label: 'Livré',
        color: 'bg-green-500/20 text-green-700',
        icon: Package
      };
    default:
      return {
        label: 'En attente',
        color: 'bg-primary/20 text-primary',
        icon: Clock
      };
  }
}