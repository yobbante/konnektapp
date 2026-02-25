/**
 * ClientProfileComplete — Single-page profile completion with KYC document upload
 * No tabs — clean vertical flow for mobile
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { ALL_COUNTRIES } from "@/components/gp/SearchableCountrySelect";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Save, User, Phone, MapPin, Camera, Mail,
  FileText, Upload, CheckCircle, Shield, Key, Eye, EyeOff,
  Loader2
} from "lucide-react";
import { PhoneInputWithCode } from "@/components/ui/PhoneInputWithCode";
import { SearchableCountrySelect } from "@/components/gp/SearchableCountrySelect";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { MiniLoader } from "@/components/ui/MiniLoader";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";

export default function ClientProfileComplete() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");

  // Avatar
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Documents
  const idDocInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const [idDocUrl, setIdDocUrl] = useState<string | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);

  // Password dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });

  // Form
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    city: "",
    address: "",
    country_code: "SN",
    id_type: "",
    id_number: "",
  });

  const loadProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      setUserEmail(user.email || "");
      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setProfileId(data.id);
        setAvatarUrl(data.avatar_url);
        setIdDocUrl(data.id_document_url);
        setSelfieUrl(data.selfie_url);
        setFormData({
          full_name: data.full_name || "",
          phone: data.phone || "",
          city: data.city || "",
          address: data.address || "",
          country_code: data.country_code || "SN",
          id_type: "",
          id_number: "",
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const uploadFile = async (
    file: File,
    folder: string,
    setUploading: (v: boolean) => void,
    onSuccess: (path: string) => void
  ) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "Max 10 Mo", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const path = `${userId}/${folder}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("gp-documents").upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;

      // Get public URL for avatar display
      const { data: urlData } = supabase.storage.from("gp-documents").getPublicUrl(path);
      onSuccess(folder === "avatar" ? (urlData?.publicUrl || path) : path);
      toast({ title: "Fichier téléchargé" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file, "avatar", setUploadingAvatar, (url) => setAvatarUrl(url));
  };

  const handleIdDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file, "id-document", setUploadingDoc, (path) => setIdDocUrl(path));
  };

  const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file, "selfie", setUploadingSelfie, (path) => setSelfieUrl(path));
  };

  const handleSave = async () => {
    if (!profileId) return;
    setSaving(true);
    try {
      const updateData: Record<string, any> = {
        full_name: formData.full_name,
        phone: formData.phone,
        city: formData.city,
        address: formData.address,
        country_code: formData.country_code,
        updated_at: new Date().toISOString(),
      };
      if (avatarUrl) updateData.avatar_url = avatarUrl;
      if (idDocUrl) updateData.id_document_url = idDocUrl;
      if (selfieUrl) updateData.selfie_url = selfieUrl;

      // Auto-upgrade KYC level
      let newKycLevel = 0;
      if (formData.phone && formData.full_name) newKycLevel = 0; // L0 starter
      if (idDocUrl && selfieUrl) newKycLevel = 1; // L1 verified
      if (idDocUrl && selfieUrl && formData.address) newKycLevel = 2; // L2 confirmed
      updateData.kyc_level = newKycLevel;

      const { error } = await supabase.from("profiles").update(updateData).eq("id", profileId);
      if (error) throw error;

      toast({ title: "Profil mis à jour", description: newKycLevel > 0 ? "Votre niveau de vérification a été amélioré !" : undefined });
      navigate("/profil");
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast({ title: "Erreur", description: "Minimum 8 caractères", variant: "destructive" });
      return;
    }
    if (!/\d/.test(passwordForm.newPassword)) {
      toast({ title: "Erreur", description: "Au moins un chiffre requis", variant: "destructive" });
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordForm.newPassword)) {
      toast({ title: "Erreur", description: "Au moins un caractère spécial requis", variant: "destructive" });
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
      if (error) throw error;
      toast({ title: "Mot de passe modifié" });
      setShowPasswordDialog(false);
      setPasswordForm({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Completion score
  const getCompletion = () => {
    const fields = [formData.full_name, formData.phone, formData.city, formData.address, idDocUrl, selfieUrl];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><MiniLoader size="lg" /></div>;
  }

  const completion = getCompletion();

  return (
    <div className="min-h-screen bg-muted/30 pb-safe">
      <MobileHeader />

      <main className="px-4 pb-24" style={{ paddingTop: "calc(70px + env(safe-area-inset-top, 0px))" }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Compléter mon profil</h1>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
            </div>
          </div>

          {/* Completion bar */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Profil complété</span>
              <span className={completion >= 100 ? "text-emerald-500 font-medium" : "text-primary font-medium"}>
                {completion}%
              </span>
            </div>
            <Progress value={completion} className="h-2" />
            {completion >= 100 && (
              <p className="text-xs text-emerald-500 mt-1.5 font-medium">✨ Profil complet — Protection maximale activée</p>
            )}
          </div>

          {/* Avatar section */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-2 border-primary/20 overflow-hidden">
                  {uploadingAvatar ? (
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-primary" />
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md"
                >
                  <Camera className="w-3.5 h-3.5 text-primary-foreground" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <div>
                <p className="font-semibold">{formData.full_name || "Votre nom"}</p>
                <p className="text-xs text-muted-foreground">Cliquez sur l'icône pour ajouter une photo</p>
              </div>
            </div>
          </div>

          {/* Personal info */}
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Informations personnelles
            </h3>
            <div>
              <Label className="text-xs text-muted-foreground">Nom complet *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Prénom et nom"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Téléphone *</Label>
                <PhoneInputWithCode
                  value={formData.phone}
                  onChange={(v) => setFormData({ ...formData, phone: v })}
                  defaultCountry={formData.country_code || "SN"}
                  className="mt-1"
                  size="md"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Pays</Label>
                <SearchableCountrySelect
                  value={formData.country_code}
                  onValueChange={(code) => setFormData({ ...formData, country_code: code })}
                  className="mt-1 w-full"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Adresse
            </h3>
            <div>
              <Label className="text-xs text-muted-foreground">Ville *</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Votre ville"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Adresse complète</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rue, quartier..."
                className="mt-1"
              />
            </div>
          </div>

          {/* KYC Documents */}
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Vérification d'identité
            </h3>
            <p className="text-xs text-muted-foreground">
              Vérifiez votre identité pour activer la protection complète et des plafonds élevés.
            </p>

            {/* ID Type selection */}
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

            {/* ID Document upload */}
            <div>
              <Label className="text-xs text-muted-foreground">Document d'identité</Label>
              {idDocUrl ? (
                <div className="mt-1 flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-foreground flex-1">Document téléchargé</span>
                  <Button variant="ghost" size="sm" onClick={() => { setIdDocUrl(null); }}>
                    Remplacer
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => idDocInputRef.current?.click()}
                  className="w-full mt-1 border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-muted-foreground/50 hover:bg-muted/30 transition-all"
                >
                  {uploadingDoc ? (
                    <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Photo ou scan (JPG, PNG, PDF • Max 10 Mo)</p>
                    </>
                  )}
                </button>
              )}
              <input ref={idDocInputRef} type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={handleIdDocUpload} />
            </div>

            {/* Selfie upload */}
            <div>
              <Label className="text-xs text-muted-foreground">Selfie de vérification</Label>
              {selfieUrl ? (
                <div className="mt-1 flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-foreground flex-1">Selfie téléchargé</span>
                  <Button variant="ghost" size="sm" onClick={() => { setSelfieUrl(null); }}>
                    Remplacer
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => selfieInputRef.current?.click()}
                  className="w-full mt-1 border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-muted-foreground/50 hover:bg-muted/30 transition-all"
                >
                  {uploadingSelfie ? (
                    <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Photo de votre visage (JPG, PNG • Max 10 Mo)</p>
                    </>
                  )}
                </button>
              )}
              <input ref={selfieInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleSelfieUpload} />
            </div>
          </div>

          {/* Security */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <button
              onClick={() => setShowPasswordDialog(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Key className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Changer le mot de passe</p>
                  <p className="text-[11px] text-muted-foreground">Sécurisez votre compte</p>
                </div>
              </div>
              <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
            </button>
          </div>

          {/* Save button */}
          <Button className="w-full h-12 text-base" onClick={handleSave} disabled={saving}>
            {saving ? <MiniLoader size="sm" /> : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Enregistrer les modifications
              </>
            )}
          </Button>
        </motion.div>
      </main>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Changer le mot de passe</DialogTitle>
            <DialogDescription>Entrez votre nouveau mot de passe.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                placeholder="Nouveau mot de passe"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              />
              <button
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Input
              type="password"
              placeholder="Confirmer le mot de passe"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            />
            <Button className="w-full" onClick={handleChangePassword} disabled={passwordLoading}>
              {passwordLoading ? <MiniLoader size="sm" /> : "Confirmer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MobileNav />
    </div>
  );
}
