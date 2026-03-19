import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Package, MessageCircle, MapPin, ArrowRight,
  Clock, ChevronRight, FileText, Truck, Calendar,
  Search, Plane, Ship, Car, Luggage, Globe, Shield, Zap, Award,
  TrendingUp, Users, ArrowUpDown, Weight, Route, Sparkles,
  Send, ScanLine, Wallet, Star, CircleDot, Bus, BarChart3 } from
"lucide-react";
import { RecipientTrackingCard } from "@/components/client/RecipientTrackingCard";
import { KonnektCanvasCarousel } from "./KonnektCanvasCarousel";
import { WeightValidationAlert } from "@/components/client/WeightValidationAlert";
import { supabase } from "@/integrations/supabase/client";
import { WORLD_CITIES, FEATURED_CITIES } from "@/components/gp/SearchableCitySelect";
import { FullScreenOrderDetails } from "./FullScreenOrderDetails";
import { RequestDetailsPopup } from "./RequestDetailsPopup";
import { HomeOfferCard } from "./HomeOfferCard";
import { SmartActionBar } from "./SmartActionBar";
import { FullScreenOffresPopup } from "./FullScreenOffresPopup";
import { PostDeliveryFlow, usePostDeliveryDetection } from "@/components/delivery/PostDeliveryFlow";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle } from
"@/components/ui/drawer";

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

const STATUS_CONFIG: Record<string, {label: string;color: string;}> = {
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
  responded: { label: "Réponses reçues", color: "bg-purple-500/20 text-purple-600" }
};

import { GP_ONLY_MODE } from "@/config/featureFlags";

const ALL_TRANSPORT_TABS = [
{ id: "mobility", label: "Mobility", icon: Bus },
{ id: "all", label: "Tout", icon: Globe },
{ id: "routier", label: "Routier", icon: Car },
{ id: "maritime", label: "Maritime", icon: Ship },
{ id: "aerien", label: "Aérien", icon: Plane },
{ id: "bagages", label: "GP", icon: Luggage }];

const TRANSPORT_TABS = GP_ONLY_MODE
  ? [{ id: "bagages", label: "GP", icon: Luggage }]
  : ALL_TRANSPORT_TABS;


const MODE_CONFIG: Record<string, {
  subtitle: string;
  searchPlaceholderOrigin: string;
  searchPlaceholderDest: string;
  searchButtonLabel: string;
  offersTitle: string;
  emptyLabel: string;
  emptyDesc: string;
  icon: typeof Package;
  gradient: string;
}> = {
  all: {
    subtitle: "Envoyez vos colis partout dans le monde",
    searchPlaceholderOrigin: "Ville de départ",
    searchPlaceholderDest: "Ville de destination",
    searchButtonLabel: "Rechercher un transporteur",
    offersTitle: "Meilleures offres",
    emptyLabel: "Aucune offre pour le moment",
    emptyDesc: "Les transporteurs publient régulièrement de nouvelles offres",
    icon: Package,
    gradient: "from-primary/10 to-accent/5"
  },
  bagages: {
    subtitle: "Bagages accompagnés par GP de confiance",
    searchPlaceholderOrigin: "Ville d'envoi",
    searchPlaceholderDest: "Ville de destination",
    searchButtonLabel: "Trouver un GP",
    offersTitle: "GP disponibles",
    emptyLabel: "Aucun GP disponible",
    emptyDesc: "Revenez bientôt ou créez une demande personnalisée",
    icon: Luggage,
    gradient: "from-purple-500/10 to-primary/5"
  },
  aerien: {
    subtitle: "Fret aérien express, livraison rapide",
    searchPlaceholderOrigin: "Aéroport départ",
    searchPlaceholderDest: "Aéroport arrivée",
    searchButtonLabel: "Rechercher un vol cargo",
    offersTitle: "Offres aeriennes",
    emptyLabel: "Aucune offre aérienne",
    emptyDesc: "Les agents cargo publient régulièrement des offres",
    icon: Plane,
    gradient: "from-sky-500/10 to-blue-500/5"
  },
  maritime: {
    subtitle: "Conteneurs & groupage maritime",
    searchPlaceholderOrigin: "Port de départ",
    searchPlaceholderDest: "Port d'arrivée",
    searchButtonLabel: "Rechercher un cargo",
    offersTitle: "Offres maritimes",
    emptyLabel: "Aucune offre maritime",
    emptyDesc: "Solutions LCL et FCL en préparation",
    icon: Ship,
    gradient: "from-cyan-500/10 to-teal-500/5"
  },
  routier: {
    subtitle: "Transport routier inter-villes & inter-pays",
    searchPlaceholderOrigin: "Point de collecte",
    searchPlaceholderDest: "Point de livraison",
    searchButtonLabel: "Trouver un transporteur",
    offersTitle: "Offres routières",
    emptyLabel: "Aucune offre routière",
    emptyDesc: "Les transporteurs publient régulièrement des offres de transport routier",
    icon: Truck,
    gradient: "from-orange-500/10 to-amber-500/5"
  },
  mobility: {
    subtitle: "Navettes, chauffeurs privés, transport de groupe",
    searchPlaceholderOrigin: "Point de départ",
    searchPlaceholderDest: "Destination",
    searchButtonLabel: "Trouver un trajet",
    offersTitle: "Trajets disponibles",
    emptyLabel: "Aucun trajet Mobility",
    emptyDesc: "Les partenaires publient régulièrement des trajets",
    icon: Bus,
    gradient: "from-transport-mobility/10 to-primary/5"
  }
};

const POPULAR_ROUTES_BY_MODE: Record<string, {from: string;to: string;flag: string;hot?: boolean;}[]> = {
  all: [
  { from: "Paris", to: "Dakar", flag: "FR-SN", hot: true },
  { from: "Dakar", to: "Marseille", flag: "SN-FR" },
  { from: "Abidjan", to: "Paris", flag: "CI-FR", hot: true },
  { from: "Dakar", to: "Montréal", flag: "SN-CA" },
  { from: "Abidjan", to: "Bamako", flag: "CI-ML" },
  { from: "Casablanca", to: "Paris", flag: "MA-FR" }],

  bagages: [
  { from: "Paris", to: "Dakar", flag: "FR-SN", hot: true },
  { from: "Abidjan", to: "Paris", flag: "CI-FR", hot: true },
  { from: "Dakar", to: "Marseille", flag: "SN-FR" },
  { from: "Casablanca", to: "Paris", flag: "MA-FR" }],

  routier: [
  { from: "Dakar", to: "Bamako", flag: "SN-ML", hot: true },
  { from: "Abidjan", to: "Ouagadougou", flag: "CI-BF", hot: true },
  { from: "Lomé", to: "Cotonou", flag: "TG-BJ" },
  { from: "Douala", to: "Libreville", flag: "CM-GA" },
  { from: "Accra", to: "Lomé", flag: "GH-TG" },
  { from: "Abidjan", to: "Dakar", flag: "CI-SN" }],

  maritime: [
  { from: "Dakar", to: "Marseille", flag: "SN-FR", hot: true },
  { from: "Abidjan", to: "Le Havre", flag: "CI-FR", hot: true },
  { from: "Douala", to: "Anvers", flag: "CM-BE" },
  { from: "Lomé", to: "Rotterdam", flag: "TG-NL" }],

  aerien: [
  { from: "Paris", to: "Dakar", flag: "FR-SN", hot: true },
  { from: "Paris", to: "Abidjan", flag: "FR-CI", hot: true },
  { from: "Bruxelles", to: "Kinshasa", flag: "BE-CD" },
  { from: "Casablanca", to: "Paris", flag: "MA-FR" }],

  mobility: [
  { from: "Dakar", to: "Saint-Louis", flag: "SN-SN", hot: true },
  { from: "Abidjan", to: "Yamoussoukro", flag: "CI-CI", hot: true },
  { from: "Dakar", to: "Thiès", flag: "SN-SN" },
  { from: "Douala", to: "Yaoundé", flag: "CM-CM" }]

};

const TRUST_ITEMS_BY_MODE: Record<string, {icon: typeof Shield;title: string;desc: string;color: string;}[]> = {
  default: [
  { icon: Shield, title: "Paiement sécurisé", desc: "Escrow protégé jusqu'à livraison", color: "text-emerald-500 bg-emerald-500/10" },
  { icon: Globe, title: "Multi-corridors", desc: "Afrique, Europe, Amériques", color: "text-blue-500 bg-blue-500/10" },
  { icon: Zap, title: "Suivi temps réel", desc: "QR code + notifications push", color: "text-amber-500 bg-amber-500/10" },
  { icon: Award, title: "GP vérifiés", desc: "KYC complet + avis clients", color: "text-purple-500 bg-purple-500/10" }],

  routier: [
  { icon: Shield, title: "Escrow sécurisé", desc: "Paiement garanti à la livraison", color: "text-emerald-500 bg-emerald-500/10" },
  { icon: Truck, title: "Flotte vérifiée", desc: "Véhicules certifiés & assurés", color: "text-blue-500 bg-blue-500/10" },
  { icon: Zap, title: "Négociation directe", desc: "Propositions en temps réel", color: "text-amber-500 bg-amber-500/10" },
  { icon: Route, title: "Corridors routiers", desc: "Afrique de l'Ouest & Centrale", color: "text-purple-500 bg-purple-500/10" }],

  maritime: [
  { icon: Shield, title: "Assurance cargo", desc: "Protection marchandises incluse", color: "text-emerald-500 bg-emerald-500/10" },
  { icon: Ship, title: "Groupage & FCL", desc: "LCL ou conteneur complet", color: "text-blue-500 bg-blue-500/10" },
  { icon: TrendingUp, title: "Suivi embarquement", desc: "Tracking port à port", color: "text-amber-500 bg-amber-500/10" },
  { icon: Users, title: "Transitaires vérifiés", desc: "Partenaires certifiés", color: "text-purple-500 bg-purple-500/10" }],

  aerien: [
  { icon: Zap, title: "Livraison express", desc: "2-5 jours porte à porte", color: "text-amber-500 bg-amber-500/10" },
  { icon: Shield, title: "Colis sécurisé", desc: "Assurance incluse", color: "text-emerald-500 bg-emerald-500/10" },
  { icon: Plane, title: "Vols directs", desc: "Réseau aérien étendu", color: "text-blue-500 bg-blue-500/10" },
  { icon: Award, title: "Agents certifiés", desc: "Fret aérien homologué", color: "text-purple-500 bg-purple-500/10" }],

   bagages: [
  { icon: Shield, title: "Escrow protégé", desc: "Paiement sécurisé", color: "text-emerald-500 bg-emerald-500/10" },
  { icon: Luggage, title: "Bagages accompagnés", desc: "Suivi personnalisé", color: "text-blue-500 bg-blue-500/10" },
  { icon: Award, title: "GP notés", desc: "Avis clients vérifiés", color: "text-amber-500 bg-amber-500/10" },
  { icon: Globe, title: "Réseau mondial", desc: "Afrique, Europe, Amériques", color: "text-purple-500 bg-purple-500/10" }],

  mobility: [
  { icon: Shield, title: "Réservation sécurisée", desc: "Paiement garanti & QR ticket", color: "text-emerald-500 bg-emerald-500/10" },
  { icon: Car, title: "Véhicules vérifiés", desc: "Flotte inspectée & assurée", color: "text-blue-500 bg-blue-500/10" },
  { icon: Zap, title: "Départs fréquents", desc: "Navettes quotidiennes", color: "text-amber-500 bg-amber-500/10" },
  { icon: Users, title: "Chauffeurs certifiés", desc: "Permis & expérience validés", color: "text-purple-500 bg-purple-500/10" }]

};

const ACTIVE_STATUSES = ["pending", "accepted", "collected", "paid_held", "checked_in", "weight_pending_payment", "scheduled_departure", "in_transit", "arrived_destination", "delivery_pending"];

const TYPE_MAP: Record<string, string[]> = {
  aerien: ["aerien"],
  maritime: ["maritime"],
  routier: ["routier"],
  bagages: ["bagages_international", "bagages_accompagnes", "navette", "voyageur"],
  mobility: ["mobility"],
};

// ── Quick Actions Grid ──
function QuickActionsGrid({ navigate, activeTab }: {navigate: (path: string) => void;activeTab: string;}) {
  const actions = useMemo(() => {
    const base = [
    { icon: Send, label: "Envoyer", to: "/envoyer", color: "text-primary bg-primary/10" },
    { icon: ScanLine, label: "Suivi", to: "/tracking", color: "text-blue-500 bg-blue-500/10" },
    { icon: FileText, label: "Demandes", to: "/mes-demandes", color: "text-purple-500 bg-purple-500/10" },
    { icon: Wallet, label: "Portefeuille", to: "/portefeuille", color: "text-emerald-500 bg-emerald-500/10" }];

    return base;
  }, [activeTab]);

  return (
    <div className="px-4 pb-3">
      <div className="grid grid-cols-4 gap-2">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => navigate(a.to)}
            className="flex flex-col items-center gap-1 py-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${a.color}`}>
              <a.icon className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-semibold text-foreground">{a.label}</span>
          </button>
        ))}
      </div>
    </div>);
}




// ── Tab-Specific Header Banner ──
function TabBanner({ tab, modeConfig }: {tab: string;modeConfig: typeof MODE_CONFIG["all"];}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-4 mb-2"
    >
      <div className="flex items-center justify-between py-1.5 px-3 bg-muted/40 rounded-lg border border-border/50">
        <p className="text-[11px] text-muted-foreground">{modeConfig.subtitle}</p>
      </div>
    </motion.div>
  );
}

// ── Popular Routes ──
function PopularRoutesSection({ routes, onSelect, tabId



}: {routes: typeof POPULAR_ROUTES_BY_MODE["all"];onSelect: (from: string, to: string) => void;tabId: string;}) {
  const titleMap: Record<string, string> = {
    all: "Routes populaires",
    routier: "Corridors populaires",
    maritime: "Routes maritimes",
    aerien: "Liaisons aeriennes",
    bagages: "Trajets GP populaires"
  };

  return (
    <div className="px-4 pb-4">
      <h2 className="text-sm font-bold text-foreground mb-2 tracking-tight">{titleMap[tabId] || "Routes populaires"}</h2>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {routes.map((route, idx) => (
          <button
            key={`${route.from}-${route.to}-${idx}`}
            onClick={() => onSelect(route.from, route.to)}
            className="flex-shrink-0 bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2 hover:border-primary/30 transition-colors">
            <span className="text-xs font-medium text-foreground whitespace-nowrap">{route.from}</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground whitespace-nowrap">{route.to}</span>
            {route.hot && <span className="text-[8px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full font-bold">HOT</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Trust Items ──
function TrustSection({ items, title


}: {items: typeof TRUST_ITEMS_BY_MODE["default"];title: string;}) {
  return (
    <div className="px-4 pb-5">
      <h2 className="text-sm font-bold text-foreground mb-2 tracking-tight">{title}</h2>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item, idx) =>
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.05 }}
          className="bg-card border border-border rounded-xl p-3">
          
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${item.color}`}>
              <item.icon className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-foreground leading-tight">{item.title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{item.desc}</p>
          </motion.div>
        )}
      </div>
    </div>);

}

// ── Mode CTA Banner ──
function ModeCTA({ activeTab, modeConfig, onClick



}: {activeTab: string;modeConfig: typeof MODE_CONFIG["all"];onClick: () => void;}) {
  const ctaMap: Record<string, {title: string;desc: string;}> = {
    routier: { title: "Besoin d'un transport sur mesure ?", desc: "Créez une mission et recevez des propositions de transporteurs vérifiés" },
    maritime: { title: "Expédiez par conteneur", desc: "Solutions LCL, FCL et véhicules — devis personnalisé" },
    aerien: { title: "Fret aérien express", desc: "Livraison rapide 2-5 jours, porte à porte" },
    bagages: { title: "Trouvez un GP de confiance", desc: "Envoi de bagages accompagnés en toute sécurité" },
    all: { title: "Envoyez votre premier colis", desc: "Comparez les offres et choisissez le meilleur transporteur" }
  };
  const cta = ctaMap[activeTab] || ctaMap.all;

  return (
    <div className="px-4 pb-5">
      <div className={`bg-gradient-to-br ${modeConfig.gradient} border border-border rounded-2xl p-4 text-center`}>
        <modeConfig.icon className="w-8 h-8 text-primary mx-auto mb-2 opacity-60" />
        <p className="text-sm font-bold text-foreground mb-0.5">{cta.title}</p>
        <p className="text-[11px] text-muted-foreground mb-3 leading-snug max-w-[260px] mx-auto">{cta.desc}</p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onClick}
          className="px-6 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow-sm">
          
          {modeConfig.searchButtonLabel}
        </motion.button>
      </div>
    </div>);

}

// ── Empty State ──
function EmptyOffers({ modeConfig, onAction }: {modeConfig: typeof MODE_CONFIG["all"];onAction: () => void;}) {
  return (
    <div className="bg-muted/30 border border-dashed border-border rounded-2xl p-8 text-center">
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
        <modeConfig.icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">{modeConfig.emptyLabel}</p>
      <p className="text-[11px] text-muted-foreground mb-3">{modeConfig.emptyDesc}</p>
      <button onClick={onAction} className="text-xs text-primary font-semibold">
        Voir toutes les offres →
      </button>
    </div>);

}

// ═════════════════════════════════════════════════
// ── MAIN COMPONENT ──
// ═════════════════════════════════════════════════

export function ClientAppHome({
  userName, recentOrders = [], customRequests = [], movingRequests = [],
  unreadMessages = 0, activeOrdersCount = 0, userId, userCity
}: ClientAppHomeProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const firstName = userName?.split(" ")[0] || "";
  const greeting = new Date().getHours() < 12 ? "Bonjour" : new Date().getHours() < 18 ? "Bon après-midi" : "Bonsoir";

  const [fullScreenOrderId, setFullScreenOrderId] = useState<string | null>(null);
  const [requestPopup, setRequestPopup] = useState<{type: "custom" | "moving";item: any;} | null>(null);
  const [activeTab, setActiveTab] = useState(GP_ONLY_MODE ? "bagages" : "all");
  const [offresPopupOpen, setOffresPopupOpen] = useState(false);
  const [offresPopupSearch, setOffresPopupSearch] = useState<{origin?: string;dest?: string;tab?: string;}>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const modeConfig = MODE_CONFIG[activeTab] || MODE_CONFIG.all;
  const isRoutier = activeTab === "routier";
  const isMobility = activeTab === "mobility";

  // Search
  const [searchOrigin, setSearchOrigin] = useState(userCity || "");
  const [searchDest, setSearchDest] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [activePicker, setActivePicker] = useState<"origin" | "dest" | null>(null);
  const [cityQuery, setCityQuery] = useState("");
  const [routierWeight, setRoutierWeight] = useState("");

  useEffect(() => {if (userCity && !searchOrigin) setSearchOrigin(userCity);}, [userCity]);

  useEffect(() => {
    if (searchParams.get("offres") === "1") {
      setOffresPopupOpen(true);
      searchParams.delete("offres");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  const swapOriginDest = () => {
    const o = searchOrigin;
    setSearchOrigin(searchDest);
    setSearchDest(o);
  };

  const { deliveredOrder, role: deliveryRole, dismiss: dismissDelivery, pendingRecipientFeedback } = usePostDeliveryDetection(userId);

  const filteredCities = useMemo(() => {
    if (!cityQuery) return FEATURED_CITIES;
    const q = cityQuery.toLowerCase();
    return WORLD_CITIES.filter((c) => c.city.toLowerCase().includes(q));
  }, [cityQuery]);

  const handleMainAction = () => {
    const params = new URLSearchParams();
    if (searchOrigin) params.set("origin", searchOrigin);
    if (searchDest) params.set("dest", searchDest);
    if (searchDate) params.set("date", searchDate);
    const tabParam = isRoutier ? "routier" : isMobility ? "mobility" : (activeTab !== "all" ? activeTab : undefined);
    if (tabParam) params.set("tab", tabParam);
    params.set("popup", "1");
    navigate(`/freight-board?${params}`);
  };

  const openOffresPopup = (origin?: string, dest?: string, tab?: string) => {
    const params = new URLSearchParams();
    if (origin || searchOrigin) params.set("origin", origin || searchOrigin);
    if (dest || searchDest) params.set("dest", dest || searchDest);
    const t = tab || (activeTab !== "all" ? activeTab : undefined);
    if (t) params.set("tab", t);
    params.set("popup", "1");
    navigate(`/freight-board?${params}`);
  };

  const goToOffres = () => navigate("/freight-board?popup=1");

  // Offers (GP only in GP_ONLY_MODE, otherwise GP + Mobility)
  const [offers, setOffers] = useState<any[]>([]);
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    // Only show GP (bagages_international) and GP occasionnel offers — exclude aerien, routier, maritime
    const gpQuery = supabase
          .from("gp_offers")
          .select("*, gp_profiles(business_name, rating, total_reviews, subscription, gp_type)")
          .eq("status", "active")
          .in("transport_type", ["bagages_international", "bagages_accompagnes", "navette", "occasionnel"] as any)
          .gte("departure_date", today)
          .order("departure_date", { ascending: true })
          .limit(50);

    if (GP_ONLY_MODE) {
      gpQuery.then(({ data }) => {
        setOffers(data || []);
      });
    } else {
      Promise.all([
        gpQuery,
        supabase
          .from("mobility_offers")
          .select("*, mobility_profiles(business_name, rating)")
          .eq("status", "active")
          .gte("departure_date", today)
          .order("departure_date", { ascending: true })
          .limit(20),
      ]).then(([gpRes, mobRes]) => {
        const gpOffers = gpRes.data || [];
        const mobOffers = (mobRes.data || []).map((mo: any) => ({
          ...mo,
          transport_type: "mobility",
          price_per_kg: mo.price_per_seat,
          available_capacity: mo.available_seats,
          total_capacity: mo.total_seats,
          gp_profiles: mo.mobility_profiles ? {
            business_name: mo.mobility_profiles.business_name,
            rating: mo.mobility_profiles.rating || 0,
            total_reviews: 0,
            subscription: "free",
          } : null,
        }));
        setOffers([...gpOffers, ...mobOffers]);
      });
    }
  }, []);

  // Routier offers (from gp_offers with transport_type routier)
  // Routier offers (disabled in GP_ONLY_MODE)
  const [routierOffers, setRoutierOffers] = useState<any[]>([]);
  useEffect(() => {
    if (!isRoutier || GP_ONLY_MODE) return;
    supabase.
    from("gp_offers").
    select("*, gp_profiles(business_name, rating, subscription)").
    eq("transport_type", "routier").
    eq("status", "active").
    order("departure_date", { ascending: true }).
    limit(6).
    then(({ data }) => {if (data) setRoutierOffers(data);});
  }, [isRoutier]);

  const filteredOffers = useMemo(() => {
    let result = offers;
    if (activeTab !== "all") {
      result = result.filter((o) => (TYPE_MAP[activeTab] || []).includes(o.transport_type));
    }
    if (searchOrigin) {
      result = result.filter((o) => o.origin_city?.toLowerCase().includes(searchOrigin.toLowerCase()));
    }
    if (searchDest) {
      result = result.filter((o) => o.destination_city?.toLowerCase().includes(searchDest.toLowerCase()));
    }
    // If no search active, show all offers for this tab
    // Rank by subscription boost + rating (same as "all" tab logic)
    const scoreOffer = (o: any) => {
      const sub = o.gp_profiles?.subscription || "free";
      const subBoost = sub === "pro" ? 1000 : sub === "premium" ? 500 : 0;
      return subBoost + (o.gp_profiles?.rating || 0);
    };
    return result.sort((a, b) => scoreOffer(b) - scoreOffer(a));
  }, [offers, activeTab, searchOrigin, searchDest]);

  const activeOrders = recentOrders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const selectedOrder = fullScreenOrderId ? activeOrders.find((o) => o.id === fullScreenOrderId) : null;
  const popularRoutes = POPULAR_ROUTES_BY_MODE[activeTab] || POPULAR_ROUTES_BY_MODE.all;
  const trustItems = TRUST_ITEMS_BY_MODE[activeTab] || TRUST_ITEMS_BY_MODE.default;

  const handleCitySelect = (city: string) => {
    if (activePicker === "origin") setSearchOrigin(city);else
    setSearchDest(city);
    setActivePicker(null);
    setCityQuery("");
  };

  const handleRouteSelect = (from: string, to: string) => {
    setSearchOrigin(from);
    setSearchDest(to);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      className="flex flex-col relative bg-background"
      style={{
        height: "calc(100vh - 60px - 64px - env(safe-area-inset-top) - env(safe-area-inset-bottom))",
        minHeight: "400px"
      }}>
      
      {/* Post-Delivery Flow */}
      <AnimatePresence>
        {deliveredOrder &&
        <PostDeliveryFlow
          order={deliveredOrder}
          role={deliveryRole}
          onClose={() => dismissDelivery(deliveredOrder.id)}
          onNavigate={navigate} />

        }
      </AnimatePresence>

      {/* Full-Screen Order Overlay */}
      <AnimatePresence>
        {selectedOrder &&
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background" style={{ paddingTop: "env(safe-area-inset-top)" }}>
            <FullScreenOrderDetails order={selectedOrder} onClose={() => setFullScreenOrderId(null)} navigate={navigate} />
          </motion.div>
        }
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto" ref={scrollRef}>

        {/* Alerts */}
        {userId && <div className="px-4"><WeightValidationAlert userId={userId} /></div>}

        {/* ── TRANSPORT TABS (hidden in GP_ONLY_MODE, shown when multiple tabs) ── */}
        {!GP_ONLY_MODE && TRANSPORT_TABS.length > 1 && (
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50">
          <div className="px-2 pt-1 pb-0">
            <div className="flex gap-0">
              {TRANSPORT_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`relative flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-all border-b-2 ${
                    isActive ?
                    "text-primary border-primary" :
                    "text-muted-foreground border-transparent hover:text-foreground"}`
                    }>
                    
                    <tab.icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
                    <span>{tab.label}</span>
                  </button>);

              })}
            </div>
          </div>
        </div>
        )}

        {/* ── TAB BANNER (non-"all" tabs) — In GP_ONLY, show GP inline ── */}
        {GP_ONLY_MODE ? (
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-primary">GP</span>
              <span className="mx-1">·</span>
              {modeConfig.subtitle}
            </p>
          </div>
        ) : (
          <div className="pt-3">
            <TabBanner tab={activeTab} modeConfig={modeConfig} />
          </div>
        )}

        {/* ── SEARCH ENGINE ── */}
        <div className="px-4 pb-3">
          <div className={`bg-card border overflow-hidden shadow-sm relative rounded-2xl ${
          isRoutier ? "border-primary/40" : "border-border"}`
          }>
            {/* Origin */}
            <button
              onClick={() => {setCityQuery("");setActivePicker("origin");}}
              className="w-full flex items-center gap-3 px-3.5 py-3 text-left border-b border-border/40">
              
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className={`flex-1 text-sm ${searchOrigin ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {searchOrigin || modeConfig.searchPlaceholderOrigin}
              </span>
              {searchOrigin && <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">Modifier</span>}
            </button>

            {/* Swap button */}
            {(searchOrigin || searchDest) &&
            <button
              onClick={swapOriginDest}
              className="absolute right-3 top-[48px] -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-background border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Interchanger">
              
                <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
              </button>
            }

            {/* Destination */}
            <button
              onClick={() => {setCityQuery("");setActivePicker("dest");}}
              className="w-full flex items-center gap-3 px-3.5 py-3 text-left border-b border-border/40">
              
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <span className={`flex-1 text-sm ${searchDest ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {searchDest || modeConfig.searchPlaceholderDest}
              </span>
              {searchDest && <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">Modifier</span>}
            </button>


            {/* Date */}
            <div className="flex items-center gap-3 px-3.5 py-3">
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground outline-none"
                style={{ colorScheme: "dark" }} />
              
            </div>

            {/* Search button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleMainAction}
              className="w-full font-bold text-center py-3.5 text-sm bg-primary text-primary-foreground rounded-b-2xl flex items-center justify-center gap-2">
              
              <Search className="w-4 h-4" />
              {modeConfig.searchButtonLabel}
            </motion.button>
          </div>

        </div>

        

        {/* ── OFFERS / MISSIONS ── */}
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-foreground tracking-tight">{modeConfig.offersTitle}</h2>
            <button onClick={goToOffres} className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline">
                Tout voir <ChevronRight className="w-3 h-3" />
              </button>
          </div>
        </div>

        <div className="px-4 pb-4">
          {isRoutier ?
          routierOffers.length > 0 ?
          <div className="space-y-1.5">
                {routierOffers
                  .sort((a: any, b: any) => {
                    const subScore = (o: any) => { const s = o.gp_profiles?.subscription || "free"; return s === "pro" ? 1000 : s === "premium" ? 500 : 0; };
                    return (subScore(b) + (b.gp_profiles?.rating || 0)) - (subScore(a) + (a.gp_profiles?.rating || 0));
                  })
                  .slice(0, 4)
                  .map((offer, idx) => {
                  const sub = offer.gp_profiles?.subscription;
                  return (
                    <HomeOfferCard
                      key={offer.id}
                      offer={offer}
                      index={idx}
                      modeLabel="Routier"
                      subscriptionBadge={(sub === "premium" || sub === "pro") ? sub : undefined}
                    />
                  );
                })}
                {routierOffers.length > 4 && (
                  <button onClick={goToOffres} className="w-full py-2.5 text-xs font-semibold text-primary flex items-center justify-center gap-1 hover:bg-primary/5 rounded-xl transition-colors border border-dashed border-primary/20">
                    Voir toutes les offres <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div> :

          <EmptyOffers modeConfig={modeConfig} onAction={goToOffres} /> :

          activeTab === "all" ?
          (() => {
            const modes = ["mobility", "routier", "maritime", "aerien", "bagages_international"];
            const modeLabels: Record<string, string> = {
              routier: "Routier", maritime: "Maritime", aerien: "Aérien", bagages_international: "GP via Bagages", bagages_accompagnes: "GP via Bagages", navette: "GP via Bagages", mobility: "Mobility"
            };
            const modeIcons: Record<string, typeof Package> = {
              routier: Truck, maritime: Ship, aerien: Plane, bagages_international: Luggage, bagages_accompagnes: Luggage, mobility: Car
            };

            // Helper: premium/pro score boost + rating
            const scoreOffer = (o: any) => {
              const sub = o.gp_profiles?.subscription || "free";
              const subBoost = sub === "pro" ? 1000 : sub === "premium" ? 500 : 0;
              return subBoost + (o.gp_profiles?.rating || 0);
            };

            // If search is active, show filtered results across all types
            const hasSearch = searchOrigin || searchDest;
            if (hasSearch) {
              const searchResults = offers
                .filter((o) => {
                  if (searchOrigin && !o.origin_city?.toLowerCase().includes(searchOrigin.toLowerCase())) return false;
                  if (searchDest && !o.destination_city?.toLowerCase().includes(searchDest.toLowerCase())) return false;
                  return true;
                })
                .sort((a, b) => scoreOffer(b) - scoreOffer(a))
                .slice(0, 4);

              return searchResults.length > 0 ?
                <div className="space-y-1.5">
                  {searchResults.map((offer: any, idx: number) => {
                    const mode = (offer.transport_type === "navette" || offer.transport_type === "bagages_accompagnes") ? "bagages_international" : offer.transport_type;
                    const ModeIcon = modeIcons[mode] || Package;
                     return (
                      <div key={offer.id}>
                        <HomeOfferCard offer={offer} index={idx} modeLabel={modeLabels[mode] || mode} />
                      </div>);
                  })}
                  <button
                    onClick={goToOffres}
                    className="w-full py-2.5 text-xs font-semibold text-primary flex items-center justify-center gap-1 hover:bg-primary/5 rounded-xl transition-colors border border-dashed border-primary/20">
                    Voir toutes les offres <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div> :
                <EmptyOffers modeConfig={modeConfig} onAction={goToOffres} />;
            }

            // Default: 1 best offer per type (premium/pro first, then highest rating)
            const top4 = modes.
            map((mode) => {
              const modeOffers = offers.
              filter((o) => o.transport_type === mode || mode === "bagages_international" && (o.transport_type === "bagages_international" || o.transport_type === "bagages_accompagnes" || o.transport_type === "navette")).
              sort((a, b) => scoreOffer(b) - scoreOffer(a));
              return modeOffers[0] ? { ...modeOffers[0], _mode: mode } : null;
            }).
            filter(Boolean);

            return top4.length > 0 ?
            <div className="space-y-1.5">
                  {top4.map((offer: any, idx: number) => {
                const ModeIcon = modeIcons[offer._mode] || Package;
                const sub = offer.gp_profiles?.subscription;
                return (
                  <div key={offer.id}>
                        <HomeOfferCard offer={offer} index={idx} modeLabel={modeLabels[offer._mode]} subscriptionBadge={(sub === "premium" || sub === "pro") ? sub : undefined} />
                      </div>);

              })}
                  <button
                onClick={goToOffres}
                className="w-full py-2.5 text-xs font-semibold text-primary flex items-center justify-center gap-1 hover:bg-primary/5 rounded-xl transition-colors border border-dashed border-primary/20">
                
                    Voir toutes les offres <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div> :

            <EmptyOffers modeConfig={modeConfig} onAction={() => setActiveTab("bagages")} />;

          })() :
          filteredOffers.length > 0 ?
          <div className="space-y-1.5">
              {filteredOffers
                .sort((a: any, b: any) => {
                  const subScore = (o: any) => { const s = o.gp_profiles?.subscription || "free"; return s === "pro" ? 1000 : s === "premium" ? 500 : 0; };
                  return (subScore(b) + (b.gp_profiles?.rating || 0)) - (subScore(a) + (a.gp_profiles?.rating || 0));
                })
                .slice(0, 4).map((offer, idx) =>
            <HomeOfferCard key={offer.id} offer={offer} index={idx} />
            )}
              {filteredOffers.length > 4 &&
            <button onClick={goToOffres} className="w-full py-2 text-xs font-semibold text-primary flex items-center justify-center gap-1 hover:bg-primary/5 rounded-xl transition-colors">
                  +{filteredOffers.length - 4} autres offres <ChevronRight className="w-3.5 h-3.5" />
                </button>
            }
            </div> :

          <EmptyOffers modeConfig={modeConfig} onAction={() => setActiveTab("all")} />
          }
        </div>

        {/* ── BOTTOM SECTIONS ── */}
        {activeTab === "all" ?
        <>

            {/* Popular routes carousel */}
            <PopularRoutesSection routes={popularRoutes} onSelect={handleRouteSelect} tabId="all" />

            {/* Canvas carousel */}
            <KonnektCanvasCarousel />

            {/* Trust */}
            <TrustSection items={trustItems} title="Pourquoi Konnekt" />
          </> :

        <>
            {/* Popular routes */}
            <PopularRoutesSection routes={popularRoutes} onSelect={handleRouteSelect} tabId={activeTab} />

            {/* Trust / Advantages */}
            <TrustSection
            items={trustItems}
            title={
            activeTab === "routier" ? "Avantages Routier" :
            activeTab === "maritime" ? "Avantages Maritime" :
            activeTab === "aerien" ? "Avantages Aerien" :
            activeTab === "mobility" ? "Avantages Mobility" :
            "Avantages GP"
            } />
          
            {/* Mobility-specific CTA */}
            {isMobility ? (
              <div className="px-4 pb-4">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/mobility/search")}
                  className="w-full bg-gradient-to-r from-primary to-accent rounded-2xl p-4 flex items-center gap-3 shadow-lg"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary-foreground/20 flex items-center justify-center shrink-0">
                    <Bus className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-primary-foreground">Réserver un ticket</p>
                    <p className="text-[10px] text-primary-foreground/70">Navettes inter-villes · Chauffeurs privés · Transport de groupe</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-primary-foreground shrink-0" />
                </motion.button>
              </div>
            ) : (
              <ModeCTA activeTab={activeTab} modeConfig={modeConfig} onClick={handleMainAction} />
            )}
          </>
        }

        {/* Bottom spacing for mobile nav */}
        <div className="h-24" />
      </div>

      {/* Offers Popup */}
      <FullScreenOffresPopup
        open={offresPopupOpen}
        onClose={() => setOffresPopupOpen(false)}
        initialOrigin={offresPopupSearch.origin}
        initialDestination={offresPopupSearch.dest}
        initialTab={offresPopupSearch.tab} />
      

      {/* Request Popup */}
      <RequestDetailsPopup
        open={!!requestPopup}
        onClose={() => setRequestPopup(null)}
        type={requestPopup?.type || "custom"}
        item={requestPopup?.item}
        navigate={navigate} />
      

      {/* City Picker Drawer */}
      <Drawer open={!!activePicker} onOpenChange={(open) => {if (!open) setActivePicker(null);}}>
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
                autoFocus />
              
            </div>
          </div>
          <div className="overflow-y-auto overscroll-contain px-2 pb-6" style={{ maxHeight: "55vh", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
            {filteredCities.slice(0, 30).map((city) =>
            <button
              key={`${city.city}-${city.country}`}
              onClick={() => handleCitySelect(city.city)}
              className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-left hover:bg-muted/60 active:bg-muted transition-colors">
              
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium flex-1">{city.city}</span>
              </button>
            )}
            {filteredCities.length === 0 && cityQuery &&
            <button
              onClick={() => handleCitySelect(cityQuery)}
              className="w-full py-3 text-sm text-primary font-medium text-center">
              
                Utiliser "{cityQuery}"
              </button>
            }
          </div>
        </DrawerContent>
      </Drawer>
    </div>);

}