import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Package, MessageCircle, MapPin, History, Heart, ArrowRight,
  Clock, ChevronRight, FileText, Home as HomeIcon, Truck, Calendar,
  Search, Plane, Ship, Car, Luggage, Globe, Shield, Zap, Award,
  TrendingUp, Users, ArrowUpDown
} from "lucide-react";
import { RecipientTrackingCard } from "@/components/client/RecipientTrackingCard";
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
  { id: "aerien", label: "Aérien", icon: Plane, soon: true },
  { id: "maritime", label: "Maritime", icon: Ship, soon: true },
  { id: "routier", label: "Routier", icon: Car, soon: true },
];

const POPULAR_ROUTES = [
  { from: "Paris", to: "Dakar", flag: "🇫🇷→🇸🇳", hot: true },
  { from: "Dakar", to: "Marseille", flag: "🇸🇳→🇫🇷" },
  { from: "Abidjan", to: "Paris", flag: "🇨🇮→🇫🇷", hot: true },
  { from: "Dakar", to: "Montréal", flag: "🇸🇳→🇨🇦" },
  { from: "Abidjan", to: "Bamako", flag: "🇨🇮→🇲🇱" },
  { from: "Casablanca", to: "Paris", flag: "🇲🇦→🇫🇷" },
];

const ACTIVE_STATUSES = ['pending', 'accepted', 'collected', 'paid_held', 'checked_in', 'weight_pending_payment', 'scheduled_departure', 'in_transit', 'arrived_destination', 'delivery_pending'];

const TYPE_MAP: Record<string, string[]> = {
  aerien: ["aerien"],
  maritime: ["maritime"],
  routier: ["routier"],
  bagages: ["bagages_accompagnes", "navette"],
};

const TRUST_ITEMS = [
  { icon: Shield, title: "Paiement sécurisé", desc: "Escrow protégé", color: "text-emerald-500 bg-emerald-500/10" },
  { icon: Globe, title: "Multi-corridors", desc: "Afrique, Europe, Amériques", color: "text-blue-500 bg-blue-500/10" },
  { icon: Zap, title: "Suivi temps réel", desc: "QR + notifications", color: "text-amber-500 bg-amber-500/10" },
  { icon: Award, title: "GP vérifiés", desc: "KYC + avis", color: "text-purple-500 bg-purple-500/10" },
];

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

  const handleSearch = () => {
    // Filter offers in-place instead of navigating
    // User can click "Tout voir" to go to /offres
  };

  const goToOffres = () => {
    const params = buildSearchParams();
    // Save last successful search
    if (searchOrigin || searchDest) {
      localStorage.setItem("kkt_last_search", JSON.stringify({ origin: searchOrigin, destination: searchDest }));
    }
    navigate(`/offres${params.toString() ? `?${params}` : ""}`);
  };

  // Offers
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
    // Sort: highest GP rating first, then earliest departure
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
          <p className="text-xs text-muted-foreground mt-0.5">Envoyez vos colis partout dans le monde</p>
        </div>

        {/* Alerts */}
        {userId && <div className="px-4"><WeightValidationAlert userId={userId} /></div>}
        {/* RecipientTrackingCard removed — incoming parcels now shown in SmartActionBar */}

        {/* ── TRANSPORT TYPE TABS (compact, above search) ── */}
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

        {/* ── SEARCH ENGINE ── */}
        <div className="px-4 pb-2">
          <div className="bg-card border-2 border-primary/30 rounded-2xl overflow-hidden shadow-sm relative">
            {/* Origin */}
            <button
              onClick={() => { setCityQuery(""); setActivePicker("origin"); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-border/40"
            >
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
              <span className={`flex-1 text-sm ${searchOrigin ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {searchOrigin || "Ville de départ"}
              </span>
              {searchOrigin && <span className="text-[10px] text-muted-foreground">Modifier</span>}
            </button>

            {/* Swap button — centered on the border between origin & dest */}
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
                className="flex-1 bg-transparent text-sm text-foreground outline-none"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={goToOffres}
            className="w-full bg-primary text-primary-foreground font-bold text-center py-3 rounded-xl shadow-lg mt-2 text-sm"
          >
            Rechercher un transporteur
          </motion.button>
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

        {/* ── OFFERS ── */}
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-foreground">Offres disponibles</h2>
            <button onClick={goToOffres} className="text-xs text-primary font-medium flex items-center gap-0.5">
              Tout voir <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

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
                {activeTab === "all" ? "Aucune offre pour le moment" : `Aucune offre ${TRANSPORT_TABS.find(t => t.id === activeTab)?.label}`}
              </p>
              {activeTab !== "all" && (
                <button onClick={() => setActiveTab("all")} className="text-xs text-primary font-medium mt-1.5">
                  Voir toutes les offres
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── ROUTES POPULAIRES ── */}
        <div className="px-4 pb-4">
          <h2 className="text-base font-bold text-foreground mb-2">Routes populaires</h2>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {POPULAR_ROUTES.map((route, idx) => (
              <button
                key={idx}
                onClick={() => { setSearchOrigin(route.from); setSearchDest(route.to); handleSearch(); }}
                className="flex-shrink-0 w-[120px] bg-card border border-border rounded-2xl p-3 text-left hover:border-primary/30 transition-all relative"
              >
                {route.hot && (
                  <span className="absolute top-2 right-2 text-[9px] bg-destructive/90 text-destructive-foreground px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                    <TrendingUp className="w-2.5 h-2.5" /> Hot
                  </span>
                )}
                <span className="text-lg block mb-1">{route.flag}</span>
                <p className="text-sm font-bold text-foreground leading-tight">{route.from}</p>
                <p className="text-[10px] text-muted-foreground">→ {route.to}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── POURQUOI KONNEKT ── */}
        <div className="px-4 pb-8">
          <h2 className="text-base font-bold text-foreground mb-2">Pourquoi Konnekt ?</h2>
          <div className="grid grid-cols-2 gap-2">
            {TRUST_ITEMS.map((item, idx) => (
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

      {/* City Picker Drawer (shared for origin & dest) */}
      <Drawer open={!!activePicker} onOpenChange={(open) => { if (!open) setActivePicker(null); }}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle>{activePicker === "origin" ? "Ville de départ" : "Ville de destination"}</DrawerTitle>
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
