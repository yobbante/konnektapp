/**
 * TransporteurRegistration — Sélection du type de transport
 * Mobile-first, fullscreen, no-scroll, safe-area aware
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plane, Truck, Ship, Package, ChevronRight, Shield, Star, Zap, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface TransportTypeOption {
  id: string;
  label: string;
  sub: string;
  icon: React.ComponentType<any>;
  route: string;
  color: string;
  available: boolean;
}

const transportTypes: TransportTypeOption[] = [
  { id: "bagages", label: "GP Via Bagages", sub: "Colis par avion", icon: Plane, route: "/gp/bagages/inscription", color: "bg-primary text-primary-foreground", available: true },
  { id: "routier", label: "Routier", sub: "Fret & transport routier", icon: Truck, route: "/routier/inscription", color: "bg-secondary text-secondary-foreground", available: true },
  { id: "maritime", label: "Maritime", sub: "Bientôt disponible", icon: Ship, route: "/gp/inscription", color: "bg-accent text-accent-foreground", available: false },
  { id: "express", label: "Coursier", sub: "Bientôt disponible", icon: Package, route: "/gp/inscription", color: "bg-muted text-foreground", available: false },
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
    if (!type.available) return;
    setSelectedType(type.id);
    setTimeout(() => navigate(type.route), 150);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><MiniLoader size="lg" /></div>;

  return (
    <div
      className="h-[100dvh] bg-background flex flex-col overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Header — compact */}
      <header className="flex items-center gap-3 px-4 h-12 border-b border-border shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="-ml-2 text-xs h-8 px-2">
          ← Retour
        </Button>
        <p className="text-sm font-semibold flex-1 text-center pr-8">Devenir Transporteur</p>
      </header>

      {/* Content — fills remaining space, no scroll */}
      <main className="flex-1 flex flex-col justify-between px-5 py-4 max-w-lg mx-auto w-full min-h-0">
        {/* Top: Branding + value prop */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary/20">
            <Truck className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold">Rejoignez Konnekt</h1>
          <div className="flex items-center justify-center gap-4 mt-2">
            {[
              { icon: Zap, text: "Revenus flexibles" },
              { icon: Shield, text: "Paiement sécurisé" },
              { icon: Star, text: "Support dédié" },
            ].map(b => (
              <span key={b.text} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <b.icon className="w-3 h-3 text-primary" />{b.text}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Center: Transport type grid */}
        <div className="flex-1 flex flex-col justify-center py-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Choisissez votre activité
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {transportTypes.map((type, index) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              return (
                <motion.button
                  key={type.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + index * 0.04 }}
                  onClick={() => handleSelectType(type)}
                  disabled={!type.available}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    !type.available
                      ? "border-muted bg-muted/30 opacity-50 cursor-not-allowed"
                      : isSelected
                        ? "border-primary bg-primary/10 shadow-md shadow-primary/10 active:scale-[0.96]"
                        : "border-border bg-card hover:border-primary/30 active:scale-[0.96]"
                  }`}
                >
                  {!type.available && (
                    <Badge className="absolute -top-2 right-2 bg-muted text-muted-foreground border-0 text-[9px] px-1.5 py-0">
                      Bientôt
                    </Badge>
                  )}
                  <div className={`w-11 h-11 rounded-xl ${type.available ? type.color : 'bg-muted text-muted-foreground'} flex items-center justify-center shadow-sm`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-semibold leading-tight ${!type.available ? 'text-muted-foreground' : ''}`}>{type.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{type.sub}</p>
                  </div>
                  {type.available && <ChevronRight className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground/40" />}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Bottom: Trust + legal */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-center space-y-2">
          <div className="flex items-center justify-center gap-5">
            {[
              { icon: Shield, label: "Vérifié" },
              { icon: Star, label: "Fiable" },
              { icon: Zap, label: "Rapide" },
            ].map(t => (
              <span key={t.label} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <t.icon className="w-3.5 h-3.5 text-primary" />{t.label}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            En vous inscrivant, vous acceptez nos{" "}
            <button onClick={() => navigate("/documents-legaux")} className="text-primary hover:underline">conditions</button>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
