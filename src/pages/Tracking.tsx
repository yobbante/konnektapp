import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  Search, Package, MapPin, Clock, CheckCircle, 
  AlertCircle, Truck, MessageCircle, Phone
} from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
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
  { status: "Colis pris en charge", date: "18 déc., 09:00", location: "Dakar", completed: true },
  { status: "En transit", date: "18 déc., 14:30", location: "Thiès", completed: true },
  { status: "Arrivée au hub", date: "19 déc., 08:00", location: "Kaolack", completed: true, current: true },
  { status: "En cours de livraison", date: "—", location: "Ziguinchor", completed: false },
  { status: "Livré", date: "—", location: "Destination", completed: false },
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

  const completedSteps = sampleTracking.filter(s => s.completed).length;
  const progress = (completedSteps / sampleTracking.length) * 100;

  return (
    <div className="min-h-screen bg-background pb-safe">
      <MobileHeader />

      <div className="px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-xl font-bold text-foreground mb-1">Suivez votre colis</h1>
          <p className="text-sm text-muted-foreground">
            Entrez votre numéro de suivi
          </p>
        </motion.div>

        {/* Search Form */}
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSearch}
          className="mb-6"
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Ex: YOB-GP001"
                className="pl-10 h-11 bg-muted/50"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
              />
            </div>
            <Button type="submit" variant="default" className="h-11 px-5">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </motion.form>

        {/* Results */}
        {showResult ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Summary Card */}
            <div className="mobile-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Badge variant="default" className="mb-2">En transit</Badge>
                  <h2 className="font-bold text-lg text-foreground">
                    {trackingCode || "YOB-GP001"}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Livraison estimée</p>
                  <p className="font-semibold text-sm">20 déc. 2024</p>
                </div>
              </div>

              {/* Route */}
              <div className="flex items-center gap-2 mb-4 text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-medium">Dakar</span>
                <div className="flex-1 h-px bg-border" />
                <span className="font-medium">Ziguinchor</span>
                <MapPin className="w-4 h-4 text-accent" />
              </div>

              {/* Progress Bar */}
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="absolute inset-y-0 left-0 bg-primary rounded-full"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {completedSteps}/{sampleTracking.length} étapes
              </p>
            </div>

            {/* GP Info */}
            <div className="mobile-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Mamadou Express</p>
                    <p className="text-xs text-muted-foreground">Transporteur vérifié</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="mobile-card">
              <h3 className="font-semibold text-sm mb-4">Historique</h3>
              
              <div className="space-y-0">
                {sampleTracking.map((step, index) => (
                  <div key={index} className="relative flex gap-3">
                    {/* Line */}
                    {index < sampleTracking.length - 1 && (
                      <div 
                        className={`absolute left-[11px] top-6 w-0.5 h-full ${
                          step.completed ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    )}
                    
                    {/* Icon */}
                    <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.current
                        ? "bg-primary text-primary-foreground"
                        : step.completed
                        ? "bg-success text-success-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {step.completed ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                      )}
                    </div>

                    {/* Content */}
                    <div className={`pb-4 ${!step.completed && !step.current ? "opacity-50" : ""}`}>
                      <p className={`text-sm font-medium ${step.current ? "text-primary" : ""}`}>
                        {step.status}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{step.date}</span>
                        <span>•</span>
                        <span>{step.location}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-11">
                <AlertCircle className="w-4 h-4" />
                Problème
              </Button>
              <Button variant="default" className="flex-1 h-11">
                <MessageCircle className="w-4 h-4" />
                Contacter
              </Button>
            </div>
          </motion.div>
        ) : (
          /* Info Box */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mobile-card text-center"
          >
            <Package className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">
              Où trouver mon numéro ?
            </h3>
            <p className="text-sm text-muted-foreground">
              Dans votre email de confirmation ou dans "Mes envois"
            </p>
          </motion.div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
