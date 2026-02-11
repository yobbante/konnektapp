/**
 * PublicUserProfile — External QR scan landing page
 * Route: /track/user/:userId
 * 
 * When someone scans a Konnekt QR with their camera app (not in-app),
 * they land here. Shows:
 *   - If GP: public profile + CTA to book
 *   - If Client: minimal info + marketing CTA
 *   - Always: Konnekt marketing block + signup CTA
 */
import { useState, useEffect } from "react";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, Truck, Star, Package, Shield, QrCode,
  ArrowRight, Sparkles, MapPin, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface UserData {
  type: "client" | "gp";
  name: string;
  gpId?: string;
  gpType?: string;
  rating?: number | null;
  totalDeliveries?: number | null;
  verified?: boolean;
  city?: string;
}

export default function PublicUserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (userId) loadUser(userId);
  }, [userId]);

  const loadUser = async (id: string) => {
    try {
      // Check if user is a GP (public access via RLS)
      const { data: gpRaw } = await supabase
        .from("gp_profiles")
        .select("id, business_name, gp_type, rating, total_deliveries, verified_at, city")
        .eq("user_id", id)
        .eq("status", "verified")
        .maybeSingle();
      
      const gp = gpRaw as any;

      if (gp) {
        setUser({
          type: "gp",
          name: gp.business_name,
          gpId: gp.id,
          gpType: gp.gp_type,
          rating: gp.rating,
          totalDeliveries: gp.total_deliveries,
          verified: !!gp.verified_at,
          city: gp.city,
        });
      } else {
        // Use public view for basic profile info (works for anon users)
        const { data: profile } = await supabase
          .from("public_user_profiles" as any)
          .select("full_name, city")
          .eq("user_id", id)
          .maybeSingle();

        if (profile) {
          setUser({ type: "client", name: (profile as any).full_name || "Utilisateur Konnekt" });
        } else {
          // Still show the page with a generic welcome — never show "not found" for valid QR
          setUser({ type: "client", name: "Utilisateur Konnekt" });
        }
      }
    } catch {
      // Fallback: show generic profile instead of error
      setUser({ type: "client", name: "Utilisateur Konnekt" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <MiniLoader size="lg" showText text="Chargement du profil..." />
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-6 text-center">
        <QrCode className="w-16 h-16 text-primary mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Bienvenue sur Konnekt</h1>
        <p className="text-slate-400 mb-6">La plateforme d'envoi de colis entre particuliers.</p>
        <div className="space-y-2 w-full max-w-xs">
          <Button onClick={() => navigate("/auth")} className="w-full bg-primary text-white hover:bg-primary/90">
            <Sparkles className="w-4 h-4 mr-2" /> Créer un compte
          </Button>
          <Button variant="outline" onClick={() => navigate("/offres")} className="w-full border-white/20 text-white hover:bg-white/10">
            Voir les offres disponibles
          </Button>
          <Button variant="ghost" onClick={() => navigate("/")} className="w-full text-white/60 hover:text-white">
            Découvrir la plateforme
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="p-4 flex items-center justify-center border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <QrCode className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">KONNEKT</span>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-white/5 border-white/10 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
                  user.type === "gp" ? "bg-primary/20" : "bg-blue-500/20"
                }`}>
                  {user.type === "gp" ? (
                    <Truck className="w-10 h-10 text-primary" />
                  ) : (
                    <User className="w-10 h-10 text-blue-400" />
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-bold text-white">{user.name}</h2>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <Badge className="bg-white/10 text-white/80 border-white/20 text-xs">
                      {user.type === "gp" ? "Transporteur" : "Client"} Konnekt
                    </Badge>
                    {user.verified && (
                      <Badge className="bg-green-500/20 text-green-400 text-xs gap-0.5">
                        <CheckCircle className="w-2.5 h-2.5" /> Vérifié
                      </Badge>
                    )}
                  </div>
                </div>

                {/* GP Stats */}
                {user.type === "gp" && (
                  <div className="grid grid-cols-3 gap-3 w-full mt-2">
                    {user.rating !== null && user.rating !== undefined && (
                      <div className="p-3 rounded-xl bg-white/5">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-white font-bold">{user.rating.toFixed(1)}</span>
                        </div>
                        <p className="text-white/40 text-[10px] mt-0.5">Note</p>
                      </div>
                    )}
                    <div className="p-3 rounded-xl bg-white/5">
                      <span className="text-white font-bold">{user.totalDeliveries || 0}</span>
                      <p className="text-white/40 text-[10px] mt-0.5">Livraisons</p>
                    </div>
                    {user.city && (
                      <div className="p-3 rounded-xl bg-white/5">
                        <div className="flex items-center justify-center gap-1">
                          <MapPin className="w-3 h-3 text-white/60" />
                          <span className="text-white text-xs">{user.city}</span>
                        </div>
                        <p className="text-white/40 text-[10px] mt-0.5">Base</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          {user.type === "gp" && user.gpId && (
            <Button
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white gap-2"
              onClick={() => navigate(`/client/transporteurs/${user.gpId}`)}
            >
              <Package className="w-4 h-4" />
              Envoyer un colis avec ce GP
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}

          <Button
            className="w-full bg-white text-slate-900 hover:bg-white/90 gap-2"
            onClick={() => navigate("/auth")}
          >
            <Sparkles className="w-4 h-4" />
            Créer un compte Konnekt
          </Button>

          <Button
            variant="outline"
            className="w-full border-white/20 text-white hover:bg-white/10 gap-2"
            onClick={() => navigate("/offres")}
          >
            Voir les offres disponibles
          </Button>

          <Button
            variant="ghost"
            className="w-full text-white/50 hover:text-white gap-2"
            onClick={() => navigate("/")}
          >
            Découvrir la plateforme
          </Button>
        </motion.div>

        {/* Marketing */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 gap-2"
        >
          {[
            { icon: Shield, label: "Paiement sécurisé", sub: "Escrow protégé" },
            { icon: QrCode, label: "Scan intelligent", sub: "Traçabilité totale" },
          ].map((badge) => (
            <div key={badge.label} className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
              <badge.icon className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-white text-xs font-medium">{badge.label}</p>
                <p className="text-white/40 text-[10px]">{badge.sub}</p>
              </div>
            </div>
          ))}
        </motion.div>

        <div className="text-center pt-4 pb-8">
          <p className="text-white/30 text-xs">© {new Date().getFullYear()} Konnekt · ScanReach™</p>
        </div>
      </div>
    </div>
  );
}