import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Package, MessageCircle, ArrowRight, Heart, 
  Star, Clock, History, Truck, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LoggedInHomeDashboardProps {
  userName?: string;
  recentOrders?: any[];
  favoriteTransporters?: any[];
  unreadMessages?: number;
}

export function LoggedInHomeDashboard({
  userName,
  recentOrders = [],
  favoriteTransporters = [],
  unreadMessages = 0,
}: LoggedInHomeDashboardProps) {
  const firstName = userName?.split(' ')[0] || 'Utilisateur';
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Bonjour' : currentHour < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div className="space-y-6">
      {/* Personalized Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-xl font-bold text-foreground">
          {greeting}, <span className="text-primary">{firstName}</span> 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Que souhaitez-vous faire aujourd'hui ?
        </p>
      </motion.div>

      {/* Quick Actions Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3"
      >
        <Link to="/demande" className="block">
          <Card className="hover:border-primary/50 transition-all hover:shadow-lg active:scale-[0.98]">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">Envoyer un colis</h3>
              <p className="text-xs text-muted-foreground mt-1">Nouvelle demande</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/offres" className="block">
          <Card className="hover:border-primary/50 transition-all hover:shadow-lg active:scale-[0.98]">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-3">
                <MapPin className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-semibold text-sm">Voir les offres</h3>
              <p className="text-xs text-muted-foreground mt-1">Transporteurs dispo</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/messages" className="block relative">
          <Card className="hover:border-primary/50 transition-all hover:shadow-lg active:scale-[0.98]">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-3 relative">
                <MessageCircle className="w-6 h-6 text-green-600" />
                {unreadMessages > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center text-[10px] bg-red-500 text-white border-0">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-sm">Messages</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {unreadMessages > 0 ? `${unreadMessages} non lu${unreadMessages > 1 ? 's' : ''}` : 'Discussions'}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/client/dashboard" className="block">
          <Card className="hover:border-primary/50 transition-all hover:shadow-lg active:scale-[0.98]">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
                <History className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="font-semibold text-sm">Mes commandes</h3>
              <p className="text-xs text-muted-foreground mt-1">Suivi & historique</p>
            </CardContent>
          </Card>
        </Link>
      </motion.div>

      {/* Recent Orders Preview */}
      {recentOrders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Dernières commandes
                </CardTitle>
                <Link to="/client/dashboard" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Tout voir <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentOrders.slice(0, 3).map((order, index) => (
                <div key={order.id || index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{order.origin_city} → {order.destination_city}</p>
                      <p className="text-xs text-muted-foreground">{order.weight} kg</p>
                    </div>
                  </div>
                  <Badge variant={
                    order.status === 'delivered' ? 'default' : 
                    order.status === 'in_transit' ? 'secondary' : 
                    'outline'
                  } className="text-xs">
                    {order.status === 'delivered' ? 'Livré' :
                     order.status === 'in_transit' ? 'En transit' :
                     order.status === 'pending' ? 'En attente' : order.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Favorite Transporters */}
      {favoriteTransporters.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  Transporteurs favoris
                </CardTitle>
                <Link to="/favoris/transporteurs" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Tout voir <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {favoriteTransporters.slice(0, 4).map((gp, index) => (
                  <Link key={gp.id || index} to={`/transporter/${gp.id}`} className="flex-shrink-0">
                    <div className="w-20 flex flex-col items-center p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-2">
                        <Truck className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-xs font-medium text-center truncate w-full">{gp.business_name}</p>
                      <div className="flex items-center gap-0.5 mt-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-[10px] text-muted-foreground">{gp.rating || 'N/A'}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty State CTA if no recent activity */}
      {recentOrders.length === 0 && favoriteTransporters.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <Package className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Commencez votre premier envoi</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Trouvez un transporteur et envoyez vos colis partout dans le monde
              </p>
              <div className="flex gap-3 justify-center">
                <Link to="/demande">
                  <Button>
                    Envoyer un colis
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/offres">
                  <Button variant="outline">
                    Voir les offres
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
