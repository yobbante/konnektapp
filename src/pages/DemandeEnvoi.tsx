import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowRight, ArrowLeft, Package, MapPin, Calendar, Scale, 
  FileText, Zap, Truck, Ship, Plane, Briefcase, Info, CheckCircle
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

type TransportType = "express" | "routier" | "maritime" | "aerien" | "voyageur";

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
  const [step, setStep] = useState(1);
  const [selectedTransport, setSelectedTransport] = useState<TransportType | null>(null);
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

  const handleNext = () => setStep((prev) => Math.min(prev + 1, 3));
  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleSubmit = () => {
    toast({
      title: "Demande envoyée !",
      description: "Vous recevrez des offres de nos GP partenaires sous peu.",
    });
    navigate("/offres");
  };

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

            <Button
              variant="default"
              size="lg"
              onClick={handleNext}
              disabled={!selectedTransport}
              className="w-full"
            >
              Continuer
              <ArrowRight className="w-5 h-5" />
            </Button>
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
