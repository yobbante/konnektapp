import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  User, Star, Shield, AlertTriangle, Package, 
  CheckCircle, XCircle, Plane, MapPin, Calendar,
  Info, ChevronDown, ChevronUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatPricePerKg } from "@/components/ui/currency-selector";

interface TransporterInfoCardProps {
  gpId: string;
  originCity: string;
  destinationCity: string;
  departureDate?: string;
}

interface GPProfileData {
  id: string;
  business_name: string;
  rating: number;
  total_deliveries: number;
  verified_at: string | null;
  description: string | null;
}

interface OfferData {
  baggage_types_accepted: string[] | null;
  baggage_restrictions: string | null;
  explicit_restrictions: string[] | null;
  conditions: string | null;
  departure_date: string;
  arrival_date: string | null;
  available_capacity: number;
  price_per_kg: number;
  currency: string | null;
  flight_number: string | null;
  airline: string | null;
}

// Liste complète des restrictions possibles
const RESTRICTION_LABELS: Record<string, string> = {
  liquids: "Liquides",
  batteries: "Batteries/Piles",
  perfumes: "Parfums",
  electronics: "Électronique sensible",
  food_perishable: "Nourriture périssable",
  medications: "Médicaments",
  weapons: "Armes/Objets dangereux",
  flammable: "Produits inflammables",
  valuables: "Objets de valeur >500€",
  animals: "Animaux",
  plants: "Plantes",
  fragile_glass: "Verre/Céramique fragile",
  oversized: "Objets surdimensionnés",
  documents_official: "Documents officiels",
  currency: "Devises/Argent liquide",
};

const BAGGAGE_TYPE_LABELS: Record<string, string> = {
  valise: "Valise",
  carton: "Carton",
  sac: "Sac",
  colis: "Colis",
  enveloppe: "Enveloppe/Documents",
  electronique: "Électronique",
  vetements: "Vêtements",
  alimentaire: "Produits alimentaires",
};

export function TransporterInfoCard({
  gpId,
  originCity,
  destinationCity,
  departureDate,
}: TransporterInfoCardProps) {
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<GPProfileData | null>(null);
  const [offerDetails, setOfferDetails] = useState<OfferData | null>(null);
  const [showRestrictions, setShowRestrictions] = useState(false);

  useEffect(() => {
    loadTransporterInfo();
  }, [gpId]);

  const loadTransporterInfo = async () => {
    setLoading(true);
    try {
      // Fetch GP profile
      const { data: profileData } = await supabase
        .from("public_gp_profiles")
        .select("id, business_name, rating, total_deliveries, verified_at, description")
        .eq("id", gpId)
        .single();

      if (profileData) {
        setGpProfile(profileData);
      }

      // Fetch GP's active offer for this route
      const { data: offerData } = await supabase
        .from("gp_offers")
        .select("baggage_types_accepted, baggage_restrictions, explicit_restrictions, conditions, departure_date, arrival_date, available_capacity, price_per_kg, currency, flight_number, airline")
        .eq("gp_id", gpId)
        .eq("status", "active")
        .order("departure_date", { ascending: true })
        .limit(1)
        .single();

      if (offerData) {
        setOfferDetails(offerData);
      }
    } catch (error) {
      console.error("Error loading transporter info:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-muted/50 rounded-xl animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-2" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    );
  }

  if (!gpProfile) return null;

  const restrictions = offerDetails?.explicit_restrictions || [];
  const acceptedTypes = offerDetails?.baggage_types_accepted || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Transporter Header */}
      <div className="p-4 bg-card border rounded-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold">{gpProfile.business_name}</p>
              {gpProfile.verified_at && (
                <CheckCircle className="w-4 h-4 text-primary" />
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-warning fill-warning" />
                <span>{gpProfile.rating || 0}</span>
              </div>
              <span className="text-muted-foreground">{gpProfile.total_deliveries || 0} livraisons</span>
            </div>
          </div>
        </div>

        {gpProfile.verified_at && (
          <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs text-primary font-medium">Transporteur vérifié</span>
          </div>
        )}
      </div>

      {/* Voyage Details */}
      {offerDetails && (
        <div className="p-4 bg-muted/50 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Détails du voyage</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Départ</p>
              <p className="font-medium">
                {format(new Date(offerDetails.departure_date), "d MMMM", { locale: fr })}
              </p>
            </div>
            {offerDetails.arrival_date && (
              <div>
                <p className="text-muted-foreground">Arrivée estimée</p>
                <p className="font-medium">
                  {format(new Date(offerDetails.arrival_date), "d MMMM", { locale: fr })}
                </p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">Tarif</p>
              <p className="font-medium text-primary">{formatPricePerKg(offerDetails.price_per_kg, offerDetails.currency || "EUR")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Capacité restante</p>
              <p className="font-medium">{offerDetails.available_capacity} kg</p>
            </div>
            {offerDetails.flight_number && (
              <div>
                <p className="text-muted-foreground">Vol</p>
                <p className="font-medium">{offerDetails.airline} {offerDetails.flight_number}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Accepted Baggage Types */}
      {acceptedTypes.length > 0 && (
        <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="font-medium text-sm">Types de bagages acceptés</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {acceptedTypes.map((type) => (
              <Badge key={type} variant="secondary" className="gap-1 bg-green-500/10 text-green-700">
                <Package className="w-3 h-3" />
                {BAGGAGE_TYPE_LABELS[type] || type}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Restrictions Warning */}
      {(restrictions.length > 0 || offerDetails?.baggage_restrictions) && (
        <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl space-y-2">
          <button
            onClick={() => setShowRestrictions(!showRestrictions)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="font-medium text-sm text-destructive">
                Restrictions de transport ({restrictions.length})
              </span>
            </div>
            {showRestrictions ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {showRestrictions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-2 pt-2"
            >
              {/* Explicit Restrictions */}
              {restrictions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {restrictions.map((restriction) => (
                    <Badge key={restriction} variant="destructive" className="gap-1">
                      <XCircle className="w-3 h-3" />
                      {RESTRICTION_LABELS[restriction] || restriction}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Text Restrictions */}
              {offerDetails?.baggage_restrictions && (
                <div className="p-2 bg-destructive/10 rounded text-sm text-destructive">
                  {offerDetails.baggage_restrictions}
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* Conditions */}
      {offerDetails?.conditions && (
        <div className="p-4 bg-muted/50 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">Conditions</span>
          </div>
          <p className="text-sm text-muted-foreground">{offerDetails.conditions}</p>
        </div>
      )}

      {/* Important Notice */}
      <div className="p-3 bg-warning/10 border border-warning/20 rounded-xl flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
        <p className="text-xs text-warning-foreground">
          Veuillez vérifier que votre colis respecte les restrictions du transporteur avant de valider. 
          Le transporteur peut refuser les articles non conformes.
        </p>
      </div>
    </motion.div>
  );
}
