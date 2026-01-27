import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Eye, Star, MapPin, Phone, Shield, Edit, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { TrustLevelBadge, type TrustLevel } from "@/components/ui/trust-level-badge";
import { VerifiedBadge } from "@/components/ui/verified-badge";

interface GPProfile {
  id: string;
  business_name: string;
  gp_type: string;
  status: string;
  city: string;
  country_code: string;
  rating: number | null;
  total_deliveries: number | null;
  total_reviews: number | null;
  years_experience: number | null;
  description: string | null;
  verified_at: string | null;
  zones_covered: string[] | null;
  international_destinations: string[] | null;
}

/**
 * GPProfilPublicPage - Aperçu du profil public
 * 
 * Permet au transporteur de voir son profil comme les clients
 * Bouton pour éditer le profil complet
 */
export default function GPProfilPublicPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<GPProfile | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("gp_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        navigate("/gp/inscription");
        return;
      }

      setGpProfile(profile);

      // Get pending count
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("gp_id", profile.id)
        .eq("status", "pending");

      setPendingCount(count || 0);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoader message="Chargement du profil..." />;
  }

  // Helper to determine trust level
  const getTrustLevel = (profile: GPProfile): TrustLevel => {
    if (!profile.verified_at) return "new";
    if ((profile.total_deliveries || 0) > 100 && (profile.rating || 0) >= 4.8) return "elite";
    if ((profile.total_deliveries || 0) > 50 && (profile.rating || 0) >= 4.5) return "premium";
    if (profile.verified_at) return "verified";
    return "basic";
  };

  if (!gpProfile) return null;

  const isVerified = gpProfile.status === "verified";

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingCount}
      activeTab="profil"
    >
      <div className="px-4 py-4 space-y-4">
        {/* Preview Banner */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Aperçu du profil public</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(`/client/transporteurs/${gpProfile.id}`, "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Voir comme client
            </Button>
          </CardContent>
        </Card>

        {/* Profile Card */}
        <Card>
          <CardContent className="pt-6">
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {gpProfile.business_name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{gpProfile.business_name}</h2>
                  {isVerified && <VerifiedBadge size="sm" />}
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{gpProfile.city}, {gpProfile.country_code}</span>
                </div>
                <div className="mt-2">
                  <TrustLevelBadge
                    level={getTrustLevel(gpProfile)}
                    showLabel
                  />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-primary">
                  {gpProfile.rating?.toFixed(1) || "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">Note moyenne</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-primary">
                  {gpProfile.total_deliveries || 0}
                </p>
                <p className="text-xs text-muted-foreground">Livraisons</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-primary">
                  {gpProfile.total_reviews || 0}
                </p>
                <p className="text-xs text-muted-foreground">Avis</p>
              </div>
            </div>

            {/* Description */}
            {gpProfile.description && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2">À propos</h3>
                <p className="text-sm text-muted-foreground">{gpProfile.description}</p>
              </div>
            )}

            {/* Destinations */}
            {gpProfile.international_destinations && gpProfile.international_destinations.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2">Destinations internationales</h3>
                <div className="flex flex-wrap gap-2">
                  {gpProfile.international_destinations.map((dest, i) => (
                    <Badge key={i} variant="secondary">{dest}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Edit Button */}
            <Button
              className="w-full"
              onClick={() => navigate("/transporter/profile")}
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifier mon profil
            </Button>
          </CardContent>
        </Card>
      </div>
    </GPDashboardLayout>
  );
}
