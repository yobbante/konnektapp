import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  User, Mail, Phone, MapPin, Camera, Edit2, Save, X,
  Package, CheckCircle, Clock, Truck, LogOut, Shield,
  Settings, Bell, Lock, ChevronRight, AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  country_code: string | null;
  is_gp: boolean | null;
  created_at: string;
}

interface OrderStats {
  total: number;
  pending: number;
  inTransit: number;
  delivered: number;
}

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isGP, isAuthenticated, loading: roleLoading } = useUserRole();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orderStats, setOrderStats] = useState<OrderStats>({ total: 0, pending: 0, inTransit: 0, delivered: 0 });
  
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
  });

  useEffect(() => {
    if (!roleLoading && !isAuthenticated) {
      navigate("/auth");
      return;
    }
    if (isAuthenticated) {
      loadProfile();
    }
  }, [isAuthenticated, roleLoading]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      const profileWithEmail = {
        ...profileData,
        email: user.email,
      } as UserProfile;

      setProfile(profileWithEmail);
      setFormData({
        full_name: profileData?.full_name || "",
        phone: profileData?.phone || "",
      });

      // Load order stats
      const { data: orders } = await supabase
        .from("orders")
        .select("status")
        .eq("client_id", user.id);

      if (orders) {
        setOrderStats({
          total: orders.length,
          pending: orders.filter(o => o.status === 'pending').length,
          inTransit: orders.filter(o => o.status === 'in_transit' || o.status === 'accepted').length,
          delivered: orders.filter(o => o.status === 'delivered').length,
        });
      }

    } catch (error: any) {
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

  const calculateProfileCompletion = (): number => {
    if (!profile) return 0;
    
    const fields = [
      profile.full_name,
      profile.email,
      profile.phone,
      profile.avatar_url,
    ];
    
    const completed = fields.filter(field => field && field.trim() !== "").length;
    return Math.round((completed / fields.length) * 100);
  };

  const handleSave = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
        })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        full_name: formData.full_name,
        phone: formData.phone,
      });
      setEditing(false);
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été enregistrées",
      });
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le profil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const completion = calculateProfileCompletion();
  const memberSince = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '';

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <MobileHeader title="Mon Profil" />

      <div className="px-4 py-4 space-y-4">
        {/* Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mobile-card relative overflow-hidden"
        >
          {/* Badges for GP/Admin */}
          <div className="absolute top-3 right-3 flex gap-2">
            {isAdmin && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Admin
              </Badge>
            )}
            {isGP && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Truck className="w-3 h-3" />
                GP
              </Badge>
            )}
          </div>

          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-2 border-primary/20">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  <User className="w-10 h-10 text-primary" />
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md">
                <Camera className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="font-bold text-xl text-foreground truncate">
                {profile?.full_name || 'Utilisateur'}
              </h2>
              <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
              <p className="text-xs text-muted-foreground mt-1">Membre depuis {memberSince}</p>
            </div>
          </div>

          {/* Profile Completion */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Profil complété</span>
              <span className="text-sm font-bold text-primary">{completion}%</span>
            </div>
            <Progress value={completion} className="h-2" />
            {completion < 100 && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Complétez votre profil pour une meilleure expérience
              </p>
            )}
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-2"
        >
          <div className="mobile-card text-center py-3">
            <Package className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{orderStats.total}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
          <div className="mobile-card text-center py-3">
            <Clock className="w-5 h-5 text-warning mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{orderStats.pending}</p>
            <p className="text-[10px] text-muted-foreground">Attente</p>
          </div>
          <div className="mobile-card text-center py-3">
            <Truck className="w-5 h-5 text-secondary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{orderStats.inTransit}</p>
            <p className="text-[10px] text-muted-foreground">Transit</p>
          </div>
          <div className="mobile-card text-center py-3">
            <CheckCircle className="w-5 h-5 text-success mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{orderStats.delivered}</p>
            <p className="text-[10px] text-muted-foreground">Livrés</p>
          </div>
        </motion.div>

        {/* Edit Profile Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Informations personnelles</CardTitle>
                {!editing ? (
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                    <Edit2 className="w-4 h-4" />
                    Modifier
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                    <Button variant="default" size="sm" onClick={handleSave} disabled={saving}>
                      <Save className="w-4 h-4" />
                      {saving ? "..." : "Sauver"}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Nom complet</Label>
                {editing ? (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      className="pl-10"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Votre nom complet"
                    />
                  </div>
                ) : (
                  <p className="font-medium text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    {profile?.full_name || <span className="text-muted-foreground italic">Non renseigné</span>}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  {profile?.email}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Téléphone</Label>
                {editing ? (
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      className="pl-10"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+221 77 123 45 67"
                    />
                  </div>
                ) : (
                  <p className="font-medium text-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {profile?.phone || <span className="text-muted-foreground italic">Non renseigné</span>}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Pays</Label>
                <p className="font-medium text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {profile?.country_code === 'SN' ? '🇸🇳 Sénégal' : profile?.country_code || 'Non renseigné'}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Access Links */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <h3 className="font-semibold text-foreground px-1">Accès rapide</h3>
          
          <Link to="/client/dashboard">
            <div className="mobile-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Mes envois</p>
                  <p className="text-xs text-muted-foreground">Gérer vos expéditions</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Link>

          <Link to="/messages">
            <div className="mobile-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Messages</p>
                  <p className="text-xs text-muted-foreground">Conversations avec les GP</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Link>

          {isGP && (
            <Link to="/gp/dashboard">
              <div className="mobile-card flex items-center justify-between border-l-4 border-l-secondary">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Espace GP</p>
                    <p className="text-xs text-muted-foreground">Gérer vos missions</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Link>
          )}

          {isAdmin && (
            <Link to="/admin">
              <div className="mobile-card flex items-center justify-between border-l-4 border-l-destructive">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Administration</p>
                    <p className="text-xs text-muted-foreground">Dashboard admin</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Link>
          )}
        </motion.div>

        {/* Sign Out */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={handleSignOut}>
            <LogOut className="w-5 h-5" />
            Se déconnecter
          </Button>
        </motion.div>
      </div>

      <MobileNav />
    </div>
  );
}
