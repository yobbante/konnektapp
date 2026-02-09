/**
 * TransporteurRegistration — Sélection du type de transport
 * Mobile-first, fullscreen, safe-area aware
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plane, Truck, Ship, Package, ChevronRight, Check, Shield, FileText, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface TransportTypeOption {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  route: string;
  gradient: string;
}

const transportTypes: TransportTypeOption[] = [
  { id: "bagages", label: "GP Via Bagages", description: "Transport de bagages et colis par avion", icon: Plane, route: "/gp/bagages/inscription", gradient: "from-blue-500 to-blue-600" },
  { id: "routier", label: "Transport Routier", description: "Livraison locale et nationale", icon: Truck, route: "/routier/inscription", gradient: "from-amber-500 to-amber-600" },
  { id: "maritime", label: "Transport Maritime", description: "Fret maritime et conteneurs", icon: Ship, route: "/gp/inscription", gradient: "from-cyan-500 to-cyan-600" },
  { id: "express", label: "Coursier Express", description: "Livraison rapide en ville", icon: Package, route: "/gp/inscription", gradient: "from-green-500 to-green-600" },
];

export default function TransporteurRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: gpProfile } = await supabase.from("gp_profiles").select("id").eq("user_id", user.id).maybeSingle();
          if (gpProfile) {
            toast({ title: "Profil existant", description: "Vous avez déjà un profil transporteur." });
            navigate("/gp/demandes");
            return;
          }
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally { setLoading(false); }
    };
    checkAuth();
  }, [navigate]);

  const handleSelectType = (type: TransportTypeOption) => {
    setSelectedType(type.id);
    setTimeout(() => navigate(type.route), 150);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><MiniLoader size="lg" /></div>;

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Sticky header */}
      <header 
        className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 text-sm">
            ← Retour
          </Button>
          <p className="text-sm font-semibold flex-1">Devenir Transporteur</p>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ delay: 0.1 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Truck className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold mb-2">Rejoignez Konnekt</h1>
          <p className="text-sm text-muted-foreground">Choisissez votre type de transport</p>
        </motion.div>

        {/* Benefits */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-primary/5 rounded-2xl p-4 mb-6 border border-primary/10">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" /> Avantages
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {["Revenus flexibles", "Clients qualifiés", "Paiement sécurisé", "Support dédié"].map(b => (
              <div key={b} className="flex items-center gap-2 text-xs">
                <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /><span>{b}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Transport types */}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Type de transport</p>
        <div className="space-y-3">
          {transportTypes.map((type, index) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.id;
            return (
              <motion.button key={type.id}
                initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + index * 0.05 }}
                onClick={() => handleSelectType(type)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left active:scale-[0.98] ${
                  isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                }`}>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.gradient} flex items-center justify-center shadow-sm flex-shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground mb-0.5">{type.label}</h3>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </motion.button>
            );
          })}
        </div>

        {/* Trust */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-6 mt-8 py-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Shield className="w-4 h-4 text-green-500" /><span>Vérifié</span></div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><FileText className="w-4 h-4 text-primary" /><span>Assuré</span></div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Star className="w-4 h-4 text-amber-500" /><span>Fiable</span></div>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          En vous inscrivant, vous acceptez nos{" "}
          <button onClick={() => navigate("/documents-legaux")} className="text-primary hover:underline">conditions</button>
        </p>
      </main>
    </div>
  );
}
