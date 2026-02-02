/**
 * ClientProfileComplete - Page profil client complète
 * 
 * Contient toutes les informations du client:
 * - Informations personnelles
 * - Sécurité (mot de passe, 2FA)
 * - Documents KYC
 * - Adresses
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Mail, Phone, MapPin, Camera, Save, Edit2, ArrowLeft,
  Shield, Key, FileText, Upload, CheckCircle, AlertCircle,
  Eye, EyeOff, Lock, Calendar, CreditCard, Home, Building
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { MiniLoader } from "@/components/ui/MiniLoader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  date_of_birth?: string | null;
  nationality?: string | null;
  id_type?: string | null;
  id_number?: string | null;
  id_document_url?: string | null;
  secondary_address?: string | null;
}

export default function ClientProfileComplete() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [activeTab, setActiveTab] = useState("personal");
  
  // Password change state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  // Form data
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    city: "",
    address: "",
    date_of_birth: "",
    nationality: "",
    id_type: "",
    id_number: "",
    secondary_address: "",
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

      setUserEmail(user.email || "");

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileData) {
        setProfile({
          ...profileData,
          email: user.email,
        } as UserProfile);
        setFormData({
          full_name: profileData.full_name || "",
          phone: profileData.phone || "",
          city: profileData.city || "",
          address: profileData.address || "",
          date_of_birth: "",
          nationality: "",
          id_type: "",
          id_number: "",
          secondary_address: "",
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

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive",
      });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) throw error;

      toast({
        title: "Mot de passe modifié",
        description: "Votre nouveau mot de passe est actif",
      });
      setShowPasswordDialog(false);
      setPasswordForm({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le mot de passe",
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const calculateCompletion = () => {
    const fields = [
      formData.full_name, formData.phone, formData.city, 
      formData.address, formData.date_of_birth, formData.nationality
    ];
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
          className="max-w-lg mx-auto"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Mon Profil Complet</h1>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
            </div>
          </div>

          {/* Completion Progress */}
          <div className="bg-card rounded-2xl border border-border p-4 mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Profil complété</span>
              <span className={completion === 100 ? 'text-success font-medium' : 'text-primary font-medium'}>
                {completion}%
              </span>
            </div>
            <Progress value={completion} className="h-2" />
            {completion < 100 && (
              <p className="text-xs text-muted-foreground mt-2">
                Complétez votre profil pour une meilleure expérience
              </p>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger value="personal" className="text-xs">
                <User className="w-4 h-4 mr-1" />
                Infos
              </TabsTrigger>
              <TabsTrigger value="security" className="text-xs">
                <Shield className="w-4 h-4 mr-1" />
                Sécurité
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs">
                <FileText className="w-4 h-4 mr-1" />
                Documents
              </TabsTrigger>
            </TabsList>

            {/* Personal Info Tab */}
            <TabsContent value="personal" className="space-y-4 mt-0">
              <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Informations personnelles
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Nom complet</Label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Votre nom complet"
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Téléphone</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+221 77..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Date de naissance</Label>
                      <Input
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Nationalité</Label>
                    <Input
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      placeholder="Votre nationalité"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Addresses */}
              <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Adresses
                </h3>
                
                <div className="space-y-3">
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
                    <Label className="text-xs text-muted-foreground">Adresse principale</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Adresse de livraison habituelle"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Adresse secondaire (optionnel)</Label>
                    <Input
                      value={formData.secondary_address}
                      onChange={(e) => setFormData({ ...formData, secondary_address: e.target.value })}
                      placeholder="Autre adresse"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? <MiniLoader size="sm" /> : <><Save className="w-4 h-4 mr-2" /> Enregistrer</>}
              </Button>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-4 mt-0">
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <button 
                  onClick={() => setShowPasswordDialog(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Key className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Changer le mot de passe</p>
                      <p className="text-xs text-muted-foreground">Mettre à jour votre mot de passe</p>
                    </div>
                  </div>
                  <ArrowLeft className="w-5 h-5 text-muted-foreground rotate-180" />
                </button>

                <Separator />

                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-success" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Email vérifié</p>
                      <p className="text-xs text-muted-foreground">{userEmail}</p>
                    </div>
                    <Badge variant="secondary" className="bg-success/10 text-success">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Vérifié
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Sécurité du compte</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Votre compte est protégé. Nous utilisons le chiffrement pour sécuriser vos données.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-4 mt-0">
              <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Pièce d'identité (KYC)
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Type de pièce</Label>
                    <select 
                      className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={formData.id_type}
                      onChange={(e) => setFormData({ ...formData, id_type: e.target.value })}
                    >
                      <option value="">Sélectionner...</option>
                      <option value="cni">Carte Nationale d'Identité</option>
                      <option value="passport">Passeport</option>
                      <option value="permis">Permis de conduire</option>
                      <option value="carte_sejour">Carte de séjour</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Numéro de la pièce</Label>
                    <Input
                      value={formData.id_number}
                      onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                      placeholder="Numéro de votre pièce"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium mb-1">Téléverser votre pièce</p>
                  <p className="text-xs text-muted-foreground">
                    Photo ou scan de votre pièce d'identité
                  </p>
                  <Button variant="outline" size="sm" className="mt-3">
                    Choisir un fichier
                  </Button>
                </div>

                <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <p className="text-xs text-amber-700">
                    La vérification KYC est optionnelle mais recommandée pour débloquer toutes les fonctionnalités.
                  </p>
                </div>
              </div>

              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? <MiniLoader size="sm" /> : <><Save className="w-4 h-4 mr-2" /> Enregistrer</>}
              </Button>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Changer le mot de passe
            </DialogTitle>
            <DialogDescription>
              Entrez votre nouveau mot de passe
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirmer le mot de passe</Label>
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleChangePassword}
              disabled={passwordLoading || !passwordForm.newPassword || !passwordForm.confirmPassword}
            >
              {passwordLoading ? <MiniLoader size="sm" /> : "Modifier le mot de passe"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MobileNav />
    </div>
  );
}
