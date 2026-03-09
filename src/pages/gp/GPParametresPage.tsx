/**
 * GPParametresPage — Paramètres GP compact, sans doublons
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings, User, DollarSign, Bell, ScanLine, Shield,
  LogOut, MapPin, Phone,
  Edit3, Save, X, MessageCircle, FileCheck,
  ShieldX, Upload, BadgeCheck, Wallet, Key,
  Crown, Zap, BarChart3, Mail, HelpCircle,
  FileText, Info, Languages, Trash2,
  Award, AlertTriangle, CheckCircle, Palette, Route, ArrowRight, Lock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { toast } from "@/components/ui/use-toast";
import { PremiumCTABanner } from "@/components/gp/PremiumCTABanner";
import {
  SettingsSection, SettingsRow, ToggleRow,
  PasswordChangeDialog, ForgotPasswordDialog,
  loadNotificationPrefs, saveNotificationPref,
  type NotificationPrefs, defaultNotificationPrefs,
} from "@/components/settings/SharedSettingsComponents";

export default function GPParametresPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [editingProfile, setEditingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [showPwdDialog, setShowPwdDialog] = useState(false);
  const [showForgotPwd, setShowForgotPwd] = useState(false);
  const [profileForm, setProfileForm] = useState({
    business_name: "", phone: "", whatsapp_phone: "",
    deposit_address: "", reception_address: "", description: "",
  });
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(defaultNotificationPrefs);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserEmail(user.email || "");

      const [profileRes, prefsData] = await Promise.all([
        supabase.from("gp_profiles")
          .select("id, business_name, gp_type, status, subscription, base_price_per_kg, default_currency, deposit_address, reception_address, phone, whatsapp_phone, description, kyc_level, kyc_status, id_document_url, selfie_url, business_registration_url, explicit_restrictions, base_origin_city, base_origin_country, base_destination_city, base_destination_country, rating, total_deliveries, total_reviews, verified_at, withdrawal_limit, auto_accept_enabled")
          .eq("user_id", user.id).maybeSingle(),
        loadNotificationPrefs(user.id),
      ]);

      const profile = profileRes.data;
      if (!profile) { navigate("/gp/inscription"); return; }
      setGpProfile(profile);
      setNotifPrefs(prefsData);

      const originLabel = [profile.base_origin_city, profile.base_origin_country].filter(Boolean).join(", ");
      const destLabel = [profile.base_destination_city, profile.base_destination_country].filter(Boolean).join(", ");

      setProfileForm({
        business_name: profile.business_name || "",
        phone: profile.phone || "",
        whatsapp_phone: profile.whatsapp_phone || "",
        deposit_address: profile.deposit_address || originLabel || "",
        reception_address: profile.reception_address || destLabel || "",
        description: profile.description || "",
      });

      const { data: orders } = await supabase.from("orders").select("status").eq("gp_id", profile.id);
      setPendingCount(orders?.filter(o => o.status === "pending").length || 0);
      setActiveCount(orders?.filter(o => ["accepted", "collected", "in_transit"].includes(o.status)).length || 0);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("gp_profiles").update({
        ...profileForm, updated_at: new Date().toISOString(),
      }).eq("id", gpProfile.id);
      if (error) throw error;
      setGpProfile((prev: any) => ({ ...prev, ...profileForm }));
      setEditingProfile(false);
      toast({ title: "Profil mis à jour ✓" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (key: keyof NotificationPrefs) => {
    const newVal = !notifPrefs[key];
    setNotifPrefs(p => ({ ...p, [key]: newVal }));
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await saveNotificationPref(user.id, key, newVal);
  };

  if (loading) return <PageLoader message="Chargement..." />;
  if (!gpProfile) return null;

  const kycLevel = gpProfile.kyc_level ?? 0;
  const kycStatus = gpProfile.kyc_status || "pending";
  const hasId = !!gpProfile.id_document_url;
  const hasSelfie = !!gpProfile.selfie_url;
  const hasBusinessReg = !!gpProfile.business_registration_url;
  const originLabel = gpProfile.base_origin_country || "départ";
  const destLabel = gpProfile.base_destination_country || "destination";
  const isPremium = gpProfile.subscription === "premium" || gpProfile.subscription === "pro";
  const subLabel = gpProfile.subscription === "pro" ? "Pro" : gpProfile.subscription === "premium" ? "Premium" : "Gratuit";
  const withdrawalLimit = gpProfile.withdrawal_limit ?? 300000;
  const currency = gpProfile.default_currency || "XOF";

  const kycSteps = [
    { label: "Inscription", done: true },
    { label: "Pièce d'identité", done: hasId },
    { label: "Selfie", done: hasSelfie },
    { label: "Doc. entreprise", done: hasBusinessReg },
  ];
  const kycCompletedSteps = kycSteps.filter(s => s.done).length;
  const kycProgress = Math.round((kycCompletedSteps / kycSteps.length) * 100);

  return (
    <GPDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeOrdersCount={activeCount} activeTab="parametres">
      <div className="px-4 py-3 space-y-3 pb-24">
        <div className="flex items-center gap-2">
          <Settings className="w-4.5 h-4.5 text-primary" />
          <h1 className="text-base font-bold">Paramètres</h1>
        </div>

        {/* ═══ 1. IDENTITÉ ═══ */}
        <SettingsSection title="Profil">
          {editingProfile ? (
            <div className="p-3 space-y-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Nom commercial</Label>
                <Input className="h-8 text-sm" value={profileForm.business_name} onChange={e => setProfileForm(p => ({ ...p, business_name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Description</Label>
                <Textarea value={profileForm.description} onChange={e => setProfileForm(p => ({ ...p, description: e.target.value }))} rows={2} className="text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Téléphone</Label>
                  <Input className="h-8 text-sm" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">WhatsApp</Label>
                  <Input className="h-8 text-sm" value={profileForm.whatsapp_phone} onChange={e => setProfileForm(p => ({ ...p, whatsapp_phone: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">{originLabel}</Label>
                  <Input className="h-8 text-sm" value={profileForm.deposit_address} onChange={e => setProfileForm(p => ({ ...p, deposit_address: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">{destLabel}</Label>
                  <Input className="h-8 text-sm" value={profileForm.reception_address} onChange={e => setProfileForm(p => ({ ...p, reception_address: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveProfile} disabled={saving} size="sm" className="flex-1 gap-1 h-8 text-xs">
                  <Save className="w-3 h-3" /> {saving ? "..." : "Enregistrer"}
                </Button>
                <Button variant="outline" size="sm" className="h-8" onClick={() => setEditingProfile(false)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-tight">{gpProfile.business_name}</p>
                    <p className="text-[10px] text-muted-foreground">{userEmail}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingProfile(true)}>
                  <Edit3 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Separator />
              <div className="px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                <InfoPair icon={Phone} label="Tél." value={gpProfile.phone || "—"} />
                <InfoPair icon={MessageCircle} label="WhatsApp" value={gpProfile.whatsapp_phone || "—"} />
                <InfoPair icon={MapPin} label={originLabel} value={gpProfile.deposit_address || "—"} />
                <InfoPair icon={MapPin} label={destLabel} value={gpProfile.reception_address || "—"} />
              </div>
            </>
          )}
        </SettingsSection>

        {/* ═══ 2. KYC compact — just progress bar + arrow ═══ */}
        <SettingsSection title="Vérification KYC">
          <button onClick={() => navigate("/gp/profil-public")} className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors active:scale-[0.98]">
            <BadgeCheck className={`w-4 h-4 flex-shrink-0 ${kycStatus === "verified" ? "text-emerald-500" : "text-muted-foreground"}`} />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Niveau {kycLevel}</span>
                <Badge variant={kycStatus === "verified" ? "default" : "secondary"} className="text-[9px] h-4">
                  {kycStatus === "verified" ? "Vérifié" : "En cours"}
                </Badge>
              </div>
              <Progress value={kycProgress} className="h-1.5" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </button>
        </SettingsSection>

        {/* ═══ 3. NAVETTES ═══ */}
        <SettingsSection title="Opérations">
          <SettingsRow
            icon={Route}
            iconColor="text-violet-500"
            iconBg="bg-violet-500/10"
            label="Mes navettes"
            desc={isPremium ? `Gérer mes trajets réguliers` : "Réservé Premium / Pro"}
            onClick={() => isPremium ? navigate("/gp/navettes") : navigate("/gp/premium")}
            right={!isPremium ? <Lock className="w-4 h-4 text-muted-foreground" /> : undefined}
          />

          <Separator />
          <SettingsRow icon={User} label="Profil public" desc="Aperçu client" onClick={() => navigate("/gp/profil-public")} />
          <Separator />
          <SettingsRow icon={DollarSign} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" label="Tarification" desc={`${gpProfile.base_price_per_kg || 0} ${currency}/kg`} onClick={() => navigate("/gp/tarification")} />
          <Separator />
          <SettingsRow icon={ShieldX} iconColor="text-orange-500" iconBg="bg-orange-500/10" label="Restrictions" desc={`${(gpProfile.explicit_restrictions || []).length} actives`} onClick={() => navigate("/gp/restrictions")} />
          <Separator />
          <SettingsRow icon={ScanLine} iconColor="text-purple-500" iconBg="bg-purple-500/10" label="Scanner QR" desc="Caméra" onClick={() => navigate("/gp/scan")} />
          <Separator />
          <SettingsRow icon={BarChart3} iconColor="text-amber-500" iconBg="bg-amber-500/10" label="Performances" desc={isPremium ? "Statistiques" : "Découvrir"} onClick={() => navigate("/gp/performances")} />
          <Separator />
          <SettingsRow icon={Zap} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Auto-acceptation" desc={isPremium && gpProfile.auto_accept_enabled ? "Activee" : isPremium ? "Desactivee" : "Decouvrir"} onClick={() => navigate("/gp/auto-accept")} />
        </SettingsSection>

        {/* ═══ 4. SÉCURITÉ & FINANCES (fusionné) ═══ */}
        <SettingsSection title="Sécurité & Finances">
          <SettingsRow icon={Wallet} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" label="Portefeuille" desc="Solde et retraits" onClick={() => navigate("/gp/wallet")} />
          <Separator />
          <SettingsRow icon={Shield} label="KTP & GeoTrack" desc="Score de confiance" onClick={() => navigate("/gp/ktp-geotrack")} />
          <Separator />
          <SettingsRow icon={Key} iconColor="text-amber-500" iconBg="bg-amber-500/10" label="Mot de passe" desc="Modifier ou réinitialiser" onClick={() => setShowPwdDialog(true)} />
        </SettingsSection>

        {/* ═══ 5. ABONNEMENT (simplifié, 1 seule entrée) ═══ */}
        <SettingsSection title="Abonnement">
          <SettingsRow
            icon={Crown}
            iconColor="text-amber-500"
            iconBg="bg-amber-500/10"
            label="Mon plan"
            desc={`${subLabel} — ${isPremium ? "Actif" : "Comparer les offres"}`}
            onClick={() => navigate("/gp/premium")}
          />
          <Separator />
          <SettingsRow icon={FileText} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Facturation" desc="Factures et reçus" onClick={() => navigate("/gp/facturation")} />
        </SettingsSection>

        {/* Premium CTA — compact */}
        <PremiumCTABanner variant="compact" context="menu" subscription={gpProfile.subscription} />

        {/* ═══ 6. NOTIFICATIONS ═══ */}
        <SettingsSection title="Notifications">
          <ToggleRow icon={Bell} label="Push" desc="Temps réel" checked={notifPrefs.push_notifications} onToggle={() => handleToggle("push_notifications")} />
          <Separator />
          <ToggleRow icon={Bell} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Messages" desc="Clients" checked={notifPrefs.new_message_alerts} onToggle={() => handleToggle("new_message_alerts")} />
          <Separator />
          <ToggleRow icon={Bell} iconColor="text-orange-500" iconBg="bg-orange-500/10" label="Commandes" desc="Statuts" checked={notifPrefs.order_status_alerts} onToggle={() => handleToggle("order_status_alerts")} />
        </SettingsSection>

        {/* ═══ 7. AIDE, APPARENCE & LÉGAL (fusionné) ═══ */}
        <SettingsSection title="Autres">
          <div className="px-3 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Palette className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-medium">Apparence</span>
            </div>
            <ThemeToggle />
          </div>
          <Separator />
          <SettingsRow icon={Languages} iconColor="text-indigo-500" iconBg="bg-indigo-500/10" label="Langue" desc="Français" onClick={() => toast({ title: "Bientôt disponible" })} />
          <Separator />
          <SettingsRow icon={HelpCircle} label="Aide & FAQ" onClick={() => navigate("/aide")} />
          <Separator />
          <SettingsRow icon={FileText} iconColor="text-muted-foreground" iconBg="bg-muted" label="CGU & Confidentialité" onClick={() => navigate("/cgu")} />
          <Separator />
          <SettingsRow icon={Info} iconColor="text-muted-foreground" iconBg="bg-muted" label="À propos" desc="v1.0.0" onClick={() => navigate("/a-propos")} />
        </SettingsSection>

        {/* ═══ 8. COMPTE ═══ */}
        <SettingsSection title="Compte">
          <button onClick={async () => { await supabase.auth.signOut(); navigate("/"); }} className="w-full p-3 flex items-center gap-3 hover:bg-destructive/10 transition-colors active:scale-[0.98]">
            <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-3.5 h-3.5 text-destructive" />
            </div>
            <span className="font-medium text-sm text-destructive">Déconnexion</span>
          </button>
          <Separator />
          <button onClick={() => toast({ title: "Contactez le support", description: "Pour supprimer votre compte, contactez notre équipe.", variant: "destructive" })} className="w-full p-3 flex items-center gap-3 hover:bg-destructive/10 transition-colors active:scale-[0.98]">
            <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </div>
            <span className="font-medium text-sm text-destructive">Supprimer mon compte</span>
          </button>
        </SettingsSection>
      </div>

      <PasswordChangeDialog open={showPwdDialog} onOpenChange={setShowPwdDialog} userEmail={userEmail} />
      <ForgotPasswordDialog open={showForgotPwd} onOpenChange={setShowForgotPwd} userEmail={userEmail} />
    </GPDashboardLayout>
  );
}

/* ─── Local helpers ─── */
function InfoPair({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 py-0.5 min-w-0">
      <Icon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
      <span className="text-muted-foreground flex-shrink-0">{label}:</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}
