import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  User, MapPin, Star, Truck, Ship, Plane, Zap, Briefcase, Building2,
  Package, Calendar, Shield, ArrowLeft, Phone, MessageCircle, 
  Upload, Save, Edit2, Check, X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { VehicleManagement } from "@/components/gp/VehicleManagement";
import { ScheduledRoutesManager } from "@/components/gp/ScheduledRoutesManager";
import { GenerateOffersFromRoutes } from "@/components/gp/GenerateOffersFromRoutes";
import { GP_STATUS_LABELS, isValidGpStatus } from "@/lib/enumMappings";

interface GPProfileData {
  id: string;
  user_id: string;
  business_name: string;
  description: string | null;
  city: string;
  address: string | null;
  country_code: string;
  gp_type: string;
  phone: string;
  whatsapp: string | null;
  rating: number;
  total_reviews: number;
  total_deliveries: number;
  years_experience: number;
  fleet_size: number | null;
  verified_at: string | null;
  zones_covered: string[];
  international_destinations: string[];
  status: string;
  subscription: string;
  created_at: string;
}

const gpTypeIcons: Record<string, any> = {
  express: Zap,
  routier: Truck,
  maritime: Ship,
  aerien: Plane,
  voyageur: Briefcase,
  agence: Building2,
};

const gpTypeLabels: Record<string, string> = {
  express: "Express",
  routier: "Routier",
  maritime: "Maritime",
  aerien: "Aérien",
  voyageur: "Voyageur (GP)",
  agence: "Agence",
};

export default function TransporterProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<GPProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<GPProfileData>>({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("gp_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        navigate("/gp/inscription");
        return;
      }

      setProfile(data);
      setEditData({
        business_name: data.business_name,
        description: data.description,
        phone: data.phone,
        whatsapp: data.whatsapp,
        address: data.address,
        city: data.city,
        years_experience: data.years_experience,
        fleet_size: data.fleet_size,
      });
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("gp_profiles")
        .update({
          business_name: editData.business_name,
          description: editData.description,
          phone: editData.phone,
          whatsapp: editData.whatsapp,
          address: editData.address,
          city: editData.city,
          years_experience: editData.years_experience,
          fleet_size: editData.fleet_size,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast({ title: "Profil mis à jour avec succès" });
      setIsEditing(false);
      await loadProfile();
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="w-4 h-4 text-warning fill-warning" />);
      } else {
        stars.push(<Star key={i} className="w-4 h-4 text-muted-foreground/30" />);
      }
    }
    return stars;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const GPIcon = gpTypeIcons[profile.gp_type] || Truck;

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <MobileHeader title="Mon Profil" />

      <div className="px-4 py-4 space-y-4">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate("/gp/dashboard")}
          className="-ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour au tableau de bord
        </Button>

        {/* Profile Header */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mobile-card"
        >
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-2 border-primary/20">
              <GPIcon className="w-10 h-10 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  {isEditing ? (
                    <Input
                      value={editData.business_name || ""}
                      onChange={(e) => setEditData({ ...editData, business_name: e.target.value })}
                      className="font-bold text-xl mb-1"
                    />
                  ) : (
                    <h1 className="font-bold text-xl text-foreground truncate">
                      {profile.business_name}
                    </h1>
                  )}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3" />
                    {profile.city}, {profile.country_code}
                  </div>
                </div>
                <div className="flex gap-2">
                  {profile.verified_at && (
                    <Badge variant="success" className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Vérifié
                    </Badge>
                  )}
                  {profile.subscription === 'premium' && (
                    <Badge variant="gold">Premium</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-0.5">
                  {renderStars(profile.rating)}
                </div>
                <span className="font-bold">{profile.rating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({profile.total_reviews} avis)</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Status Card */}
        <Card className={profile.status === 'verified' ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  profile.status === 'verified' ? 'bg-success/10' : 'bg-warning/10'
                }`}>
                  <Shield className={`w-5 h-5 ${profile.status === 'verified' ? 'text-success' : 'text-warning'}`} />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {isValidGpStatus(profile.status) 
                      ? (profile.status === 'verified' ? 'Profil vérifié' : 
                         profile.status === 'pending' ? 'En attente de vérification' : 
                         profile.status === 'rejected' ? 'Profil rejeté' : 'Profil suspendu')
                      : profile.status}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profile.status === 'verified' ? `Vérifié le ${new Date(profile.verified_at || '').toLocaleDateString('fr-FR')}` : 
                     profile.status === 'pending' ? 'Votre profil est en cours de révision par notre équipe' :
                     'Contactez le support pour plus d\'informations'}
                  </p>
                </div>
              </div>
              <Badge variant={profile.status === 'verified' ? 'success' : profile.status === 'pending' ? 'pending' : 'destructive'}>
                {isValidGpStatus(profile.status) ? GP_STATUS_LABELS[profile.status] : profile.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Type Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={profile.gp_type as any}>
            <GPIcon className="w-3 h-3 mr-1" />
            {gpTypeLabels[profile.gp_type]}
          </Badge>
        </div>

        {/* Edit/Save Toggle */}
        <div className="flex justify-end gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={saving}>
                <X className="w-4 h-4 mr-1" />
                Annuler
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                Sauvegarder
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-1" />
              Modifier
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="mobile-card text-center">
            <Package className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{profile.total_deliveries}</p>
            <p className="text-xs text-muted-foreground">Livraisons</p>
          </div>
          <div className="mobile-card text-center">
            <Calendar className="w-6 h-6 text-secondary mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{profile.years_experience}</p>
            <p className="text-xs text-muted-foreground">Années exp.</p>
          </div>
          <div className="mobile-card text-center">
            <Star className="w-6 h-6 text-warning mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{profile.total_reviews}</p>
            <p className="text-xs text-muted-foreground">Avis</p>
          </div>
        </div>

        {/* Details Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Informations de contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Téléphone</Label>
                {isEditing ? (
                  <Input
                    value={editData.phone || ""}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  />
                ) : (
                  <p className="text-sm flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {profile.phone}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                {isEditing ? (
                  <Input
                    value={editData.whatsapp || ""}
                    onChange={(e) => setEditData({ ...editData, whatsapp: e.target.value })}
                    placeholder="Numéro WhatsApp"
                  />
                ) : (
                  <p className="text-sm flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-muted-foreground" />
                    {profile.whatsapp || "Non renseigné"}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ville</Label>
              {isEditing ? (
                <Input
                  value={editData.city || ""}
                  onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                />
              ) : (
                <p className="text-sm">{profile.city}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Adresse</Label>
              {isEditing ? (
                <Input
                  value={editData.address || ""}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  placeholder="Adresse complète"
                />
              ) : (
                <p className="text-sm">{profile.address || "Non renseignée"}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">À propos</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={editData.description || ""}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Décrivez votre activité, vos services..."
                rows={4}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {profile.description || "Aucune description"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Experience & Fleet */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Détails professionnels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Années d'expérience</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.years_experience || 0}
                    onChange={(e) => setEditData({ ...editData, years_experience: parseInt(e.target.value) })}
                    min={0}
                  />
                ) : (
                  <p className="text-sm font-medium">{profile.years_experience} ans</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Taille de la flotte</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editData.fleet_size || 1}
                    onChange={(e) => setEditData({ ...editData, fleet_size: parseInt(e.target.value) })}
                    min={1}
                  />
                ) : (
                  <p className="text-sm font-medium">{profile.fleet_size || 1} véhicule(s)</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Zones */}
        {profile.zones_covered && profile.zones_covered.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Zones couvertes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.zones_covered.map((zone, i) => (
                  <Badge key={i} variant="outline">{zone}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* International */}
        {profile.international_destinations && profile.international_destinations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Plane className="w-4 h-4 text-primary" />
                Destinations internationales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.international_destinations.map((dest, i) => (
                  <Badge key={i} variant="secondary">{dest}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vehicle Management */}
        <VehicleManagement gpId={profile.id} gpType={profile.gp_type} />

        {/* Scheduled Routes */}
        <ScheduledRoutesManager 
          gpId={profile.id} 
          vehicles={[]} 
        />

        {/* Generate Offers from Routes - Matchmaking automatique */}
        <GenerateOffersFromRoutes
          gpId={profile.id}
          gpType={profile.gp_type}
          routes={[]}
          onOffersGenerated={() => {
            toast({ title: "Offres générées avec succès" });
          }}
        />

        {/* Preview Link */}
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Voir votre profil tel qu'il apparaît aux clients :
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open(`/gp/${profile.id}`, '_blank')}
            >
              Voir le profil public
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
