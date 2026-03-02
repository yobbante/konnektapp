import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Package, MessageCircle, MapPin, History, Heart, ArrowRight,
  Clock, ChevronRight, FileText, Home as HomeIcon, Truck, Calendar,
  Search, Plane, Ship, Car, Luggage, Globe, Shield, Zap, Award,
  TrendingUp, Users, ArrowUpDown, Weight, Route
} from "lucide-react";
import { RecipientTrackingCard } from "@/components/client/RecipientTrackingCard";
import { KonnektCanvasCarousel } from "./KonnektCanvasCarousel";
import { WeightValidationAlert } from "@/components/client/WeightValidationAlert";
import { supabase } from "@/integrations/supabase/client";
import { WORLD_CITIES, FEATURED_CITIES } from "@/components/gp/SearchableCitySelect";
import { FullScreenOrderDetails } from "./FullScreenOrderDetails";
import { RequestDetailsPopup } from "./RequestDetailsPopup";
import { HomeOfferCard } from "./HomeOfferCard";
import { SmartActionBar } from "./SmartActionBar";
import { PostDeliveryFlow, usePostDeliveryDetection } from "@/components/delivery/PostDeliveryFlow";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
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
  delivery_confirmed: { label: "Livré ✓", color: "bg-emerald-500/20 text-emerald-700" },
  open: { label: "Ouverte", color: "bg-amber-500/20 text-amber-600" },
  responded: { label: "Réponses reçues", color: "bg-purple-500/20 text-purple-600" },
};

const TRANSPORT_TABS = [
  { id: "all", label: "Tout", icon: Globe, soon: false },
  { id: "bagages", label: "GP", icon: Luggage, soon: false },
  { id: "aerien", label: "Aérien", icon: Plane, soon: false },
  { id: "maritime", label: "Maritime", icon: Ship, soon: false },
  { id: "routier", label: "Routier", icon: Car, soon: false },
];

// Mode-specific configuration
const MODE_CONFIG: Record<string, {
  subtitle: string;
  searchPlaceholderOrigin: string;
  searchPlaceholderDest: string;
  searchButtonLabel: string;
  offersTitle: string;
  emptyLabel: string;
  accentColor: string;
  icon: typeof Package;
}> = {
  all: {
    subtitle: "Envoyez vos colis partout dans le monde",
    searchPlaceholderOrigin: "Ville de départ",
    searchPlaceholderDest: "Ville de destination",
    searchButtonLabel: "Rechercher un transporteur",
    offersTitle: "Offres disponibles",
    emptyLabel: "Aucune offre pour le moment",
    accentColor: "primary",
    icon: Package,
  },
  bagages: {
    subtitle: "Trouvez un GP pour vos bagages accompagnés",
    searchPlaceholderOrigin: "Ville d'envoi",
    searchPlaceholderDest: "Ville de réception",
    searchButtonLabel: "Trouver un GP",
    offersTitle: "GP disponibles",
    emptyLabel: "Aucun GP disponible",
    accentColor: "primary",
    icon: Luggage,
  },
  aerien: {
    subtitle: "Fret aérien — bientôt disponible",
    searchPlaceholderOrigin: "Aéroport départ",
    searchPlaceholderDest: "Aéroport arrivée",
    searchButtonLabel: "Rechercher un vol cargo",
    offersTitle: "Offres aériennes",
    emptyLabel: "Aucune offre aérienne",
    accentColor: "primary",
    icon: Plane,
  },
  maritime: {
    subtitle: "Transport maritime — bientôt disponible",
    searchPlaceholderOrigin: "Port de départ",
    searchPlaceholderDest: "Port d'arrivée",
    searchButtonLabel: "Rechercher un cargo",
    offersTitle: "Offres maritimes",
    emptyLabel: "Aucune offre maritime",
    accentColor: "primary",
    icon: Ship,
  },
  routier: {
    subtitle: "Fret routier — missions sur mesure",
    searchPlaceholderOrigin: "Point de collecte",
    searchPlaceholderDest: "Point de livraison",
    searchButtonLabel: "Trouver un transporteur routier",
    offersTitle: "Missions routières disponibles",
    emptyLabel: "Aucune mission routière",
    accentColor: "primary",
    icon: Truck,
  },
};

const POPULAR_ROUTES_BY_MODE: Record<string, { from: string; to: string; flag: string; hot?: boolean }[]> = {
  all: [
    { from: "Paris", to: "Dakar", flag: "🇫🇷→🇸🇳", hot: true },
    { from: "Dakar", to: "Marseille", flag: "🇸🇳→🇫🇷" },
    { from: "Abidjan", to: "Paris", flag: "🇨🇮→🇫🇷", hot: true },
    { from: "Dakar", to: "Montréal", flag: "🇸🇳→🇨🇦" },
    { from: "Abidjan", to: "Bamako", flag: "🇨🇮→🇲🇱" },
    { from: "Casablanca", to: "Paris", flag: "🇲🇦→🇫🇷" },
  ],
  bagages: [
    { from: "Paris", to: "Dakar", flag: "🇫🇷→🇸🇳", hot: true },
    { from: "Abidjan", to: "Paris", flag: "🇨🇮→🇫🇷", hot: true },
    { from: "Dakar", to: "Marseille", flag: "🇸🇳→🇫🇷" },
    { from: "Casablanca", to: "Paris", flag: "🇲🇦→🇫🇷" },
  ],
  routier: [
    { from: "Dakar", to: "Bamako", flag: "🇸🇳→🇲🇱", hot: true },
    { from: "Abidjan", to: "Ouagadougou", flag: "🇨🇮→🇧🇫", hot: true },
    { from: "Lomé", to: "Cotonou", flag: "🇹🇬→🇧🇯" },
    { from: "Douala", to: "Libreville", flag: "🇨🇲→🇬🇦" },
    { from: "Accra", to: "Lomé", flag: "🇬🇭→🇹🇬" },
    { from: "Abidjan", to: "Dakar", flag: "🇨🇮→🇸🇳" },
  ],
};

const TRUST_ITEMS_BY_MODE: Record<string, { icon: typeof Shield; title: string; desc: string; color: string }[]> = {
  default: [
    { icon: Shield, title: "Paiement sécurisé", desc: "Escrow protégé", color: "text-emerald-500 bg-emerald-500/10" },
    { icon: Globe, title: "Multi-corridors", desc: "Afrique, Europe, Amériques", color: "text-blue-500 bg-blue-500/10" },
    { icon: Zap, title: "Suivi temps réel", desc: "QR + notifications", color: "text-amber-500 bg-amber-500/10" },
    { icon: Award, title: "GP vérifiés", desc: "KYC + avis", color: "text-purple-500 bg-purple-500/10" },
  ],
  routier: [
    { icon: Shield, title: "Escrow sécurisé", desc: "Paiement garanti à la livraison", color: "text-emerald-500 bg-emerald-500/10" },
    { icon: Truck, title: "Flotte vérifiée", desc: "Véhicules certifiés", color: "text-blue-500 bg-blue-500/10" },
    { icon: Zap, title: "Négociation directe", desc: "Prix en temps réel", color: "text-amber-500 bg-amber-500/10" },
    { icon: Route, title: "Corridors routiers", desc: "Afrique de l'Ouest & Centrale", color: "text-purple-500 bg-purple-500/10" },
  ],
};

const ACTIVE_STATUSES = ['pending', 'accepted', 'collected', 'paid_held', 'checked_in', 'weight_pending_payment', 'scheduled_departure', 'in_transit', 'arrived_destination', 'delivery_pending'];

const TYPE_MAP: Record<string, string[]> = {
  aerien: ["aerien"],
  maritime: ["maritime"],
  routier: ["routier"],
  bagages: ["bagages_accompagnes", "navette"],
};

export function ClientAppHome({
  userName, recentOrders = [], customRequests = [], movingRequests = [],
  unreadMessages = 0, activeOrdersCount = 0, userId, userCity
}: ClientAppHomeProps) {
  const navigate = useNavigate();
  const firstName = userName?.split(' ')[0] || 'Bienvenue';
  const greeting = new Date().getHours() < 12 ? 'Bonjour' : new Date().getHours() < 18 ? 'Bon après-midi' : 'Bonsoir';

  const [fullScreenOrderId, setFullScreenOrderId] = useState<string | null>(null);
  const [requestPopup, setRequestPopup] = useState<{ type: 'custom' | 'moving'; item: any } | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const modeConfig = MODE_CONFIG[activeTab] || MODE_CONFIG.all;
  const isRoutier = activeTab === "routier";

  // Search — restore last successful search from localStorage
  const lastSearch = useMemo(() => {
    try {
      const saved = localStorage.getItem("kkt_last_search");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  }, []);

  const [searchOrigin, setSearchOrigin] = useState(lastSearch?.origin || userCity || "");
  const [searchDest, setSearchDest] = useState(lastSearch?.destination || "");
  const [searchDate, setSearchDate] = useState("");
  const [activePicker, setActivePicker] = useState<"origin" | "dest" | null>(null);
  const [cityQuery, setCityQuery] = useState("");
  // Routier-specific fields
  const [routierWeight, setRoutierWeight] = useState("");

  useEffect(() => { if (userCity && !searchOrigin) setSearchOrigin(userCity); }, [userCity]);

  const swapOriginDest = () => {
    const o = searchOrigin;
    setSearchOrigin(searchDest);
    setSearchDest(o);
  };

  // Post-delivery detection
  const { deliveredOrder, role: deliveryRole, dismiss: dismissDelivery } = usePostDeliveryDetection(userId);

  const filteredCities = useMemo(() => {
    if (!cityQuery) return FEATURED_CITIES;
    const q = cityQuery.toLowerCase();
    return WORLD_CITIES.filter(c => c.city.toLowerCase().includes(q));
  }, [cityQuery]);

  const buildSearchParams = () => {
    const params = new URLSearchParams();
    if (searchOrigin) params.set("origin", searchOrigin);
    if (searchDest) params.set("destination", searchDest);
    if (searchDate) params.set("date", searchDate);
    if (activeTab !== "all") params.set("type", activeTab);
    return params;
  };

  const handleMainAction = () => {
    if (isRoutier) {
      // Navigate to routier mission request page with pre-filled data
      const params = new URLSearchParams();
      if (searchOrigin) params.set("origin", searchOrigin);
      if (searchDest) params.set("destination", searchDest);
      if (searchDate) params.set("date", searchDate);
      if (routierWeight) params.set("weight", routierWeight);
      navigate(`/routier/mission?${params.toString()}`);
    } else {
      goToOffres();
    }
  };

  const goToOffres = () => {
    const params = buildSearchParams();
    if (searchOrigin || searchDest) {
      localStorage.setItem("kkt_last_search", JSON.stringify({ origin: searchOrigin, destination: searchDest }));
    }
    navigate(`/offres${params.toString() ? `?${params}` : ""}`);
  };

  // Offers (GP)
  const [offers, setOffers] = useState<any[]>([]);
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("gp_offers")
      .select("*, gp_profiles(business_name, rating, total_reviews)")
      .eq("status", "active")
      .gte("departure_date", today)
      .order("departure_date", { ascending: true })
      .limit(12)
      .then(({ data }) => { if (data) setOffers(data); });
  }, []);

  // Routier missions
  const [routierMissions, setRoutierMissions] = useState<any[]>([]);
  useEffect(() => {
    if (!isRoutier) return;
    supabase
      .from("routier_missions")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => { if (data) setRoutierMissions(data); });
  }, [isRoutier]);

  const filteredOffers = useMemo(() => {
    let result = offers;
    if (activeTab !== "all") {
      result = result.filter(o => (TYPE_MAP[activeTab] || []).includes(o.transport_type));
    }
    if (searchOrigin) {
      result = result.filter(o => o.origin_city?.toLowerCase().includes(searchOrigin.toLowerCase()));
    }
    if (searchDest) {
      result = result.filter(o => o.destination_city?.toLowerCase().includes(searchDest.toLowerCase()));
    }
    return result.sort((a, b) => {
      const ratingA = a.gp_profiles?.rating || 0;
      const ratingB = b.gp_profiles?.rating || 0;
      if (ratingB !== ratingA) return ratingB - ratingA;
      return new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime();
    });
  }, [offers, activeTab, searchOrigin, searchDest]);

  // Active items
  const activeOrders = recentOrders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const allActiveItems = [
    ...activeOrders.map(o => ({ ...o, type: 'order' as const })),
    ...customRequests.map(r => ({ ...r, type: 'custom' as const })),
    ...movingRequests.map(m => ({ ...m, type: 'moving' as const })),
  ];
  const selectedOrder = fullScreenOrderId ? activeOrders.find(o => o.id === fullScreenOrderId) : null;

  const getStatusIcon = (status: string, type: string) => {
    if (status === 'in_transit') return Truck;
    if (type === 'custom') return FileText;
    if (type === 'moving') return HomeIcon;
    return Package;
  };

  const handleCitySelect = (city: string) => {
    if (activePicker === "origin") setSearchOrigin(city);
    else setSearchDest(city);
    setActivePicker(null);
    setCityQuery("");
  };

  const popularRoutes = POPULAR_ROUTES_BY_MODE[activeTab] || POPULAR_ROUTES_BY_MODE.all;
  const trustItems = TRUST_ITEMS_BY_MODE[activeTab] || TRUST_ITEMS_BY_MODE.default;

  return (
    <div className="flex flex-col relative bg-background" style={{
      height: 'calc(100vh - 60px - 64px - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
      minHeight: '400px'
    }}>
      {/* Post-Delivery Flow */}
      <AnimatePresence>
        {deliveredOrder && (
          <PostDeliveryFlow
            order={deliveredOrder}
            role={deliveryRole}
            onClose={() => dismissDelivery(deliveredOrder.id)}
            onNavigate={navigate}
          />
        )}
      </AnimatePresence>

      {/* Full-Screen Order Overlay */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <FullScreenOrderDetails order={selectedOrder} onClose={() => setFullScreenOrderId(null)} navigate={navigate} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto">
        {/* ── GREETING ── */}
        <div className="px-4 pt-3 pb-1">
          <h1 className="text-xl font-bold text-foreground">
            {greeting}{userName ? `, ${firstName}` : ''} 👋
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{modeConfig.subtitle}</p>
        </div>

        {/* Alerts */}
        {userId && <div className="px-4"><WeightValidationAlert userId={userId} /></div>}

        {/* ── TRANSPORT TYPE TABS ── */}
        <div className="px-4 pt-1 pb-2">
          <div className="flex gap-1.5">
            {TRANSPORT_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => !tab.soon && setActiveTab(tab.id)}
                  className={`relative flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-[10px] font-semibold transition-all border ${
                    tab.soon
                      ? "opacity-50 cursor-default bg-muted/30 border-border/50 text-muted-foreground"
                      : isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-card text-muted-foreground border-border hover:border-primary/30"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.soon && (
                    <span className="absolute -top-1.5 right-0.5 text-[7px] bg-amber-500/20 text-amber-600 px-1 rounded-full font-bold leading-tight">
                      Bientôt
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── SEARCH ENGINE (adaptive per mode) ── */}
        <div className="px-4 pb-2">
          <div className={`bg-card border-2 rounded-2xl overflow-hidden shadow-sm relative ${
            isRoutier ? "border-blue-500/40" : "border-primary/30"
          }`}>
            {/* Origin */}
            <button
              onClick={() => { setCityQuery(""); setActivePicker("origin"); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-border/40"
            >
              <MapPin className={`w-4 h-4 flex-shrink-0 ${isRoutier ? "text-blue-500" : "text-primary"}`} />
              <span className={`flex-1 text-sm ${searchOrigin ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {searchOrigin || modeConfig.searchPlaceholderOrigin}
              </span>
              {searchOrigin && <span className="text-[10px] text-muted-foreground">Modifier</span>}
            </button>

            {/* Swap button */}
            {(searchOrigin || searchDest) && (
              <button
                onClick={swapOriginDest}
                className="absolute right-3 top-[40px] -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent transition-colors"
                aria-label="Interchanger"
              >
                <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
              </button>
            )}

            {/* Destination */}
            <button
              onClick={() => { setCityQuery(""); setActivePicker("dest"); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-border/40"
            >
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className={`flex-1 text-sm ${searchDest ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {searchDest || modeConfig.searchPlaceholderDest}
              </span>
              {searchDest && <span className="text-[10px] text-muted-foreground">Modifier</span>}
            </button>

            {/* Routier: weight field */}
            {isRoutier && (
              <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border/40">
                <Weight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="number"
                  placeholder="Poids estimé (kg)"
                  value={routierWeight}
                  onChange={(e) => setRoutierWeight(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  min="1"
                />
              </div>
            )}

            <div className="flex items-center gap-3 px-3 py-2.5">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground outline-none"
                placeholder={isRoutier ? "Date de collecte souhaitée" : undefined}
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleMainAction}
            className={`w-full font-bold text-center py-3 rounded-xl shadow-lg mt-2 text-sm ${
              isRoutier
                ? "bg-blue-600 text-white"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {modeConfig.searchButtonLabel}
          </motion.button>

          {/* Routier: quick action to create custom mission */}
          {isRoutier && (
            <button
              onClick={() => navigate("/routier/mission")}
              className="w-full mt-2 py-2.5 rounded-xl border-2 border-dashed border-blue-500/40 text-blue-500 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-500/5 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Créer une mission personnalisée
            </button>
          )}
        </div>

        {/* ── SMART ACTION BAR ── */}
        <SmartActionBar
          userId={userId}
          recentOrders={recentOrders}
          unreadMessages={unreadMessages}
          activeOrdersCount={activeOrdersCount}
        />

        {/* ── ACTIVE ORDERS (compact) ── */}
        {allActiveItems.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="text-sm font-bold text-foreground">Envois actifs</h2>
              <Link to="/historique" className="text-xs text-primary font-medium flex items-center gap-0.5">
                Voir tout <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-1.5">
              {allActiveItems.slice(0, 2).map((item, i) => {
                const cfg = STATUS_CONFIG[item.status] || { label: item.status, color: "bg-muted text-muted-foreground" };
                const Icon = getStatusIcon(item.status, item.type);
                return (
                  <motion.div
                    key={`${item.type}-${item.id}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() =>
                      item.type === 'order' ? setFullScreenOrderId(item.id) :
                      setRequestPopup({ type: item.type as 'custom' | 'moving', item })
                    }
                    className="bg-card border border-border rounded-xl p-2.5 flex items-center gap-2.5 active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      item.type === 'moving' ? 'bg-amber-500/10' : item.type === 'custom' ? 'bg-purple-500/10' : 'bg-primary/10'
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        item.type === 'moving' ? 'text-amber-600' : item.type === 'custom' ? 'text-purple-600' : 'text-primary'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{item.origin_city} → {item.destination_city}</p>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── OFFERS / MISSIONS (adaptive) ── */}
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-foreground">{modeConfig.offersTitle}</h2>
            {!isRoutier && (
              <button onClick={goToOffres} className="text-xs text-primary font-medium flex items-center gap-0.5">
                Tout voir <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="px-4 pb-4">
          {isRoutier ? (
            // Routier missions list
            routierMissions.length > 0 ? (
              <div className="space-y-2">
                {routierMissions.map((mission) => (
                  <div
                    key={mission.id}
                    className="bg-card border border-border rounded-xl p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-semibold text-foreground">
                          {mission.origin_city} → {mission.destination_city}
                        </span>
                      </div>
                      <span className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                        {mission.status === "open" ? "Ouvert" : mission.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{mission.total_weight_kg} kg</span>
                      <span>•</span>
                      <span>{mission.vehicle_type_required || "Tout véhicule"}</span>
                      {mission.budget_max && (
                        <>
                          <span>•</span>
                          <span className="font-medium text-foreground">{mission.budget_max?.toLocaleString()} FCFA</span>
                        </>
                      )}
                    </div>
                    {mission.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{mission.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-muted/30 border border-border rounded-xl p-6 text-center">
                <Truck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-medium">{modeConfig.emptyLabel}</p>
                <button
                  onClick={() => navigate("/routier/mission")}
                  className="text-xs text-blue-500 font-medium mt-1.5"
                >
                  Créer votre première mission
                </button>
              </div>
            )
          ) : (
            // GP / Other offers
            filteredOffers.length > 0 ? (
              <div className="space-y-2">
                {filteredOffers.slice(0, 6).map((offer, idx) => (
                  <HomeOfferCard key={offer.id} offer={offer} index={idx} />
                ))}
              </div>
            ) : (
              <div className="bg-muted/30 border border-border rounded-xl p-6 text-center">
                <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-medium">{modeConfig.emptyLabel}</p>
                {activeTab !== "all" && (
                  <button onClick={() => setActiveTab("all")} className="text-xs text-primary font-medium mt-1.5">
                    Voir toutes les offres
                  </button>
                )}
              </div>
            )
          )}
        </div>

        {/* ── KONNEKT CANVAS CAROUSEL ── */}
        <KonnektCanvasCarousel />

        {/* ── POURQUOI KONNEKT (adaptive) ── */}
        <div className="px-4 pb-8">
          <h2 className="text-base font-bold text-foreground mb-2">
            {isRoutier ? "Pourquoi Konnekt Routier ?" : "Pourquoi Konnekt ?"}
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {trustItems.map((item, idx) => (
              <div key={idx} className="bg-card border border-border rounded-2xl p-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${item.color}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-foreground leading-tight">{item.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Request Popup */}
      <RequestDetailsPopup
        open={!!requestPopup}
        onClose={() => setRequestPopup(null)}
        type={requestPopup?.type || 'custom'}
        item={requestPopup?.item}
        navigate={navigate}
      />

      {/* City Picker Drawer */}
      <Drawer open={!!activePicker} onOpenChange={(open) => { if (!open) setActivePicker(null); }}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle>
              {activePicker === "origin" ? modeConfig.searchPlaceholderOrigin : modeConfig.searchPlaceholderDest}
            </DrawerTitle>
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
          <div className="overflow-y-auto overscroll-contain px-2 pb-6" style={{ maxHeight: "55vh", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
            {filteredCities.slice(0, 30).map((city) => (
              <button
                key={`${city.city}-${city.country}`}
                onClick={() => handleCitySelect(city.city)}
                className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-left hover:bg-muted/60 active:bg-muted transition-colors"
              >
                <span className="text-lg">{city.flag}</span>
                <span className="text-sm font-medium flex-1">{city.city}</span>
              </button>
            ))}
            {filteredCities.length === 0 && cityQuery && (
              <button
                onClick={() => handleCitySelect(cityQuery)}
                className="w-full py-3 text-sm text-primary font-medium text-center"
              >
                Utiliser "{cityQuery}"
              </button>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
