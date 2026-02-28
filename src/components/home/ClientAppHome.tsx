import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Package, MessageCircle, MapPin, History, Heart, ArrowRight, Clock, ChevronDown, Phone, Navigation, User, ExternalLink, X, AlertTriangle, Truck, Calendar, FileText, Home as HomeIcon, Sparkles, Info, Eye, TruckIcon, QrCode, Search, Plane, Ship, Car, Luggage, Star, ChevronRight, Shield, Wallet, Globe, Zap, Award, TrendingUp } from "lucide-react";
import { RecipientTrackingCard } from "@/components/client/RecipientTrackingCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { WeightValidationAlert } from "@/components/client/WeightValidationAlert";
import { DepositAddressPopup } from "@/components/client/DepositAddressPopup";
import { supabase } from "@/integrations/supabase/client";
import { WORLD_CITIES, FEATURED_CITIES } from "@/components/gp/SearchableCitySelect";
import QRCode from "react-qr-code";

interface ClientAppHomeProps {
  userName?: string;
  recentOrders?: any[];
  customRequests?: any[];
  movingRequests?: any[];
  unreadMessages?: number;
  activeOrdersCount?: number;
  userId?: string;
  userCity?: string;
}

// Status config for all types
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
  open: { label: "Ouverte", color: "bg-amber-500/20 text-amber-600" },
  responded: { label: "Réponses reçues", color: "bg-purple-500/20 text-purple-600" },
  reviewing: { label: "En étude", color: "bg-blue-500/20 text-blue-600" },
  quoted: { label: "Devis reçu", color: "bg-purple-500/20 text-purple-600" },
  negotiating: { label: "Négociation", color: "bg-orange-500/20 text-orange-600" },
  scheduled: { label: "Planifié", color: "bg-indigo-500/20 text-indigo-600" },
  in_progress: { label: "En cours", color: "bg-blue-500/20 text-blue-600" },
};

// Popular routes data
const POPULAR_ROUTES = [
  { from: "Paris", to: "Dakar", flag: "🇫🇷→🇸🇳", type: "aerien", hot: true },
  { from: "Dakar", to: "Marseille", flag: "🇸🇳→🇫🇷", type: "maritime" },
  { from: "Abidjan", to: "Paris", flag: "🇨🇮→🇫🇷", type: "aerien", hot: true },
  { from: "Dakar", to: "Montréal", flag: "🇸🇳→🇨🇦", type: "aerien" },
  { from: "Abidjan", to: "Bamako", flag: "🇨🇮→🇲🇱", type: "routier" },
  { from: "Casablanca", to: "Paris", flag: "🇲🇦→🇫🇷", type: "aerien" },
];

const TRANSPORT_FILTER_TABS = [
  { id: "all", label: "Tout", icon: Globe },
  { id: "aerien", label: "Aérien", icon: Plane },
  { id: "maritime", label: "Maritime", icon: Ship },
  { id: "routier", label: "Routier", icon: Car },
  { id: "bagages", label: "GP", icon: Luggage },
];

export function ClientAppHome({
  userName,
  recentOrders = [],
  customRequests = [],
  movingRequests = [],
  unreadMessages = 0,
  activeOrdersCount = 0,
  userId,
  userCity
}: ClientAppHomeProps) {
  const navigate = useNavigate();
  const firstName = userName?.split(' ')[0] || 'Bienvenue';
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Bonjour' : currentHour < 18 ? 'Bon après-midi' : 'Bonsoir';

  const [fullScreenOrderId, setFullScreenOrderId] = useState<string | null>(null);
  const [requestPopup, setRequestPopup] = useState<{ type: 'custom' | 'moving'; item: any; } | null>(null);

  const activeOrders = recentOrders.filter(o => ['pending', 'accepted', 'collected', 'paid_held', 'checked_in', 'weight_pending_payment', 'scheduled_departure', 'in_transit', 'arrived_destination', 'delivery_pending'].includes(o.status));
  
  const allActiveItems = [
    ...activeOrders.map(o => ({ ...o, type: 'order' as const })),
    ...customRequests.map(r => ({ ...r, type: 'custom' as const })),
    ...movingRequests.map(m => ({ ...m, type: 'moving' as const })),
  ];

  const openFullScreen = (orderId: string) => setFullScreenOrderId(orderId);
  const closeFullScreen = () => setFullScreenOrderId(null);
  const getStatusInfo = (status: string, type: 'order' | 'custom' | 'moving') => {
    const config = STATUS_CONFIG[status] || { label: status, color: "bg-muted text-muted-foreground" };
    let icon = Clock;
    if (status === 'in_transit') icon = Truck;
    else if (status === 'collected') icon = Package;
    else if (status === 'accepted') icon = User;
    else if (type === 'custom') icon = FileText;
    else if (type === 'moving') icon = HomeIcon;
    return { ...config, icon };
  };
  const selectedOrder = fullScreenOrderId ? activeOrders.find(o => o.id === fullScreenOrderId) : null;

  // Interactive search state
  const [searchOrigin, setSearchOrigin] = useState(userCity || "");
  const [searchDest, setSearchDest] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [originDrawerOpen, setOriginDrawerOpen] = useState(false);
  const [destDrawerOpen, setDestDrawerOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState("");

  useEffect(() => {
    if (userCity && !searchOrigin) setSearchOrigin(userCity);
  }, [userCity]);

  const filteredCityList = useMemo(() => {
    if (!cityQuery) return FEATURED_CITIES;
    const q = cityQuery.toLowerCase();
    return WORLD_CITIES.filter(c => c.city.toLowerCase().includes(q));
  }, [cityQuery]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchOrigin) params.set("origin", searchOrigin);
    if (searchDest) params.set("destination", searchDest);
    if (searchDate) params.set("date", searchDate);
    if (activeFilterTab !== "all") params.set("type", activeFilterTab);
    navigate(`/offres${params.toString() ? `?${params}` : ""}`);
  };

  // Offers + filter
  const [offers, setOffers] = useState<any[]>([]);
  const [activeFilterTab, setActiveFilterTab] = useState("all");

  useEffect(() => {
    const loadOffers = async () => {
      const { data } = await supabase
        .from("gp_offers")
        .select("*, gp_profiles(business_name, rating, total_reviews)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(12);
      if (data) setOffers(data);
    };
    loadOffers();
  }, []);

  const filteredOffers = useMemo(() => {
    if (activeFilterTab === "all") return offers;
    const typeMap: Record<string, string[]> = {
      aerien: ["aerien"],
      maritime: ["maritime"],
      routier: ["routier"],
      bagages: ["bagages_accompagnes", "navette"],
    };
    const types = typeMap[activeFilterTab] || [];
    return offers.filter(o => types.includes(o.transport_type));
  }, [offers, activeFilterTab]);

  const getOfferIcon = (type: string) => {
    if (type === "maritime") return Ship;
    if (type === "routier") return Car;
    if (type === "aerien") return Plane;
    return Luggage;
  };

  return (
    <div className="flex flex-col relative bg-background" style={{
      height: 'calc(100vh - 60px - 64px - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
      minHeight: '400px'
    }}>
      {/* Full-Screen Order Details Overlay */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <FullScreenOrderDetails order={selectedOrder} onClose={closeFullScreen} navigate={navigate} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* ── GREETING ── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-4 pt-3 pb-1">
          <h1 className="text-xl font-bold text-foreground">
            {greeting}{userName ? `, ${firstName}` : ''} <span>👋</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Envoyez vos colis partout dans le monde</p>
        </motion.div>

        {/* Weight Validation Alerts */}
        {userId && <div className="px-4"><WeightValidationAlert userId={userId} /></div>}
        {userId && <RecipientTrackingCard userId={userId} />}

        {/* ── SEARCH BAR (preserved) ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="px-4 py-2"
        >
          <div className="bg-card border-2 border-primary/30 rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => { setCityQuery(""); setOriginDrawerOpen(true); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 border-b border-border/40 text-left"
            >
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
              <span className={`flex-1 text-sm ${searchOrigin ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {searchOrigin || "Ville de départ"}
              </span>
              {searchOrigin && <span className="text-[10px] text-muted-foreground">Modifier</span>}
            </button>
            <button
              onClick={() => { setCityQuery(""); setDestDrawerOpen(true); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 border-b border-border/40 text-left"
            >
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className={`flex-1 text-sm ${searchDest ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {searchDest || "Ville de destination"}
              </span>
              {searchDest && <span className="text-[10px] text-muted-foreground">Modifier</span>}
            </button>
            <div className="flex items-center gap-3 px-3 py-2.5">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSearch}
            className="w-full bg-primary text-primary-foreground font-bold text-center py-3 rounded-xl shadow-lg mt-2 text-sm"
          >
            Rechercher un transporteur
          </motion.button>
        </motion.div>

        {/* ── QUICK ACTIONS (compact row) ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="px-4 pb-3"
        >
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Package, label: "Envoyer", to: "/envoyer", primary: true },
              { icon: MessageCircle, label: "Messages", to: "/messages", badge: unreadMessages },
              { icon: History, label: "Historique", to: "/historique", badge: activeOrdersCount },
              { icon: Heart, label: "Favoris", to: "/favoris" },
            ].map((action) => (
              <Link key={action.to} to={action.to}>
                <motion.div
                  whileTap={{ scale: 0.93 }}
                  className={`relative rounded-2xl py-3 px-2 flex flex-col items-center gap-1.5 transition-all duration-200 ${
                    action.primary
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "bg-muted/60 border border-border"
                  }`}
                >
                  {action.badge != null && action.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-destructive text-destructive-foreground rounded-full text-[9px] flex items-center justify-center font-bold shadow-sm">
                      {action.badge}
                    </span>
                  )}
                  <action.icon className={`w-5 h-5 ${action.primary ? "text-primary-foreground" : "text-foreground"}`} />
                  <span className={`text-[11px] font-semibold leading-tight ${action.primary ? "text-primary-foreground" : "text-foreground"}`}>
                    {action.label}
                  </span>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* ── ACTIVE ORDERS (compact, if any) ── */}
        {allActiveItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="px-4 pb-3"
          >
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="text-sm font-bold text-foreground">Envois actifs</h2>
              <Link to="/historique" className="text-xs text-primary font-medium flex items-center gap-0.5">
                Voir tout <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-1.5">
              {allActiveItems.slice(0, 2).map((item, index) => {
                const statusInfo = getStatusInfo(item.status, item.type);
                return (
                  <motion.div
                    key={`${item.type}-${item.id}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={
                      item.type === 'order' ? () => openFullScreen(item.id) :
                      item.type === 'custom' ? () => setRequestPopup({ type: 'custom', item }) :
                      () => setRequestPopup({ type: 'moving', item })
                    }
                    className="bg-card border border-border rounded-xl p-2.5 flex items-center gap-2.5 active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      item.type === 'moving' ? 'bg-amber-500/10' :
                      item.type === 'custom' ? 'bg-purple-500/10' : 'bg-primary/10'
                    }`}>
                      {item.type === 'moving' ? <HomeIcon className="w-4 h-4 text-amber-600" /> :
                       item.type === 'custom' ? <FileText className="w-4 h-4 text-purple-600" /> :
                       <Package className="w-4 h-4 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {item.origin_city} → {item.destination_city}
                      </p>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════
            SECTION: OFFRES DISPONIBLES + FILTER TABS
            ══════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="px-4 pb-2"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-foreground">Offres disponibles</h2>
            <Link to="/offres" className="text-xs text-primary font-medium flex items-center gap-0.5">
              Voir tout <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* ── Horizontal filter tabs (Booking-style) ── */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
            {TRANSPORT_FILTER_TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeFilterTab === tab.id;
              const count = tab.id === "all" ? offers.length :
                offers.filter(o => {
                  const typeMap: Record<string, string[]> = {
                    aerien: ["aerien"],
                    maritime: ["maritime"],
                    routier: ["routier"],
                    bagages: ["bagages_accompagnes", "navette"],
                  };
                  return (typeMap[tab.id] || []).includes(o.transport_type);
                }).length;

              return (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveFilterTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-card text-muted-foreground border-border hover:border-primary/30"
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  {tab.label}
                  {count > 0 && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {count}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Offers list ── */}
        <div className="px-4 pb-4">
          {filteredOffers.length > 0 ? (
            <div className="space-y-2">
              {filteredOffers.slice(0, 6).map((offer, idx) => {
                const departDate = offer.departure_date ? new Date(offer.departure_date) : null;
                const OfferIcon = getOfferIcon(offer.transport_type);
                return (
                  <Link key={offer.id} to={`/offre/${offer.id}`} className="block">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3 hover:border-primary/30 transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <OfferIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-sm font-bold text-foreground truncate">{offer.origin_city}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-bold text-foreground truncate">{offer.destination_city}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-muted-foreground truncate max-w-[90px]">
                            {offer.gp_profiles?.business_name || "GP"}
                          </span>
                          {offer.gp_profiles?.rating && (
                            <span className="flex items-center gap-0.5 text-[11px] text-amber-500">
                              <Star className="w-2.5 h-2.5 fill-amber-500" />
                              {offer.gp_profiles.rating.toFixed(1)}
                            </span>
                          )}
                          {departDate && (
                            <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">
                              {departDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                          {offer.available_capacity > 0 && (
                            <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full font-medium">
                              {offer.available_capacity} kg
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 pl-1">
                        <span className="text-lg font-extrabold text-primary leading-none">{offer.price_per_kg}€</span>
                        <span className="text-[10px] text-muted-foreground block leading-tight">/kg</span>
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-muted/30 border border-border rounded-xl p-6 text-center">
              <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-medium">
                {activeFilterTab === "all" ? "Aucune offre pour le moment" : `Aucune offre ${TRANSPORT_FILTER_TABS.find(t => t.id === activeFilterTab)?.label || ""}`}
              </p>
              <button onClick={() => setActiveFilterTab("all")} className="text-xs text-primary font-medium mt-1.5">
                {activeFilterTab !== "all" ? "Voir toutes les offres" : "Lancer une recherche"}
              </button>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION: ROUTES POPULAIRES (Booking-style cards)
            ══════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="px-4 pb-4"
        >
          <h2 className="text-base font-bold text-foreground mb-2">Routes populaires</h2>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            {POPULAR_ROUTES.map((route, idx) => (
              <motion.button
                key={idx}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  setSearchOrigin(route.from);
                  setSearchDest(route.to);
                  handleSearch();
                }}
                className="flex-shrink-0 w-[140px] bg-card border border-border rounded-2xl p-3 text-left hover:border-primary/30 transition-all relative overflow-hidden group"
              >
                {route.hot && (
                  <span className="absolute top-2 right-2 text-[9px] bg-destructive/90 text-destructive-foreground px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                    <TrendingUp className="w-2.5 h-2.5" /> Hot
                  </span>
                )}
                <span className="text-lg block mb-1">{route.flag}</span>
                <p className="text-sm font-bold text-foreground leading-tight">{route.from}</p>
                <p className="text-[10px] text-muted-foreground">→ {route.to}</p>
                <div className="mt-2 flex items-center gap-1">
                  {route.type === "aerien" && <Plane className="w-3 h-3 text-primary" />}
                  {route.type === "maritime" && <Ship className="w-3 h-3 text-primary" />}
                  {route.type === "routier" && <Car className="w-3 h-3 text-primary" />}
                  <span className="text-[10px] text-primary font-medium capitalize">{route.type}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════
            SECTION: POURQUOI KONNEKT (Trust badges)
            ══════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="px-4 pb-8"
        >
          <h2 className="text-base font-bold text-foreground mb-2">Pourquoi Konnekt ?</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Shield, title: "Paiement sécurisé", desc: "Escrow protégé", color: "text-emerald-500 bg-emerald-500/10" },
              { icon: Globe, title: "Multi-corridors", desc: "Afrique, Europe, Amériques", color: "text-blue-500 bg-blue-500/10" },
              { icon: Zap, title: "Suivi en temps réel", desc: "Scan QR + notifications", color: "text-amber-500 bg-amber-500/10" },
              { icon: Award, title: "Transporteurs vérifiés", desc: "KYC + avis clients", color: "text-purple-500 bg-purple-500/10" },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + idx * 0.05 }}
                className="bg-card border border-border rounded-2xl p-3"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${item.color}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-foreground leading-tight">{item.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Request Details Popup */}
      <RequestDetailsPopup
        open={!!requestPopup}
        onClose={() => setRequestPopup(null)}
        type={requestPopup?.type || 'custom'}
        item={requestPopup?.item}
        navigate={navigate}
      />

      {/* === CITY PICKER DRAWERS === */}
      {[
        { open: originDrawerOpen, setOpen: setOriginDrawerOpen, title: "Ville de départ", onSelect: setSearchOrigin },
        { open: destDrawerOpen, setOpen: setDestDrawerOpen, title: "Ville de destination", onSelect: setSearchDest },
      ].map((drawer) => (
        <Drawer key={drawer.title} open={drawer.open} onOpenChange={drawer.setOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle>{drawer.title}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Rechercher une ville..."
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto overscroll-contain px-2 pb-6" style={{ maxHeight: "55vh", WebkitOverflowScrolling: "touch", touchAction: "pan-y" } as React.CSSProperties}>
              {filteredCityList.slice(0, 30).map((city) => (
                <button
                  key={`${city.city}-${city.country}`}
                  onClick={() => {
                    drawer.onSelect(city.city);
                    drawer.setOpen(false);
                    setCityQuery("");
                  }}
                  className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-left hover:bg-muted/60 active:bg-muted transition-colors"
                >
                  <span className="text-lg">{city.flag}</span>
                  <span className="text-sm font-medium flex-1">{city.city}</span>
                </button>
              ))}
              {filteredCityList.length === 0 && cityQuery && (
                <button
                  onClick={() => {
                    drawer.onSelect(cityQuery);
                    drawer.setOpen(false);
                    setCityQuery("");
                  }}
                  className="w-full py-3 text-sm text-primary font-medium text-center"
                >
                  Utiliser "{cityQuery}"
                </button>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════
// SUB-COMPONENTS (unchanged logic)
// ══════════════════════════════════════════════════

interface RequestDetailsPopupProps {
  open: boolean;
  onClose: () => void;
  type: 'custom' | 'moving';
  item: any;
  navigate: (path: string) => void;
}

function RequestDetailsPopup({ open, onClose, type, item, navigate }: RequestDetailsPopupProps) {
  if (!item) return null;
  const isMoving = type === 'moving';
  const statusConfig = STATUS_CONFIG[item.status] || { label: item.status, color: "bg-muted text-muted-foreground" };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isMoving ? (
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <HomeIcon className="w-4 h-4 text-amber-600" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-purple-600" />
              </div>
            )}
            {isMoving ? "Demande de déménagement" : "Demande personnalisée"}
          </DialogTitle>
          <DialogDescription>
            {item.request_number || `#${item.id?.slice(0, 8)}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-500" />
              <span className="font-medium">{item.origin_city}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <span className="font-medium">{item.destination_city}</span>
              <MapPin className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Statut</span>
            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
          </div>
          {isMoving ? (
            <>
              {item.volume_estimate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Volume estimé</span>
                  <span className="font-medium">{item.volume_estimate}</span>
                </div>
              )}
              <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium">Service géré par Konnekt</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Notre équipe vous contactera pour un devis personnalisé.</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {item.weight_estimate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Poids estimé</span>
                  <span className="font-medium">{item.weight_estimate} kg</span>
                </div>
              )}
              {item.shipment_type && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="font-medium capitalize">{item.shipment_type}</span>
                </div>
              )}
              <div className="p-3 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 rounded-xl">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-purple-600 mt-0.5" />
                  <div className="text-sm text-purple-800 dark:text-purple-200">
                    <p className="font-medium">En attente d'offres</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Les transporteurs peuvent proposer leurs offres.</p>
                  </div>
                </div>
              </div>
            </>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Créée le</span>
            <span>
              {item.created_at && new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Fermer</Button>
          <Button className="flex-1" onClick={() => { onClose(); navigate("/historique"); }}>
            <Eye className="w-4 h-4 mr-2" />
            Voir l'historique
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Full-Screen Order Details Component
interface FullScreenOrderDetailsProps {
  order: any;
  onClose: () => void;
  navigate: (path: string) => void;
}
function FullScreenOrderDetails({ order, onClose, navigate }: FullScreenOrderDetailsProps) {
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
