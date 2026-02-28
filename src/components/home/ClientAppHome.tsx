import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Package, MessageCircle, MapPin, History, Heart, ArrowRight,
  Clock, ChevronRight, FileText, Home as HomeIcon, Truck, Calendar,
  Search, Plane, Ship, Car, Luggage, Globe, Shield, Zap, Award,
  TrendingUp, Users, Briefcase, Star as StarIcon, Compass, Send
} from "lucide-react";
import { RecipientTrackingCard } from "@/components/client/RecipientTrackingCard";
import { WeightValidationAlert } from "@/components/client/WeightValidationAlert";
import { supabase } from "@/integrations/supabase/client";
import { WORLD_CITIES, FEATURED_CITIES } from "@/components/gp/SearchableCitySelect";
import { FullScreenOrderDetails } from "./FullScreenOrderDetails";
import { RequestDetailsPopup } from "./RequestDetailsPopup";
import { HomeOfferCard } from "./HomeOfferCard";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

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
};

// ─── BOOKING-STYLE MAIN TABS ───
const HOME_TABS = [
  { id: "envoyer", label: "Envoyer", icon: Send, emoji: "📦" },
  { id: "gp", label: "GP disponibles", icon: Users, emoji: "✈️" },
  { id: "routes", label: "Routes", icon: Compass, emoji: "🛫" },
  { id: "opportunites", label: "Opportunités", icon: Briefcase, emoji: "💼", gpOnly: true },
];

// ─── TRANSPORT FILTER TABS ───
const TRANSPORT_FILTER_TABS = [
  { id: "all", label: "Tout", icon: Globe },
  { id: "aerien", label: "Aérien", icon: Plane },
  { id: "maritime", label: "Maritime", icon: Ship },
  { id: "routier", label: "Routier", icon: Car },
  { id: "bagages", label: "GP", icon: Luggage },
];

const POPULAR_ROUTES = [
  { from: "Paris", to: "Dakar", flag: "🇫🇷→🇸🇳", type: "aerien", hot: true },
  { from: "Dakar", to: "Marseille", flag: "🇸🇳→🇫🇷", type: "maritime" },
  { from: "Abidjan", to: "Paris", flag: "🇨🇮→🇫🇷", type: "aerien", hot: true },
  { from: "Dakar", to: "Montréal", flag: "🇸🇳→🇨🇦", type: "aerien" },
  { from: "Abidjan", to: "Bamako", flag: "🇨🇮→🇲🇱", type: "routier" },
  { from: "Casablanca", to: "Paris", flag: "🇲🇦→🇫🇷", type: "aerien" },
  { from: "Conakry", to: "Paris", flag: "🇬🇳→🇫🇷", type: "aerien" },
  { from: "Douala", to: "Bruxelles", flag: "🇨🇲→🇧🇪", type: "aerien" },
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
  const [activeMainTab, setActiveMainTab] = useState("envoyer");
  const [activeFilterTab, setActiveFilterTab] = useState("all");

  // Search state
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

  // Offers
  const [offers, setOffers] = useState<any[]>([]);
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
    return offers.filter(o => (typeMap[activeFilterTab] || []).includes(o.transport_type));
  }, [offers, activeFilterTab]);

  // Active items
  const activeOrders = recentOrders.filter(o => ['pending', 'accepted', 'collected', 'paid_held', 'checked_in', 'weight_pending_payment', 'scheduled_departure', 'in_transit', 'arrived_destination', 'delivery_pending'].includes(o.status));
  const allActiveItems = [
    ...activeOrders.map(o => ({ ...o, type: 'order' as const })),
    ...customRequests.map(r => ({ ...r, type: 'custom' as const })),
    ...movingRequests.map(m => ({ ...m, type: 'moving' as const })),
  ];

  const selectedOrder = fullScreenOrderId ? activeOrders.find(o => o.id === fullScreenOrderId) : null;

  const getStatusInfo = (status: string, type: 'order' | 'custom' | 'moving') => {
    const config = STATUS_CONFIG[status] || { label: status, color: "bg-muted text-muted-foreground" };
    let icon = Clock;
    if (status === 'in_transit') icon = Truck;
    else if (status === 'collected') icon = Package;
    else if (type === 'custom') icon = FileText;
    else if (type === 'moving') icon = HomeIcon;
    return { ...config, icon };
  };

  return (
    <div className="flex flex-col relative bg-background" style={{
      height: 'calc(100vh - 60px - 64px - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
      minHeight: '400px'
    }}>
      {/* Full-Screen Order Overlay */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <FullScreenOrderDetails order={selectedOrder} onClose={() => setFullScreenOrderId(null)} navigate={navigate} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── SCROLLABLE CONTENT ─── */}
      <div className="flex-1 overflow-y-auto">

        {/* ═══ GREETING ═══ */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-4 pt-3 pb-1">
          <h1 className="text-xl font-bold text-foreground">
            {greeting}{userName ? `, ${firstName}` : ''} <span>👋</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Envoyez vos colis partout dans le monde</p>
        </motion.div>

        {/* Alerts */}
        {userId && <div className="px-4"><WeightValidationAlert userId={userId} /></div>}
        {userId && <RecipientTrackingCard userId={userId} />}

        {/* ═══ BOOKING-STYLE HORIZONTAL TABS (main categories) ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="px-4 pt-2 pb-1"
        >
          <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            {HOME_TABS.filter(t => !t.gpOnly).map((tab) => {
              const isActive = activeMainTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveMainTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                      : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <span className="text-sm">{tab.emoji}</span>
                  {tab.label}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ═══ TAB CONTENT: ENVOYER ═══ */}
        <AnimatePresence mode="wait">
          {activeMainTab === "envoyer" && (
            <motion.div
              key="envoyer"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              {/* ── SEARCH ENGINE ── */}
              <div className="px-4 py-2">
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
              </div>

              {/* ── QUICK ACTIONS ── */}
              <div className="px-4 pb-3">
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
              </div>

              {/* ── ACTIVE ORDERS ── */}
              {allActiveItems.length > 0 && (
                <div className="px-4 pb-3">
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
                            item.type === 'order' ? () => setFullScreenOrderId(item.id) :
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
                </div>
              )}

              {/* ── OFFRES DISPONIBLES + TRANSPORT FILTERS ── */}
              <div className="px-4 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-bold text-foreground">Offres disponibles</h2>
                  <Link to="/offres" className="text-xs text-primary font-medium flex items-center gap-0.5">
                    Voir tout <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
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
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all border ${
                          isActive
                            ? "bg-primary text-primary-foreground border-primary shadow-md"
                            : "bg-card text-muted-foreground border-border hover:border-primary/30"
                        }`}
                      >
                        <TabIcon className="w-3 h-3" />
                        {tab.label}
                        {count > 0 && (
                          <span className={`text-[9px] px-1 py-0.5 rounded-full font-bold ${
                            isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}>
                            {count}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Offers List */}
              <div className="px-4 pb-4">
                {filteredOffers.length > 0 ? (
                  <div className="space-y-2">
                    {filteredOffers.slice(0, 6).map((offer, idx) => (
                      <HomeOfferCard key={offer.id} offer={offer} index={idx} />
                    ))}
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
            </motion.div>
          )}

          {/* ═══ TAB CONTENT: GP DISPONIBLES ═══ */}
          {activeMainTab === "gp" && (
            <motion.div
              key="gp"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="px-4 py-3"
            >
              <h2 className="text-base font-bold text-foreground mb-1">Transporteurs actifs</h2>
              <p className="text-xs text-muted-foreground mb-3">Trouvez un GP sur votre corridor</p>

              {/* GP active offers grouped */}
              {offers.length > 0 ? (
                <div className="space-y-2">
                  {offers.slice(0, 8).map((offer, idx) => (
                    <HomeOfferCard key={offer.id} offer={offer} index={idx} />
                  ))}
                  <Link to="/offres" className="block">
                    <motion.div whileTap={{ scale: 0.98 }} className="bg-primary/5 border border-primary/20 rounded-2xl p-3 text-center">
                      <span className="text-sm font-bold text-primary">Voir tous les GP →</span>
                    </motion.div>
                  </Link>
                </div>
              ) : (
                <div className="bg-muted/30 border border-border rounded-xl p-8 text-center">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Aucun GP actif pour le moment</p>
                  <p className="text-xs text-muted-foreground mt-1">Revenez bientôt ou lancez une demande</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ TAB CONTENT: ROUTES ═══ */}
          {activeMainTab === "routes" && (
            <motion.div
              key="routes"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="px-4 py-3"
            >
              <h2 className="text-base font-bold text-foreground mb-1">Routes actives</h2>
              <p className="text-xs text-muted-foreground mb-3">Explorez les corridors les plus populaires</p>

              <div className="grid grid-cols-2 gap-2">
                {POPULAR_ROUTES.map((route, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      setActiveMainTab("envoyer");
                      setSearchOrigin(route.from);
                      setSearchDest(route.to);
                      setTimeout(handleSearch, 100);
                    }}
                    className="bg-card border border-border rounded-2xl p-3 text-left hover:border-primary/30 transition-all relative overflow-hidden"
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
          )}
        </AnimatePresence>

        {/* ═══ SECTION: ROUTES POPULAIRES (always visible in "envoyer") ═══ */}
        {activeMainTab === "envoyer" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="px-4 pb-4">
            <h2 className="text-base font-bold text-foreground mb-2">Routes populaires</h2>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
              {POPULAR_ROUTES.slice(0, 6).map((route, idx) => (
                <motion.button
                  key={idx}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setSearchOrigin(route.from);
                    setSearchDest(route.to);
                    handleSearch();
                  }}
                  className="flex-shrink-0 w-[130px] bg-card border border-border rounded-2xl p-3 text-left hover:border-primary/30 transition-all relative overflow-hidden"
                >
                  {route.hot && (
                    <span className="absolute top-2 right-2 text-[9px] bg-destructive/90 text-destructive-foreground px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                      <TrendingUp className="w-2.5 h-2.5" /> Hot
                    </span>
                  )}
                  <span className="text-lg block mb-1">{route.flag}</span>
                  <p className="text-sm font-bold text-foreground leading-tight">{route.from}</p>
                  <p className="text-[10px] text-muted-foreground">→ {route.to}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ SECTION: POURQUOI KONNEKT ═══ */}
        {activeMainTab === "envoyer" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="px-4 pb-8">
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
        )}
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
