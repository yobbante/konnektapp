import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  User, MapPin, Star, Truck, Ship, Plane, Zap, Briefcase,
  Package, CheckCircle, Calendar, Shield, ArrowLeft, MessageCircle,
  Phone, Mail, Clock, AlertTriangle, XCircle, Building
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

interface GPProfileData {
  id: string;
  user_id: string;
  business_name: string;
  description: string | null;
  city: string;
  address: string | null;
  country_code: string;
  phone: string;
  whatsapp: string | null;
  gp_type: string;
  status: string;
  subscription: string;
  rating: number;
  total_reviews: number;
  total_deliveries: number;
  years_experience: number;
  fleet_size: number;
  verified_at: string | null;
  zones_covered: string[];
  international_destinations: string[];
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  email: string | null;
  full_name: string | null;
}

const gpTypeIcons: Record<string, any> = {
  express: Zap,
  routier: Truck,
  maritime: Ship,
  aerien: Plane,
  voyageur: Briefcase,
  agence: Building,
};

const gpTypeLabels: Record<string, string> = {
  express: "Express",
  routier: "Routier",
  maritime: "Maritime",
  aerien: "Aérien",
  voyageur: "Voyageur",
  agence: "Agence",
};

const statusConfig: Record<string, { label: string; variant: string; icon: any }> = {
  pending: { label: "En attente", variant: "warning", icon: Clock },
  verified: { label: "Vérifié", variant: "success", icon: CheckCircle },
  suspended: { label: "Suspendu", variant: "destructive", icon: AlertTriangle },
  rejected: { label: "Rejeté", variant: "destructive", icon: XCircle },
};

export default function AdminGPProfile() {
  const { gpId } = useParams<{ gpId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasAdminAccess, loading: roleLoading } = useUserRole();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<GPProfileData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!roleLoading && !hasAdminAccess) {
      toast({
        title: "Accès refusé",
        description: "Vous devez être administrateur",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    if (gpId && hasAdminAccess) {
      loadGPProfile();
    }
  }, [gpId, hasAdminAccess, roleLoading]);

  const loadGPProfile = async () => {
    try {
      // Load GP profile (admin has access to all via RLS policy)
      const { data: gpData, error: gpError } = await supabase
        .from("gp_profiles")
        .select("*")
        .eq("id", gpId)
        .maybeSingle();

      if (gpError) throw gpError;
      
      if (!gpData) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(gpData);

      // Load user profile for email/name
      const { data: profileData } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", gpData.user_id)
        .maybeSingle();

      setUserProfile(profileData);
    } catch (error) {
      console.error("Error loading GP profile:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: "verified" | "suspended" | "rejected") => {
    if (!profile) return;
    
    setUpdating(true);
    try {
      const updateData: Record<string, any> = { 
        status: newStatus,
        verified_at: newStatus === "verified" ? new Date().toISOString() : null 
      };

      const { error } = await supabase
        .from("gp_profiles")
        .update(updateData)
        .eq("id", profile.id);

      if (error) throw error;

      const statusLabels = {
        verified: "validé",
        suspended: "suspendu",
        rejected: "rejeté"
      };

      toast({ 
        title: `Transporteur ${statusLabels[newStatus]}`,
      });

      await loadGPProfile();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="w-5 h-5 text-warning fill-warning" />);
      } else {
        stars.push(<Star key={i} className="w-5 h-5 text-muted-foreground/30" />);
      }
    }
    return stars;
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <MobileHeader />
        <div className="px-4 py-10 text-center">
          <User className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Profil non disponible</h2>
          <p className="text-muted-foreground mb-4">
            Ce transporteur n'existe pas ou a été supprimé du système.
          </p>
          <Link to="/admin">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const GPIcon = gpTypeIcons[profile.gp_type] || Truck;
  const statusInfo = statusConfig[profile.status] || statusConfig.pending;
  const StatusIcon = statusInfo.icon;
  const memberSince = new Date(profile.created_at).toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <MobileHeader />

      <div className="px-4 py-4 space-y-4">
        {/* Back Button */}
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Retour au dashboard admin
        </Link>

        {/* Status Alert */}
        {profile.status === "pending" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-warning/10 border border-warning/30"
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-warning" />
              <div>
                <p className="font-medium text-foreground">En attente de vérification</p>
                <p className="text-sm text-muted-foreground">Ce transporteur n'a pas encore été validé</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Profile Header */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-5 border border-border shadow-card"
        >
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-2 border-primary/20">
              <GPIcon className="w-10 h-10 text-primary" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="font-bold text-xl text-foreground truncate">
                    {profile.business_name}
                  </h1>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3" />
                    {profile.city}, {profile.country_code}
                  </div>
                </div>
                <Badge variant={statusInfo.variant as any} className="flex items-center gap-1">
                  <StatusIcon className="w-3 h-3" />
                  {statusInfo.label}
                </Badge>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-0.5">
                  {renderStars(profile.rating)}
                </div>
                <span className="font-bold text-lg">{profile.rating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({profile.total_reviews} avis)</span>
              </div>
            </div>
          </div>

          {/* Type & Subscription Badges */}
          <div className="flex items-center gap-2 mt-4">
            <Badge variant={profile.gp_type as any} className="flex items-center gap-1">
              <GPIcon className="w-4 h-4" />
              {gpTypeLabels[profile.gp_type]}
            </Badge>
            <Badge variant={profile.subscription === "premium" ? "success" : "outline"}>
              {profile.subscription === "premium" ? "Premium" : "Gratuit"}
            </Badge>
          </div>

          {/* Description */}
          {profile.description && (
            <p className="mt-4 text-sm text-muted-foreground">{profile.description}</p>
          )}
        </motion.div>

        {/* Contact Info - Admin Only */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Informations de contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {userProfile?.full_name && (
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{userProfile.full_name}</span>
                </div>
              )}
              {userProfile?.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${userProfile.email}`} className="text-sm text-primary hover:underline">
                    {userProfile.email}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <a href={`tel:${profile.phone}`} className="text-sm text-primary hover:underline">
                  {profile.phone}
                </a>
              </div>
              {profile.whatsapp && (
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{profile.whatsapp}</span>
                </div>
              )}
              {profile.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{profile.address}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-3"
        >
          <div className="bg-card rounded-xl p-3 text-center border border-border">
            <Package className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{profile.total_deliveries}</p>
            <p className="text-xs text-muted-foreground">Livraisons</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center border border-border">
            <Calendar className="w-6 h-6 text-secondary mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{profile.years_experience}</p>
            <p className="text-xs text-muted-foreground">Années exp.</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center border border-border">
            <Truck className="w-6 h-6 text-accent mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{profile.fleet_size}</p>
            <p className="text-xs text-muted-foreground">Véhicules</p>
          </div>
        </motion.div>

        {/* Zones */}
        {profile.zones_covered && profile.zones_covered.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Zones couvertes
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.zones_covered.map((zone, i) => (
                    <Badge key={i} variant="outline">{zone}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* International */}
        {profile.international_destinations && profile.international_destinations.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Plane className="w-4 h-4 text-primary" />
                  Destinations internationales
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.international_destinations.map((dest, i) => (
                    <Badge key={i} variant="secondary">{dest}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Admin Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Actions administrateur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.status === "pending" && (
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="success" 
                    onClick={() => updateStatus("verified")}
                    disabled={updating}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Valider
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => updateStatus("rejected")}
                    disabled={updating}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rejeter
                  </Button>
                </div>
              )}
              
              {profile.status === "verified" && (
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => updateStatus("suspended")}
                  disabled={updating}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Suspendre ce transporteur
                </Button>
              )}

              {profile.status === "suspended" && (
                <Button 
                  variant="success" 
                  className="w-full"
                  onClick={() => updateStatus("verified")}
                  disabled={updating}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Réactiver ce transporteur
                </Button>
              )}

              {profile.status === "rejected" && (
                <Button 
                  variant="success" 
                  className="w-full"
                  onClick={() => updateStatus("verified")}
                  disabled={updating}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Valider ce transporteur
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Meta Info */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>Inscrit le {memberSince}</p>
          {profile.verified_at && (
            <p>Vérifié le {new Date(profile.verified_at).toLocaleDateString('fr-FR')}</p>
          )}
          <p className="font-mono text-[10px] opacity-50">ID: {profile.id}</p>
        </div>
      </div>
    </div>
  );
}
