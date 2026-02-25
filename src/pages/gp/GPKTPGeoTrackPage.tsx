import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield, MapPin, Activity, Globe, Radio,
  Navigation, Clock, Eye, ChevronRight, Waves, Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { KTPDashboardCard } from "@/components/ktp/KTPDashboardCard";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function GPKTPGeoTrackPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [geoLogs, setGeoLogs] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<"ktp" | "geo">("ktp");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: profile } = await supabase
        .from("gp_profiles")
        .select("id, business_name, gp_type, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) { navigate("/gp/inscription"); return; }
      setGpProfile(profile);

      const [geoConsentRes, geoLogsRes] = await Promise.all([
        supabase.from("gp_geolocation_consent").select("*").eq("gp_id", profile.id).maybeSingle(),
        supabase.from("gp_geolocation_logs").select("*").eq("gp_id", profile.id).order("created_at", { ascending: false }).limit(10),
      ]);

      setGeoData(geoConsentRes.data);
      setGeoLogs(geoLogsRes.data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader message="Chargement KTP & GeoTrack..." />;
  if (!gpProfile) return null;

  const isGeoActive = geoData?.tracking_active ?? false;

  return (
    <GPDashboardLayout gpProfile={gpProfile} activeTab="ktp-geotrack">
      <div className="px-4 py-5 space-y-5">

        {/* Page Title */}
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Confiance & Suivi
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Votre score KTP et votre localisation automatique
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-2">
          <SectionTab
            active={activeSection === "ktp"}
            icon={Shield}
            label="Mon KTP"
            onClick={() => setActiveSection("ktp")}
          />
          <SectionTab
            active={activeSection === "geo"}
            icon={Globe}
            label="GeoTrack™"
            onClick={() => setActiveSection("geo")}
            badge={isGeoActive ? "ON" : undefined}
          />
        </div>

        {/* ═══════════ KTP SECTION ═══════════ */}
        {activeSection === "ktp" && (
          <motion.div
            key="ktp"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* Full KTP Card (already well designed) */}
            <KTPDashboardCard gpId={gpProfile.id} />

            {/* Explanation */}
            <Card className="border-primary/10 bg-primary/[0.03]">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  Comment fonctionne le KTP ?
                </p>
                <div className="space-y-2.5">
                  <ExplainRow
                    emoji="📊"
                    title="Score de confiance"
                    desc="Calculé à partir de vos scans, ponctualité, satisfaction client et respect des règles."
                  />
                  <ExplainRow
                    emoji="💰"
                    title="Impact financier"
                    desc="Meilleur score = commission réduite, paiement accéléré, assurance optimisée."
                  />
                  <ExplainRow
                    emoji="🏅"
                    title="Niveaux KTP"
                    desc="Nouveau → Bronze → Verified → Pro. Chaque niveau débloque des avantages."
                  />
                  <ExplainRow
                    emoji="📱"
                    title="Scannez à chaque étape"
                    desc="Le scan est le facteur #1 (40%) de votre score. Ne manquez aucun scan."
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ═══════════ GEOTRACK SECTION ═══════════ */}
        {activeSection === "geo" && (
          <motion.div
            key="geo"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* Status Hero Card */}
            <Card className={cn(
              "overflow-hidden border-2 transition-all",
              isGeoActive ? "border-emerald-500/30" : "border-border"
            )}>
              <div className={cn(
                "p-5 bg-gradient-to-br",
                isGeoActive
                  ? "from-emerald-600 to-teal-700 text-white"
                  : "from-muted to-muted/80 text-foreground"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center",
                      isGeoActive ? "bg-white/20 backdrop-blur-sm" : "bg-background/60"
                    )}>
                      {isGeoActive ? (
                        <Radio className="w-6 h-6 text-white" />
                      ) : (
                        <Globe className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-base">GeoTrack™</h3>
                      <p className={cn("text-xs mt-0.5", isGeoActive ? "text-white/70" : "text-muted-foreground")}>
                        {isGeoActive ? "Suivi actif en arrière-plan" : "Suivi désactivé"}
                      </p>
                    </div>
                  </div>
                  <Badge className={cn(
                    "text-xs font-bold px-3 py-1",
                    isGeoActive
                      ? "bg-white/20 text-white border-white/30"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {isGeoActive ? "ACTIF" : "OFF"}
                  </Badge>
                </div>

                {/* Decorative wave */}
                {isGeoActive && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                )}
              </div>

              <CardContent className="p-4 space-y-4">
                {/* Current Position */}
                {geoData && (
                  <div className="grid grid-cols-2 gap-3">
                    <GeoStatCard
                      icon={MapPin}
                      label="Dernière position"
                      value={geoData.last_detected_city || "Non détectée"}
                      sub={geoData.last_detected_country || "—"}
                    />
                    <GeoStatCard
                      icon={Clock}
                      label="Dernière mise à jour"
                      value={geoData.last_check_at
                        ? format(new Date(geoData.last_check_at), "HH:mm", { locale: fr })
                        : "—"
                      }
                      sub={geoData.last_check_at
                        ? format(new Date(geoData.last_check_at), "d MMM yyyy", { locale: fr })
                        : "Jamais"
                      }
                    />
                  </div>
                )}

                {!geoData && (
                  <div className="p-4 bg-muted/50 rounded-xl text-center">
                    <Globe className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Aucune donnée de localisation
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Activez GeoTrack depuis la page Scan
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* How it works */}
            <Card className="border-primary/10 bg-primary/[0.03]">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Comment ça marche ?
                </p>
                <div className="space-y-2.5">
                  <ExplainRow
                    emoji="📍"
                    title="Détection passive"
                    desc="Votre position est détectée automatiquement en arrière-plan, sans action de votre part."
                  />
                  <ExplainRow
                    emoji="✈️"
                    title="Transition automatique"
                    desc="Quand vous arrivez au pays de destination, le statut de vos colis passe automatiquement en transit."
                  />
                  <ExplainRow
                    emoji="🔒"
                    title="Vie privée"
                    desc="La position n'est utilisée que pour le suivi des colis. Aucune donnée partagée avec des tiers."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Geo Logs / Timeline */}
            {geoLogs.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-primary" />
                    Historique de localisation
                  </p>
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

                    <div className="space-y-0">
                      {geoLogs.slice(0, 8).map((log, index) => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-start gap-3 py-2.5 relative"
                        >
                          {/* Dot */}
                          <div className={cn(
                            "w-[10px] h-[10px] rounded-full mt-1.5 flex-shrink-0 z-10 ring-2 ring-background",
                            index === 0 ? "bg-primary" : "bg-muted-foreground/30"
                          )} />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={cn(
                                "text-sm font-medium truncate",
                                index === 0 ? "text-foreground" : "text-muted-foreground"
                              )}>
                                {log.detected_city || log.detected_country}
                              </p>
                              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                {format(new Date(log.created_at), "d MMM HH:mm", { locale: fr })}
                              </span>
                            </div>
                            {log.action_triggered && (
                              <Badge variant="outline" className="text-[10px] h-5 mt-1 border-primary/20 text-primary">
                                <Zap className="w-2.5 h-2.5 mr-1" />
                                {log.action_triggered}
                              </Badge>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {geoLogs.length === 0 && geoData && (
              <Card>
                <CardContent className="py-8 text-center">
                  <Navigation className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucun historique GeoTrack</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Les positions seront enregistrées lors de vos déplacements
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </div>
    </GPDashboardLayout>
  );
}

/* ─── Explanation Row ─── */
function ExplainRow({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-base flex-shrink-0 mt-0.5">{emoji}</span>
      <div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

/* ─── Section Tab ─── */
function SectionTab({ active, icon: Icon, label, onClick, badge }: {
  active: boolean; icon: any; label: string; onClick: () => void; badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
        active
          ? "bg-primary text-primary-foreground shadow-md"
          : "bg-muted/60 text-muted-foreground hover:bg-muted"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
      {badge && (
        <span className={cn(
          "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
          active ? "bg-white/20" : "bg-emerald-500/15 text-emerald-600"
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}

/* ─── Geo Stat Card ─── */
function GeoStatCard({ icon: Icon, label, value, sub }: {
  icon: any; label: string; value: string; sub: string;
}) {
  return (
    <div className="p-3 bg-muted/40 rounded-xl">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-bold text-foreground truncate">{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}
