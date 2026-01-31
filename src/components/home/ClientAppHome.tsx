import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { 
  Package, MessageCircle, MapPin, History, 
  Bell, Heart, ArrowRight, Clock, ChevronDown, 
  Phone, Navigation, User, ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  activeOrdersCount = 0,
}: ClientAppHomeProps) {
  const navigate = useNavigate();
  const firstName = userName?.split(' ')[0] || 'Bienvenue';
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Bonjour' : currentHour < 18 ? 'Bon après-midi' : 'Bonsoir';
  
  // Track which orders are expanded
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Get ALL active orders
  const activeOrders = recentOrders.filter(o => 
    ['pending', 'accepted', 'collected', 'in_transit'].includes(o.status)
  );
  
  const toggleOrder = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };
  
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'in_transit':
        return { label: 'En transit', color: 'bg-blue-500/20 text-blue-600', icon: MapPin };
      case 'collected':
        return { label: 'Collecté', color: 'bg-amber-500/20 text-amber-600', icon: Package };
      case 'accepted':
        return { label: 'Accepté', color: 'bg-green-500/20 text-green-600', icon: User };
      default:
        return { label: 'En attente', color: 'bg-primary/20 text-primary', icon: Clock };
    }
  };

  return (
    <div 
      className="flex flex-col overflow-hidden"
      style={{
        height: 'calc(100vh - 60px - 64px - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
        minHeight: '400px'
      }}
    >
      {/* Greeting Section - Compact */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 pt-3 pb-2"
      >
        <h1 className="text-lg font-bold text-foreground">
          {greeting}, <span className="text-primary">{firstName}</span> 👋
        </h1>
      </motion.div>

      {/* Active Orders List - Expandable */}
      {activeOrders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-4 mb-3 space-y-2 max-h-[40vh] overflow-y-auto"
        >
          {activeOrders.map((order, index) => {
            const isExpanded = expandedOrders.has(order.id);
            const statusInfo = getStatusInfo(order.status);
            const StatusIcon = statusInfo.icon;
            
            // Determine what info is released based on status
            const isAccepted = ['accepted', 'collected', 'in_transit', 'delivered'].includes(order.status);
            const isDelivered = order.status === 'delivered';
            
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-secondary/5 to-primary/10 border border-primary/20 rounded-2xl shadow-md"
              >
                {/* Main Card - Clickable to expand */}
                <motion.div 
                  onClick={() => toggleOrder(order.id)}
                  whileTap={{ scale: 0.99 }}
                  className="p-3 flex items-center gap-3 cursor-pointer"
                >
                  {/* Status Icon */}
                  <div className="relative">
                    <motion.div 
                      className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm"
                      animate={isExpanded ? {} : { 
                        boxShadow: [
                          "0 0 0 0 rgba(var(--primary), 0.3)",
                          "0 0 0 6px rgba(var(--primary), 0)",
                        ]
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <StatusIcon className="w-5 h-5 text-white" />
                    </motion.div>
                    <motion.div 
                      className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
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
                        <motion.span 
                          className="w-1.5 h-1.5 rounded-full bg-current"
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                        {statusInfo.label}
                      </span>
                      {order.weight && (
                        <span className="text-xs text-muted-foreground">{order.weight} kg</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Expand Arrow */}
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
                  >
                    <ChevronDown className="w-4 h-4 text-primary" />
                  </motion.div>
                </motion.div>
                
                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-1 border-t border-primary/10 space-y-2">
                        {/* Contact Info - Only if accepted */}
                        {isAccepted ? (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              {/* Adresse de dépôt */}
                              <motion.div 
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 }}
                                className="bg-background/60 rounded-lg p-2"
                              >
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Dépôt</p>
                                <div className="flex items-center gap-1.5">
                                  <Navigation className="w-3.5 h-3.5 text-primary" />
                                  <p className="text-xs font-medium text-foreground truncate">Adresse disponible</p>
                                </div>
                              </motion.div>
                              
                              {/* WhatsApp */}
                              <motion.div 
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-background/60 rounded-lg p-2"
                              >
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Contact</p>
                                <div className="flex items-center gap-1.5">
                                  <Phone className="w-3.5 h-3.5 text-green-600" />
                                  <p className="text-xs font-medium text-foreground">WhatsApp GP</p>
                                </div>
                              </motion.div>
                            </div>
                            
                            {/* Adresse réception - Only if delivered */}
                            {isDelivered && (
                              <motion.div 
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                                className="bg-background/60 rounded-lg p-2"
                              >
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Réception</p>
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-secondary" />
                                  <p className="text-xs font-medium text-foreground">Adresse de réception</p>
                                </div>
                              </motion.div>
                            )}
                          </>
                        ) : (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-amber-500/10 rounded-lg p-2 text-center"
                          >
                            <p className="text-xs text-amber-700">
                              Les coordonnées seront disponibles après acceptation
                            </p>
                          </motion.div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-1">
                          <Link 
                            to={`/tracking?order=${order.id}`}
                            className="flex-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              className="w-full py-2 px-3 bg-primary text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              Suivi détaillé
                            </motion.button>
                          </Link>
                          <Link 
                            to={`/booking/confirmation/${order.id}`}
                            className="flex-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              className="w-full py-2 px-3 bg-secondary/20 text-secondary rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Détails
                            </motion.button>
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Primary Actions - 2x2 Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-2 gap-3 px-4 flex-1"
      >
        {/* Envoyer un colis - Primary CTA → Universal selector */}
        <Link to="/envoyer" className="block">
          <motion.div 
            whileTap={{ scale: 0.97 }}
            className="h-full bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg"
            style={{ minHeight: '120px' }}
          >
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
          <motion.div 
            whileTap={{ scale: 0.97 }}
            className="h-full bg-card border-2 border-border rounded-2xl p-4 flex flex-col justify-between hover:border-primary/30 transition-colors"
            style={{ minHeight: '120px' }}
          >
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
          <motion.div 
            whileTap={{ scale: 0.97 }}
            className="h-full bg-card border-2 border-border rounded-2xl p-4 flex flex-col justify-between hover:border-primary/30 transition-colors relative"
            style={{ minHeight: '120px' }}
          >
            {unreadMessages > 0 && (
              <Badge className="absolute top-2 right-2 h-5 min-w-[20px] bg-red-500 text-white border-0 text-[10px]">
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </Badge>
            )}
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

        {/* Mes envois */}
        <Link to="/client/dashboard" className="block">
          <motion.div 
            whileTap={{ scale: 0.97 }}
            className="h-full bg-card border-2 border-border rounded-2xl p-4 flex flex-col justify-between hover:border-primary/30 transition-colors relative"
            style={{ minHeight: '120px' }}
          >
            {activeOrdersCount > 0 && (
              <Badge className="absolute top-2 right-2 h-5 min-w-[20px] bg-amber-500 text-white border-0 text-[10px]">
                {activeOrdersCount}
              </Badge>
            )}
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
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex gap-2 px-4 py-3 mt-auto"
      >
        <Link to="/favorites" className="flex-1">
          <motion.div 
            whileTap={{ scale: 0.97 }}
            className="bg-muted/50 rounded-xl p-3 flex items-center justify-center gap-2"
          >
            <Heart className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-foreground">Favoris</span>
          </motion.div>
        </Link>
        <Link to="/alerts" className="flex-1">
          <motion.div 
            whileTap={{ scale: 0.97 }}
            className="bg-muted/50 rounded-xl p-3 flex items-center justify-center gap-2"
          >
            <Bell className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-foreground">Alertes</span>
          </motion.div>
        </Link>
        <Link to="/tracking" className="flex-1">
          <motion.div 
            whileTap={{ scale: 0.97 }}
            className="bg-muted/50 rounded-xl p-3 flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4 text-secondary" />
            <span className="text-xs font-medium text-foreground">Suivi</span>
          </motion.div>
        </Link>
      </motion.div>
    </div>
  );
}
