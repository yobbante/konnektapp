import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { 
  Package, MessageCircle, MapPin, History, 
  Bell, Heart, ArrowRight, Star, Clock
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

  // Get the most recent active order for quick access
  const activeOrder = recentOrders.find(o => 
    ['pending', 'accepted', 'collected', 'in_transit'].includes(o.status)
  );

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

      {/* Active Order Banner - Interactive */}
      {activeOrder && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="mx-4 mb-3"
        >
          <Link to={`/tracking?order=${activeOrder.id}`}>
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative overflow-hidden bg-gradient-to-r from-primary/15 via-secondary/10 to-primary/15 border border-primary/30 rounded-2xl p-4 flex items-center gap-4 shadow-lg shadow-primary/10"
            >
              {/* Animated background pulse */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent"
                animate={{ 
                  x: ['-100%', '100%'],
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
              />
              
              {/* Status indicator with pulse */}
              <div className="relative">
                <motion.div 
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md"
                  animate={{ 
                    boxShadow: [
                      "0 0 0 0 rgba(var(--primary), 0.4)",
                      "0 0 0 8px rgba(var(--primary), 0)",
                    ]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {activeOrder.status === 'in_transit' ? (
                    <MapPin className="w-6 h-6 text-white" />
                  ) : activeOrder.status === 'collected' ? (
                    <Package className="w-6 h-6 text-white" />
                  ) : (
                    <Clock className="w-6 h-6 text-white" />
                  )}
                </motion.div>
                {/* Live indicator dot */}
                <motion.div 
                  className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </div>
              
              <div className="flex-1 min-w-0 relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold text-foreground truncate">
                    {activeOrder.origin_city}
                  </p>
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />
                  </motion.div>
                  <p className="text-sm font-bold text-foreground truncate">
                    {activeOrder.destination_city}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    activeOrder.status === 'in_transit' 
                      ? 'bg-blue-500/20 text-blue-600' 
                      : activeOrder.status === 'collected'
                      ? 'bg-amber-500/20 text-amber-600'
                      : 'bg-primary/20 text-primary'
                  }`}>
                    <motion.span 
                      className="w-1.5 h-1.5 rounded-full bg-current"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    {activeOrder.status === 'in_transit' ? 'En transit' : 
                     activeOrder.status === 'collected' ? 'Collecté' :
                     activeOrder.status === 'accepted' ? 'Accepté' : 'En attente'}
                  </span>
                  {activeOrder.weight && (
                    <span className="text-xs text-muted-foreground">
                      {activeOrder.weight} kg
                    </span>
                  )}
                </div>
              </div>
              
              {/* CTA Arrow */}
              <motion.div 
                className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center relative z-10"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="w-4 h-4 text-primary" />
              </motion.div>
            </motion.div>
          </Link>
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
