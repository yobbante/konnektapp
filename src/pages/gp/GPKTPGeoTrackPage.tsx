import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, MapPin, Activity, Clock, CheckCircle, TrendingUp, AlertTriangle, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { KTPDashboardCard } from "@/components/ktp/KTPDashboardCard";
import { useGPGeolocation } from "@/hooks/useGPGeolocation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function GPKTPGeoTrackPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [ktpData, setKtpData] = useState<any>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [geoLogs, setGeoLogs] = useState<any[]>([]);

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

      const [ktpRes, geoConsentRes, geoLogsRes] = await Promise.all([
        supabase.from("ktp_status").select("*").eq("gp_id", profile.id).maybeSingle(),
        supabase.from("gp_geolocation_consent").select("*").eq("gp_id", profile.id).maybeSingle(),
        supabase.from("gp_geolocation_logs").select("*").eq("gp_id", profile.id).order("created_at", { ascending: false }).limit(10),
      ]);

      setKtpData(ktpRes.data);
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

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      activeTab="ktp-geotrack"
    >
      <div className="px-4 py-4 space-y-4">
        {/* KTP Full Card */}
        <KTPDashboardCard gpId={gpProfile.id} />

        {/* KTP Score Details */}
        {ktpData && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Détails du score KTP</CardTitle>
              </div>
              <CardDescription>
                Score de confiance global : {ktpData.trust_score}/100
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScoreBar label="Conformité Scan" value={ktpData.scan_compliance_score} />
              <ScoreBar label="Ponctualité livraison" value={ktpData.delivery_punctuality_score} />
              <ScoreBar label="Historique livraisons" value={ktpData.delivery_history_score} />
              <ScoreBar label="Satisfaction client" value={ktpData.client_satisfaction_score} />
              <ScoreBar label="Discipline plateforme" value={ktpData.platform_discipline_score} />
              
              <div className="pt-3 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Commission</span>
                  <span className="font-medium">{ktpData.commission_rate}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Règle de paiement</span>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {ktpData.payment_release_rule === "after_delivery" ? "Après livraison" : ktpData.payment_release_rule}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* GeoTrack Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">GeoTrack™</CardTitle>
            </div>
            <CardDescription>
              Suivi de localisation passif pour les mises à jour automatiques
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* GeoTrack consent is managed via useGPGeolocation hook on scan page */}
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                Gérez votre consentement GeoTrack depuis la page Scan
              </p>
            </div>

            {geoData && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <Activity className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Statut</p>
                  <Badge variant={geoData.tracking_active ? "default" : "secondary"} className="text-xs mt-1">
                    {geoData.tracking_active ? "Actif" : "Inactif"}
                  </Badge>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <MapPin className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Dernière position</p>
                  <p className="text-sm font-medium mt-1">
                    {geoData.last_detected_city || "—"}
                  </p>
                </div>
              </div>
            )}

            {/* Geo Logs */}
            {geoLogs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Historique GeoTrack</p>
                {geoLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm">
                        {log.detected_city || log.detected_country}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "d MMM HH:mm", { locale: fr })}
                      </p>
                    </div>
                    {log.action_triggered && (
                      <Badge variant="outline" className="text-xs">
                        {log.action_triggered}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </GPDashboardLayout>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}/100</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}
