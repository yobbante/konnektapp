import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  ArrowRight, ArrowLeft, Package, MapPin, Calendar, Scale, 
  FileText, Zap, Truck, Ship, Plane, Briefcase, Info, CheckCircle
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { TransportTypeCard } from "@/components/TransportTypeCard";

type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur";

const transportOptions = [
  { type: "express" as TransportType, title: "Express", description: "Livraison rapide, idéal pour les colis urgents" },
  { type: "routier" as TransportType, title: "Routier", description: "Transport terrestre, économique pour gros volumes" },
  { type: "maritime" as TransportType, title: "Maritime", description: "Fret maritime pour conteneurs et marchandises" },
  { type: "aerien" as TransportType, title: "Aérien", description: "Envoi rapide par avion, idéal pour l'international" },
  { type: "voyageur" as TransportType, title: "Voyageur (GP)", description: "Via un voyageur avec capacité bagages" },
];

export default function DemandeEnvoi() {
  const [step, setStep] = useState(1);
  const [selectedTransport, setSelectedTransport] = useState<TransportType | null>(null);
  const [formData, setFormData] = useState({
    origine: "",
    destination: "",
    dateEnvoi: "",
    poids: "",
    dimensions: "",
    valeurDeclaree: "",
    description: "",
    urgent: false,
  });

  const handleNext = () => setStep((prev) => Math.min(prev + 1, 3));
  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-20">
        <div className="container max-w-4xl">
          {/* Progress */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      step >= s
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step > s ? <CheckCircle className="w-5 h-5" /> : s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`h-1 w-20 sm:w-32 md:w-40 mx-2 rounded ${
                        step > s ? "bg-secondary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm">
              <span className={step >= 1 ? "text-foreground font-medium" : "text-muted-foreground"}>
                Type de transport
              </span>
              <span className={step >= 2 ? "text-foreground font-medium" : "text-muted-foreground"}>
                Détails envoi
              </span>
              <span className={step >= 3 ? "text-foreground font-medium" : "text-muted-foreground"}>
                Confirmation
              </span>
            </div>
          </div>

          {/* Step 1: Transport Type */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center mb-10">
                <Badge variant="secondary" className="mb-4">Étape 1</Badge>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Quel type de transport recherchez-vous ?
                </h1>
                <p className="text-muted-foreground">
                  Sélectionnez le mode de transport adapté à votre envoi
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                {transportOptions.map((option) => (
                  <TransportTypeCard
                    key={option.type}
                    type={option.type}
                    title={option.title}
                    description={option.description}
                    selected={selectedTransport === option.type}
                    onClick={() => setSelectedTransport(option.type)}
                  />
                ))}
              </div>

              <div className="flex justify-end">
                <Button
                  variant="gold"
                  size="lg"
                  onClick={handleNext}
                  disabled={!selectedTransport}
                >
                  Continuer
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Shipment Details */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center mb-10">
                <Badge variant="secondary" className="mb-4">Étape 2</Badge>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Détails de votre envoi
                </h1>
                <p className="text-muted-foreground">
                  Renseignez les informations de votre colis
                </p>
              </div>

              <div className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-card">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Origine */}
                  <div className="space-y-2">
                    <Label htmlFor="origine" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-success" />
                      Ville de départ
                    </Label>
                    <Input
                      id="origine"
                      placeholder="Ex: Dakar, Sénégal"
                      value={formData.origine}
                      onChange={(e) => setFormData({ ...formData, origine: e.target.value })}
                    />
                  </div>

                  {/* Destination */}
                  <div className="space-y-2">
                    <Label htmlFor="destination" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-accent" />
                      Ville de destination
                    </Label>
                    <Input
                      id="destination"
                      placeholder="Ex: Abidjan, Côte d'Ivoire"
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    />
                  </div>

                  {/* Date */}
                  <div className="space-y-2">
                    <Label htmlFor="date" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      Date souhaitée
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.dateEnvoi}
                      onChange={(e) => setFormData({ ...formData, dateEnvoi: e.target.value })}
                    />
                  </div>

                  {/* Poids */}
                  <div className="space-y-2">
                    <Label htmlFor="poids" className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-muted-foreground" />
                      Poids (kg)
                    </Label>
                    <Input
                      id="poids"
                      type="number"
                      placeholder="Ex: 5"
                      value={formData.poids}
                      onChange={(e) => setFormData({ ...formData, poids: e.target.value })}
                    />
                  </div>

                  {/* Dimensions */}
                  <div className="space-y-2">
                    <Label htmlFor="dimensions" className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      Dimensions (L x l x h cm)
                    </Label>
                    <Input
                      id="dimensions"
                      placeholder="Ex: 30 x 20 x 15"
                      value={formData.dimensions}
                      onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                    />
                  </div>

                  {/* Valeur déclarée */}
                  <div className="space-y-2">
                    <Label htmlFor="valeur" className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      Valeur déclarée (FCFA)
                    </Label>
                    <Input
                      id="valeur"
                      type="number"
                      placeholder="Ex: 50000"
                      value={formData.valeurDeclaree}
                      onChange={(e) => setFormData({ ...formData, valeurDeclaree: e.target.value })}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="mt-6 space-y-2">
                  <Label htmlFor="description">Description du contenu</Label>
                  <Textarea
                    id="description"
                    placeholder="Décrivez brièvement le contenu de votre colis..."
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Urgence */}
                <div className="mt-6 p-4 rounded-xl bg-accent/10 border border-accent/20">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.urgent}
                      onChange={(e) => setFormData({ ...formData, urgent: e.target.checked })}
                      className="w-5 h-5 rounded border-border text-accent focus:ring-accent"
                    />
                    <div>
                      <span className="font-medium text-foreground flex items-center gap-2">
                        <Zap className="w-4 h-4 text-accent" />
                        Envoi urgent
                      </span>
                      <p className="text-sm text-muted-foreground">
                        Marquez votre demande comme prioritaire pour des offres plus rapides
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <Button variant="ghost" onClick={handleBack}>
                  <ArrowLeft className="w-5 h-5" />
                  Retour
                </Button>
                <Button variant="gold" size="lg" onClick={handleNext}>
                  Continuer
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="text-center mb-10">
                <Badge variant="secondary" className="mb-4">Étape 3</Badge>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Récapitulatif de votre demande
                </h1>
                <p className="text-muted-foreground">
                  Vérifiez les informations et soumettez votre demande
                </p>
              </div>

              <div className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-card mb-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-secondary" />
                  Informations de l'envoi
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">Type de transport</p>
                    <p className="font-semibold text-foreground capitalize">{selectedTransport}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">Trajet</p>
                    <p className="font-semibold text-foreground">
                      {formData.origine || "—"} → {formData.destination || "—"}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">Date souhaitée</p>
                    <p className="font-semibold text-foreground">{formData.dateEnvoi || "—"}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">Poids</p>
                    <p className="font-semibold text-foreground">{formData.poids ? `${formData.poids} kg` : "—"}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">Dimensions</p>
                    <p className="font-semibold text-foreground">{formData.dimensions || "—"}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">Valeur déclarée</p>
                    <p className="font-semibold text-foreground">
                      {formData.valeurDeclaree ? `${parseInt(formData.valeurDeclaree).toLocaleString()} FCFA` : "—"}
                    </p>
                  </div>
                </div>

                {formData.description && (
                  <div className="mt-4 p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-foreground">{formData.description}</p>
                  </div>
                )}

                {formData.urgent && (
                  <div className="mt-4 p-4 rounded-xl bg-accent/10 border border-accent/20">
                    <p className="font-medium text-accent flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Envoi marqué comme urgent
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-8">
                <p className="text-success flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Votre demande sera envoyée aux GP correspondants. Vous recevrez des offres sous peu.
                </p>
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={handleBack}>
                  <ArrowLeft className="w-5 h-5" />
                  Modifier
                </Button>
                <Button variant="gold" size="lg">
                  Soumettre ma demande
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
