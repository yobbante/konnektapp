/**
 * UnifiedProfile - Page profil client unifiée
 * 
 * Remplace /profil, /profile, /client/profil
 * Interface épurée et intuitive avec les infos essentielles
 */

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  User, Mail, Phone, MapPin, Camera, Save, Edit2,
  Package, CheckCircle, Clock, Truck, LogOut, Settings,
  ChevronRight, Shield, Star, ArrowLeft, Key
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { SwitchToTransporteurButton } from "@/components/profile/SwitchToTransporteurButton";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface OrderStats {
  total: number;
  pending: number;
  inTransit: number;
  delivered: number;
  totalSpent: number;
}

export default function UnifiedProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<OrderStats>({ total: 0, pending: 0, inTransit: 0, delivered: 0, totalSpent: 0 });
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    city: "",
    address: "",
  });

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

      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileData) {
        setProfile({
          ...profileData,
          email: user.email,
        });
        setFormData({
          full_name: profileData.full_name || "",
          phone: profileData.phone || "",
          city: profileData.city || "",
          address: profileData.address || "",
        });
      }

      // Load order stats
      const { data: orders } = await supabase
        .from("orders")
        .select("status, total_price")
        .eq("client_id", user.id);

      if (orders) {
        setStats({
          total: orders.length,
          pending: orders.filter(o => ['pending', 'accepted'].includes(o.status)).length,
          inTransit: orders.filter(o => ['collected', 'in_transit'].includes(o.status)).length,
          delivered: orders.filter(o => o.status === 'delivered').length,
          totalSpent: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total_price || 0), 0),
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
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
          city: formData.city,
          address: formData.address,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({ ...profile, ...formData });
      setIsEditing(false);
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été enregistrées",
      });
    } catch (error) {
      console.error("Error saving:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder",
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

  const calculateCompletion = () => {
    if (!profile) return 0;
    const fields = [profile.full_name, profile.phone, profile.city, profile.address, profile.avatar_url];
    const completed = fields.filter(f => f && String(f).trim() !== "").length;
    return Math.round((completed / fields.length) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <MiniLoader size="lg" />
      </div>
    );
  }

  const completion = calculateCompletion();
  const memberSince = profile?.created_at 
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) 
    : '';

  return (
    <div className="min-h-screen bg-muted/30 pb-safe">
      <MobileHeader />
      
      <main 
        className="px-4 pb-24"
        style={{ paddingTop: 'calc(70px + env(safe-area-inset-top, 0px))' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto space-y-4"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">Mon Profil</h1>
          </div>

          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-4"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-2 border-primary/20">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-2xl object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-primary" />
                  )}
                </div>
                <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
                  <Camera className="w-3 h-3 text-primary-foreground" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg truncate">
                  {profile?.full_name || 'Utilisateur'}
                </h2>
                <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
                <p className="text-xs text-muted-foreground mt-1">Membre depuis {memberSince}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsEditing(!isEditing)}
                className="rounded-full"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Completion */}
            <div className="pt-3 border-t border-border">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Profil complété</span>
                <span className={completion === 100 ? 'text-success font-medium' : 'text-primary font-medium'}>
                  {completion}%
                </span>
              </div>
              <Progress value={completion} className="h-2" />
            </div>
          </motion.div>

          {/* Edit Form */}
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-card rounded-2xl border border-border p-4 space-y-4"
            >
              <h3 className="font-semibold flex items-center gap-2">
                <Edit2 className="w-4 h-4" />
                Modifier mes informations
              </h3>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Nom complet</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Votre nom"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Téléphone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+221 77 123 45 67"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Ville</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Votre ville"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Adresse</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Votre adresse"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                  Annuler
                </Button>
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving ? <MiniLoader size="sm" /> : <><Save className="w-4 h-4 mr-2" /> Enregistrer</>}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Package, value: stats.total, label: "Total", color: "text-primary" },
              { icon: Clock, value: stats.pending, label: "Attente", color: "text-warning" },
              { icon: Truck, value: stats.inTransit, label: "Transit", color: "text-blue-500" },
              { icon: CheckCircle, value: stats.delivered, label: "Livrés", color: "text-success" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="bg-card rounded-xl border border-border p-3 text-center"
              >
                <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-1`} />
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Quick Links */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <Link to="/historique" className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Historique des envois</p>
                  <p className="text-xs text-muted-foreground">{stats.total} envois au total</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>
            
            <div className="h-px bg-border" />
            
            <Link to="/settings" className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Paramètres</p>
                  <p className="text-xs text-muted-foreground">Notifications, sécurité</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Link>
          </div>

          {/* Become Transporter */}
          <SwitchToTransporteurButton />

          {/* Logout */}
          <Button
            variant="ghost"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Se déconnecter
          </Button>
        </motion.div>
      </main>

      <MobileNav />
    </div>
  );
}
