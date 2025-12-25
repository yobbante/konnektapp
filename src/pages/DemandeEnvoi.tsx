import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowRight, ArrowLeft, Package, MapPin, Calendar, Scale, 
  FileText, Zap, Truck, Ship, Plane, Briefcase, Info, CheckCircle,
  Search, Star, Sparkles, Loader2
} from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur";
type FlowType = "offres" | "personnalisee" | null;

interface Offer {
  id: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  departure_date: string;
  price_per_kg: number;
  transport_type: TransportType;
  available_capacity: number;
  status: string;
  gp_profile: {
    business_name: string;
    rating: number | null;
  } | null;
}

const transportOptions = [
  { type: "express" as TransportType, icon: Zap, title: "Express", description: "Livraison rapide" },
  { type: "routier" as TransportType, icon: Truck, title: "Routier", description: "Économique" },
  { type: "maritime" as TransportType, icon: Ship, title: "Maritime", description: "Gros volumes" },
  { type: "aerien" as TransportType, icon: Plane, title: "Aérien", description: "International" },
  { type: "voyageur" as TransportType, icon: Briefcase, title: "Voyageur", description: "Via GP" },
];

const countries = [
  { code: "SN", name: "Sénégal", flag: "🇸🇳" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "GN", name: "Guinée", flag: "🇬🇳" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "AE", name: "Dubai", flag: "🇦🇪" },
];
export default function DemandeEnvoi() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [flowType, setFlowType] = useState<FlowType>(null);
  const [step, setStep] = useState(1);
  const [selectedTransport, setSelectedTransport] = useState<TransportType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    originCity: "",
    originCountry: "SN",
    destinationCity: "",
    destinationCountry: "CI",
    dateEnvoi: "",
    poids: "",
    length: "",
    width: "",
    height: "",
    valeurDeclaree: "",
    description: "",
    urgent: false,
  });

  // Fetch active offers from database
  useEffect(() => {
    if (flowType === "offres") {
      fetchOffers();
    }
  }, [flowType]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("gp_offers")
        .select(`
          id,
          origin_city,
          origin_country,
          destination_city,
          destination_country,
          departure_date,
          price_per_kg,
          transport_type,
          available_capacity,
          status,
          gp_id
        `)
        .eq("status", "active")
        .gte("departure_date", new Date().toISOString())
        .order("departure_date", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const gpIds = [...new Set(data.map(o => o.gp_id))];
        const { data: profiles } = await supabase
          .from("public_gp_profiles")
          .select("id, business_name, rating")
          .in("id", gpIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const offersWithProfiles = data.map(offer => ({
          ...offer,
          transport_type: offer.transport_type as TransportType,
          gp_profile: profilesMap.get(offer.gp_id) || null
        }));

        setOffers(offersWithProfiles);
      } else {
        setOffers([]);
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter offers based on transport type and search
  const filteredOffers = offers.filter((offer) => {
    const matchesType = !selectedTransport || offer.transport_type === selectedTransport;
    const matchesSearch = !searchQuery || 
      offer.origin_city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.destination_city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (offer.gp_profile?.business_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d MMM", { locale: fr });
    } catch {
      return dateStr;
    }
  };

  const handleNext = () => setStep((prev) => Math.min(prev + 1, 3));
  const handleBack = () => {
    if (step === 1 && flowType === "personnalisee") {
      setFlowType(null);
    } else {
      setStep((prev) => Math.max(prev - 1, 1));
    }
  };

  const handleSubmit = () => {
    toast({
      title: "Demande envoyée !",
      description: "Vous recevrez des offres de nos GP partenaires sous peu.",
    });
    navigate("/offres");
  };

  const handleSelectOffer = (offerId: string) => {
    navigate(`/offres/${offerId}`);
  };

  // Initial choice screen
  if (!flowType) {
    return (
      <div className="min-h-screen bg-background pb-safe">
        <MobileHeader />

        <div className="px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Envoyer un colis</h1>
            <p className="text-muted-foreground">Choisissez votre méthode d'envoi</p>
          </motion.div>

          <div className="space-y-4">
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => setFlowType("offres")}
              className="w-full mobile-card p-5 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Search className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">Choisir parmi les offres</h3>
                  <p className="text-sm text-muted-foreground">
                    Parcourez les offres disponibles et réservez directement
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="secondary" className="text-xs">Rapide</Badge>
                    <Badge variant="secondary" className="text-xs">Prix fixe</Badge>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </div>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => setFlowType("personnalisee")}
              className="w-full mobile-card p-5 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">Demande personnalisée</h3>
                  <p className="text-sm text-muted-foreground">
                    Décrivez vos besoins et recevez des offres sur mesure
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="secondary" className="text-xs">Sur mesure</Badge>
                    <Badge variant="secondary" className="text-xs">Multi-devis</Badge>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </div>
            </motion.button>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 p-4 bg-muted/50 rounded-xl"
          >
            <p className="text-sm text-muted-foreground text-center">
              💡 Astuce: Les offres existantes sont généralement moins chères et plus rapides à confirmer
            </p>
          </motion.div>
        </div>

        <MobileNav />
      </div>
    );
  }

  // Flow: Browse offers
  if (flowType === "offres") {
    return (
      <div className="min-h-screen bg-background pb-safe">
        <MobileHeader />

        <div className="px-4 py-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setFlowType(null)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-muted"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold">Offres disponibles</h1>
              <p className="text-sm text-muted-foreground">Sélectionnez une offre</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Ville, destination, transporteur..."
              className="pl-10 h-10 bg-muted/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Transport Type Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4 scrollbar-hide">
            <button
              onClick={() => setSelectedTransport(null)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !selectedTransport
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Tous
            </button>
            {transportOptions.map((option) => (
              <button
                key={option.type}
                onClick={() => setSelectedTransport(selectedTransport === option.type ? null : option.type)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedTransport === option.type
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <option.icon className="w-3.5 h-3.5" />
                {option.title}
              </button>
            ))}
          </div>

          {/* Results */}
          <p className="text-sm text-muted-foreground mb-3">
            {loading ? "Chargement..." : `${filteredOffers.length} offre${filteredOffers.length > 1 ? "s" : ""} disponible${filteredOffers.length > 1 ? "s" : ""}`}
          </p>

          {/* Offers List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {filteredOffers.map((offer, index) => (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <button
                    onClick={() => handleSelectOffer(offer.id)}
                    className="w-full mobile-card active:scale-[0.98] transition-transform text-left"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="secondary" className="text-xs">
                        {transportOptions.find(o => o.type === offer.transport_type)?.title || offer.transport_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(offer.departure_date)}</span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="font-medium">{offer.origin_city}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{offer.destination_city}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">
                            {(offer.gp_profile?.business_name || "T").charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{offer.gp_profile?.business_name || "Transporteur"}</p>
                          {offer.gp_profile?.rating && offer.gp_profile.rating > 0 ? (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-warning fill-warning" />
                              <span className="text-xs text-muted-foreground">{offer.gp_profile.rating.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Nouveau</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{offer.price_per_kg.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">FCFA/kg</p>
                      </div>
                    </div>
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {filteredOffers.length === 0 && (
            <div className="text-center py-8">
              <Package className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Aucune offre trouvée</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Créez une demande personnalisée
              </p>
              <Button
                variant="default"
                size="sm"
                onClick={() => setFlowType("personnalisee")}
              >
                <Sparkles className="w-4 h-4" />
                Demande personnalisée
              </Button>
            </div>
          )}

          {/* CTA */}
          {filteredOffers.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-4 p-4 rounded-xl bg-muted/50 border border-border text-center"
            >
              <p className="text-sm text-muted-foreground mb-3">
                Vous ne trouvez pas ce que vous cherchez ?
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFlowType("personnalisee")}
                className="w-full"
              >
                <Sparkles className="w-4 h-4" />
                Créer une demande personnalisée
              </Button>
            </motion.div>
          )}
        </div>

        <MobileNav />
      </div>
    );
  }

  // Flow: Personalized request (existing flow)
  return (
    <div className="min-h-screen bg-background pb-safe">
      <MobileHeader />

      <div className="px-4 py-4">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-8 h-1 mx-1 rounded ${step > s ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Transport Type */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold mb-1">Type de transport</h1>
              <p className="text-sm text-muted-foreground">Sélectionnez le mode adapté</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {transportOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => setSelectedTransport(option.type)}
                  className={`mobile-card flex flex-col items-center text-center p-4 transition-all ${
                    selectedTransport === option.type
                      ? "ring-2 ring-primary bg-primary/5"
                      : ""
                  }`}
                >
                  <option.icon className={`w-8 h-8 mb-2 ${
                    selectedTransport === option.type ? "text-primary" : "text-muted-foreground"
                  }`} />
                  <span className="font-medium text-sm">{option.title}</span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="w-4 h-4" />
                Retour
              </Button>
              <Button
                variant="default"
                onClick={handleNext}
                disabled={!selectedTransport}
                className="flex-1"
              >
                Continuer
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold mb-1">Détails de l'envoi</h1>
              <p className="text-sm text-muted-foreground">Renseignez les informations</p>
            </div>

            <div className="space-y-4">
              {/* Origin */}
              <div className="mobile-card">
                <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> Départ
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="h-10 px-3 rounded-lg border border-input bg-background text-sm"
                    value={formData.originCountry}
                    onChange={(e) => setFormData({ ...formData, originCountry: e.target.value })}
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                    ))}
                  </select>
                  <Input
                    placeholder="Ville"
                    value={formData.originCity}
                    onChange={(e) => setFormData({ ...formData, originCity: e.target.value })}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Destination */}
              <div className="mobile-card">
                <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-accent" /> Destination
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="h-10 px-3 rounded-lg border border-input bg-background text-sm"
                    value={formData.destinationCountry}
                    onChange={(e) => setFormData({ ...formData, destinationCountry: e.target.value })}
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                    ))}
                  </select>
                  <Input
                    placeholder="Ville"
                    value={formData.destinationCity}
                    onChange={(e) => setFormData({ ...formData, destinationCity: e.target.value })}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Date & Weight */}
              <div className="mobile-card">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Date souhaitée</Label>
                    <Input
                      type="date"
                      value={formData.dateEnvoi}
                      onChange={(e) => setFormData({ ...formData, dateEnvoi: e.target.value })}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Poids (kg)</Label>
                    <Input
                      type="number"
                      placeholder="5"
                      value={formData.poids}
                      onChange={(e) => setFormData({ ...formData, poids: e.target.value })}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>

              {/* Dimensions */}
              <div className="mobile-card">
                <Label className="text-sm font-medium mb-2">Dimensions (cm)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    placeholder="L"
                    value={formData.length}
                    onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                    className="h-10"
                  />
                  <Input
                    type="number"
                    placeholder="l"
                    value={formData.width}
                    onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                    className="h-10"
                  />
                  <Input
                    type="number"
                    placeholder="H"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="mobile-card">
                <Label className="text-sm font-medium mb-2">Description du contenu</Label>
                <Textarea
                  placeholder="Décrivez brièvement votre colis..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Urgent */}
              <div className="mobile-card flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-warning" />
                  <span className="font-medium text-sm">Envoi urgent</span>
                </div>
                <Switch
                  checked={formData.urgent}
                  onCheckedChange={(checked) => setFormData({ ...formData, urgent: checked })}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="w-4 h-4" />
                Retour
              </Button>
              <Button variant="default" onClick={handleNext} className="flex-1">
                Continuer
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold mb-1">Récapitulatif</h1>
              <p className="text-sm text-muted-foreground">Vérifiez et confirmez</p>
            </div>

            <div className="mobile-card mb-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Informations de l'envoi
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transport</span>
                  <span className="font-medium capitalize">{selectedTransport}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Trajet</span>
                  <span className="font-medium">
                    {formData.originCity || "—"} → {formData.destinationCity || "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{formData.dateEnvoi || "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Poids</span>
                  <span className="font-medium">{formData.poids ? `${formData.poids} kg` : "—"}</span>
                </div>
                {formData.urgent && (
                  <Badge variant="default" className="gap-1">
                    <Zap className="w-3 h-3" /> Urgent
                  </Badge>
                )}
              </div>
            </div>

            <div className="bg-success/10 border border-success/20 rounded-xl p-3 mb-6">
              <p className="text-success text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Vous recevrez des offres de GP sous peu.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="w-4 h-4" />
                Modifier
              </Button>
              <Button variant="default" onClick={handleSubmit} className="flex-1">
                Envoyer
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
