import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Search, Package, ArrowRight, MapPin, Clock, CheckCircle, AlertCircle, Truck } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface TrackingStep {
  status: string;
  date: string;
  location: string;
  completed: boolean;
  current?: boolean;
}

const sampleTracking: TrackingStep[] = [
  { status: "Colis pris en charge", date: "18 déc. 2024, 09:00", location: "Dakar, Sénégal", completed: true },
  { status: "En transit", date: "18 déc. 2024, 14:30", location: "Thiès, Sénégal", completed: true },
  { status: "Arrivée au hub", date: "19 déc. 2024, 08:00", location: "Kaolack, Sénégal", completed: true, current: true },
  { status: "En cours de livraison", date: "—", location: "Ziguinchor, Sénégal", completed: false },
  { status: "Livré", date: "—", location: "Destination finale", completed: false },
];

export default function TrackingPage() {
  const [trackingCode, setTrackingCode] = useState("");
  const [showResult, setShowResult] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingCode.trim()) {
      setShowResult(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-20">
        <div className="container max-w-4xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <Badge variant="secondary" className="mb-4">Suivi</Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Suivez votre colis
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Entrez votre numéro de suivi pour connaître l'état de votre envoi en temps réel.
            </p>
          </motion.div>

          {/* Search Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSearch}
            className="mb-12"
          >
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Entrez votre numéro de suivi (ex: YOB-GP001)"
                  className="pl-12 h-14 text-lg"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                />
              </div>
              <Button type="submit" variant="gold" size="lg" className="h-14 px-8">
                <Search className="w-5 h-5" />
                Rechercher
              </Button>
            </div>
          </motion.form>

          {/* Results */}
          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Summary Card */}
              <div className="bg-card rounded-2xl border border-border p-6 shadow-card mb-8">
                <div className="flex flex-col md:flex-row justify-between gap-6 mb-6">
                  <div>
                    <Badge variant="available" className="mb-3">En transit</Badge>
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      {trackingCode || "YOB-GP001"}
                    </h2>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      Dakar → Ziguinchor
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      Livraison estimée: 20 déc. 2024
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Truck className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-foreground">Mamadou Express</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-3/5 bg-gold-gradient rounded-full" />
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
                <h3 className="font-semibold text-lg mb-6">Historique du colis</h3>
                
                <div className="space-y-0">
                  {sampleTracking.map((step, index) => (
                    <div key={index} className="relative flex gap-4">
                      {/* Line */}
                      {index < sampleTracking.length - 1 && (
                        <div 
                          className={`absolute left-[15px] top-8 w-0.5 h-full ${
                            step.completed ? "bg-secondary" : "bg-muted"
                          }`}
                        />
                      )}
                      
                      {/* Icon */}
                      <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        step.current
                          ? "bg-secondary text-secondary-foreground"
                          : step.completed
                          ? "bg-success text-success-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {step.completed ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-current" />
                        )}
                      </div>

                      {/* Content */}
                      <div className={`pb-8 ${!step.completed && !step.current ? "opacity-50" : ""}`}>
                        <p className={`font-medium ${step.current ? "text-secondary" : "text-foreground"}`}>
                          {step.status}
                        </p>
                        <p className="text-sm text-muted-foreground">{step.date}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {step.location}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Button variant="outline" className="flex-1">
                  <AlertCircle className="w-4 h-4" />
                  Signaler un problème
                </Button>
                <Button variant="gold" className="flex-1">
                  Contacter le GP
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Info Box */}
          {!showResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-muted/50 rounded-2xl border border-border p-6 text-center"
            >
              <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">
                Où trouver mon numéro de suivi ?
              </h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Votre numéro de suivi se trouve dans l'email de confirmation de réservation 
                ou dans votre espace client sous "Mes envois".
              </p>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
