/**
 * ClientProfileComplete — Simplified single-page profile completion
 * Pre-filled from entry flow, minimal friction
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Save, User, MapPin, Camera, FileText, Upload,
  CheckCircle, Loader2
} from "lucide-react";
import { PhoneInputWithCode } from "@/components/ui/PhoneInputWithCode";
import { SearchableCountrySelect } from "@/components/gp/SearchableCountrySelect";
import { SearchableCitySelect } from "@/components/gp/SearchableCitySelect";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { PasswordChangeDialog } from "@/components/settings/SharedSettingsComponents";

export default function ClientProfileComplete() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [showPwdDialog, setShowPwdDialog] = useState(false);

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

  // Form — pre-filled from DB + entry flow
  const [formData, setFormData] = useState({
    full_name: "", phone: "", city: "", address: "",
    country_code: "SN", id_type: "", postal_code: "",
  });

  const loadProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserEmail(user.email || "");
      setUserId(user.id);

      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();

      // Pre-fill from session storage (entry flow) then DB
      const entryPhone = sessionStorage.getItem("entry_phone") || "";
      const entryCity = sessionStorage.getItem("entry_city") || "";
      let entryCountry = "SN";
      try {
        const raw = sessionStorage.getItem("entry_country");
        if (raw) entryCountry = JSON.parse(raw).code || "SN";
      } catch {}

      if (data) {
        setProfileId(data.id);
        setAvatarUrl(data.avatar_url);
        setIdDocUrl(data.id_document_url);
        setSelfieUrl(data.selfie_url);
        setFormData({
          full_name: data.full_name || "",
          phone: data.phone || entryPhone || "",
          city: data.city || data.residence_city || entryCity || "",
          address: data.address || "",
          country_code: data.country_code || entryCountry,
          id_type: "",
          postal_code: data.postal_code || "",
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const uploadFile = async (file: File, folder: string, setUploading: (v: boolean) => void, onSuccess: (p: string) => void) => {
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
      const { data: urlData } = supabase.storage.from("gp-documents").getPublicUrl(path);
      onSuccess(folder === "avatar" ? (urlData?.publicUrl || path) : path);
      toast({ title: "Fichier téléchargé" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profileId) return;
    setSaving(true);
    try {
      // Check phone uniqueness before saving (if phone changed)
      if (formData.phone) {
        const { data: existingPhone } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("phone", formData.phone)
          .neq("user_id", userId)
          .maybeSingle();
        if (existingPhone) {
          toast({ title: "Numéro déjà utilisé", description: "Ce numéro de téléphone est associé à un autre compte.", variant: "destructive" });
          setSaving(false);
          return;
        }
      }

      const updateData: Record<string, any> = {
        full_name: formData.full_name,
        phone: formData.phone,
        city: formData.city,
        residence_city: formData.city,
        address: formData.address,
        country_code: formData.country_code,
        postal_code: formData.postal_code,
        updated_at: new Date().toISOString(),
      };
      if (avatarUrl) updateData.avatar_url = avatarUrl;
      if (idDocUrl) updateData.id_document_url = idDocUrl;
      if (selfieUrl) updateData.selfie_url = selfieUrl;

      // Auto KYC level
      let kycLevel = 0;
      if (idDocUrl && selfieUrl) kycLevel = 1;
      if (idDocUrl && selfieUrl && formData.address) kycLevel = 2;
      updateData.kyc_level = kycLevel;

      const { error } = await supabase.from("profiles").update(updateData).eq("id", profileId);
      if (error) {
        if (error.message?.includes("idx_profiles_phone_unique")) {
          toast({ title: "Numéro déjà utilisé", description: "Ce numéro de téléphone est associé à un autre compte.", variant: "destructive" });
          setSaving(false);
          return;
        }
        throw error;
      }

      toast({ title: "Profil mis à jour ✓", description: kycLevel > 0 ? "Vérification améliorée" : undefined });
      navigate("/profil");
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const completion = (() => {
    const fields = [formData.full_name, formData.phone, formData.city, formData.address, idDocUrl, selfieUrl];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  })();

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><MiniLoader size="lg" /></div>;

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
              <h1 className="text-xl font-bold">Mon profil</h1>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
            </div>
          </div>

          {/* Completion */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Complété</span>
              <span className={completion >= 100 ? "text-emerald-500 font-medium" : "text-primary font-medium"}>{completion}%</span>
            </div>
            <Progress value={completion} className="h-2" />
            {completion >= 100 && <p className="text-xs text-emerald-500 mt-1.5 font-medium">Protection maximale activée</p>}
          </div>

          {/* Avatar */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-2 border-primary/20 overflow-hidden">
                  {uploadingAvatar ? <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    : avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    : <User className="w-10 h-10 text-primary" />}
                </div>
                <button onClick={() => avatarInputRef.current?.click()} className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md">
                  <Camera className="w-3.5 h-3.5 text-primary-foreground" />
                </button>
                <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, "avatar", setUploadingAvatar, setAvatarUrl); }} />
              </div>
              <div>
                <p className="font-semibold">{formData.full_name || "Votre nom"}</p>
                <p className="text-xs text-muted-foreground">Ajoutez une photo</p>
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
              <Input value={formData.full_name} onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))} placeholder="Prénom et nom" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Téléphone *</Label>
                {formData.phone ? (
                  <div className="flex items-center gap-2 px-3 py-2 mt-1 bg-muted/50 rounded-lg border border-input h-10">
                    <span className="text-sm font-medium flex-1 truncate">{formData.phone}</span>
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  </div>
                ) : (
                  <PhoneInputWithCode value={formData.phone} onChange={v => setFormData(p => ({ ...p, phone: v }))} defaultCountry={formData.country_code || "SN"} className="mt-1" size="md" />
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Pays</Label>
                <SearchableCountrySelect value={formData.country_code} onValueChange={code => setFormData(p => ({ ...p, country_code: code }))} className="mt-1 w-full" />
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
              <Label className="text-xs text-muted-foreground">Ville de résidence *</Label>
              <SearchableCitySelect value={formData.city} countryCode={formData.country_code} onSelect={(city, country) => setFormData(p => ({ ...p, city, country_code: country }))} label="Ville de résidence" placeholder="Rechercher votre ville..." className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Code postal</Label>
              <Input value={formData.postal_code} onChange={e => setFormData(p => ({ ...p, postal_code: e.target.value }))} placeholder="Ex: 75001" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Adresse complète</Label>
              <Input value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="Rue, quartier..." className="mt-1" />
            </div>
          </div>

          {/* KYC Documents */}
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Vérification d'identité
            </h3>
            <p className="text-xs text-muted-foreground">Vérifiez votre identité pour la protection complète.</p>

            <div>
              <Label className="text-xs text-muted-foreground">Type de pièce</Label>
              <select className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm" value={formData.id_type} onChange={e => setFormData(p => ({ ...p, id_type: e.target.value }))}>
                <option value="">Sélectionner...</option>
                <option value="cni">Carte Nationale d'Identité</option>
                <option value="passport">Passeport</option>
                <option value="permis">Permis de conduire</option>
                <option value="carte_sejour">Carte de séjour</option>
              </select>
            </div>

            {/* ID Doc */}
            <div>
              <Label className="text-xs text-muted-foreground">Document d'identité</Label>
              {idDocUrl ? (
                <div className="mt-1 flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-foreground flex-1">Document téléchargé</span>
                  <Button variant="ghost" size="sm" onClick={() => setIdDocUrl(null)}>Remplacer</Button>
                </div>
              ) : (
                <button onClick={() => idDocInputRef.current?.click()} className="w-full mt-1 border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-muted-foreground/50 hover:bg-muted/30 transition-all">
                  {uploadingDoc ? <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" /> : (
                    <><Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" /><p className="text-xs text-muted-foreground">Photo ou scan (Max 10 Mo)</p></>
                  )}
                </button>
              )}
              <input ref={idDocInputRef} type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, "id-document", setUploadingDoc, setIdDocUrl); }} />
            </div>

            {/* Selfie */}
            <div>
              <Label className="text-xs text-muted-foreground">Selfie de vérification</Label>
              {selfieUrl ? (
                <div className="mt-1 flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-foreground flex-1">Selfie téléchargé</span>
                  <Button variant="ghost" size="sm" onClick={() => setSelfieUrl(null)}>Remplacer</Button>
                </div>
              ) : (
                <button onClick={() => selfieInputRef.current?.click()} className="w-full mt-1 border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-muted-foreground/50 hover:bg-muted/30 transition-all">
                  {uploadingSelfie ? <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" /> : (
                    <><Camera className="w-6 h-6 text-muted-foreground mx-auto mb-1" /><p className="text-xs text-muted-foreground">Photo de votre visage (Max 10 Mo)</p></>
                  )}
                </button>
              )}
              <input ref={selfieInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, "selfie", setUploadingSelfie, setSelfieUrl); }} />
            </div>
          </div>

          {/* Security shortcut */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <button onClick={() => setShowPwdDialog(true)} className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Mot de passe</p>
                  <p className="text-[11px] text-muted-foreground">Modifier l'accès</p>
                </div>
              </div>
              <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
            </button>
          </div>

          {/* Save */}
          <Button className="w-full h-12 text-base" onClick={handleSave} disabled={saving}>
            {saving ? <MiniLoader size="sm" /> : <><Save className="w-5 h-5 mr-2" />Enregistrer</>}
          </Button>
        </motion.div>
      </main>

      <PasswordChangeDialog open={showPwdDialog} onOpenChange={setShowPwdDialog} userEmail={userEmail} />
      <MobileNav />
    </div>
  );
}
