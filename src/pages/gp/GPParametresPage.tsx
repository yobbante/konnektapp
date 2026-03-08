/**
 * GPParametresPage — Paramètres GP complets et organisés logiquement
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings, User, DollarSign, Bell, ScanLine, Shield,
  Globe, LogOut, Palette, MapPin, Phone,
  Edit3, Save, X, MessageCircle, FileCheck,
  ShieldX, Upload, BadgeCheck, Wallet, Key, Lock,
  Crown, Star, Zap, BarChart3, Mail, HelpCircle,
  FileText, Info, Languages, Trash2,
  Award, TrendingUp, AlertTriangle, CheckCircle,
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
          .select("id, business_name, gp_type, status, subscription, base_price_per_kg, default_currency, deposit_address, reception_address, phone, whatsapp_phone, description, kyc_level, kyc_status, id_document_url, selfie_url, business_registration_url, explicit_restrictions, base_origin_city, base_origin_country, base_destination_city, base_destination_country, rating, total_deliveries, total_reviews, verified_at, withdrawal_limit")
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
  const isPremium = gpProfile.subscription === "premium";
  const withdrawalLimit = gpProfile.withdrawal_limit ?? 300000;

  // KYC progression
  const kycSteps = [
    { label: "Inscription", done: true, icon: CheckCircle },
    { label: "Pièce d'identité", done: hasId, icon: FileText },
    { label: "Selfie vérification", done: hasSelfie, icon: User },
    { label: "Document entreprise", done: hasBusinessReg, icon: FileText },
  ];
  const kycCompletedSteps = kycSteps.filter(s => s.done).length;
  const kycProgress = Math.round((kycCompletedSteps / kycSteps.length) * 100);

  const kycBadges = [
    { level: 0, label: "Starter", desc: "Inscription complétée", limit: "300 000 FCFA", unlocked: kycLevel >= 0 },
    { level: 1, label: "Vérifié", desc: "ID + Selfie validés", limit: "1 000 000 FCFA", unlocked: kycLevel >= 1 },
    { level: 2, label: "Confirmé", desc: "Documents entreprise", limit: "Illimité", unlocked: kycLevel >= 2 },
  ];

  return (
    <GPDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeOrdersCount={activeCount} activeTab="parametres">
      <div className="px-4 py-3 space-y-4 pb-24">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">Paramètres</h1>
        </div>

        {/* ═══ 1. IDENTITÉ & PROFIL ═══ */}
        <SettingsSection title="Identité & Profil">
          {editingProfile ? (
            <div className="p-3 space-y-2.5">
              <div>
                <Label className="text-[10px] text-muted-foreground">Nom commercial</Label>
                <Input className="h-9" value={profileForm.business_name} onChange={e => setProfileForm(p => ({ ...p, business_name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Description</Label>
                <Textarea value={profileForm.description} onChange={e => setProfileForm(p => ({ ...p, description: e.target.value }))} placeholder="Décrivez votre activité..." rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Téléphone</Label>
                  <Input className="h-9" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">WhatsApp</Label>
                  <Input className="h-9" value={profileForm.whatsapp_phone} onChange={e => setProfileForm(p => ({ ...p, whatsapp_phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">📍 Adresse pays {originLabel}</Label>
                <Input className="h-9" value={profileForm.deposit_address} onChange={e => setProfileForm(p => ({ ...p, deposit_address: e.target.value }))} placeholder={`Adresse à ${gpProfile.base_origin_city || originLabel}`} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">📍 Adresse pays {destLabel}</Label>
                <Input className="h-9" value={profileForm.reception_address} onChange={e => setProfileForm(p => ({ ...p, reception_address: e.target.value }))} placeholder={`Adresse à ${gpProfile.base_destination_city || destLabel}`} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveProfile} disabled={saving} size="sm" className="flex-1 gap-1 h-9">
                  <Save className="w-3.5 h-3.5" /> {saving ? "..." : "Enregistrer"}
                </Button>
                <Button variant="outline" size="sm" className="h-9" onClick={() => setEditingProfile(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{gpProfile.business_name}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{gpProfile.description || "Aucune description"}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingProfile(true)}>
                  <Edit3 className="w-4 h-4" />
                </Button>
              </div>
              <Separator />
              <CompactInfoRow icon={Mail} label="Email" value={userEmail || "—"} />
              <Separator />
              <CompactInfoRow icon={Phone} label="Tél." value={gpProfile.phone || "—"} />
              <Separator />
              <CompactInfoRow icon={MessageCircle} label="WhatsApp" value={gpProfile.whatsapp_phone || "—"} />
              <Separator />
              <CompactInfoRow icon={MapPin} label={originLabel} value={gpProfile.deposit_address || "—"} />
              <Separator />
              <CompactInfoRow icon={MapPin} label={destLabel} value={gpProfile.reception_address || "—"} />
            </>
          )}
        </SettingsSection>

        {/* ═══ 2. KYC & VÉRIFICATION (enrichi) ═══ */}
        <SettingsSection title="Vérification & Badges">
          <div className="p-3 space-y-3">
            {/* Status header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BadgeCheck className={`w-5 h-5 ${kycStatus === "verified" ? "text-emerald-500" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-semibold">Niveau KYC {kycLevel}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {kycStatus === "verified" ? "Vérifié" : kycStatus === "pending" ? "En cours de vérification" : "À compléter"}
                  </p>
                </div>
              </div>
              <Badge variant={kycStatus === "verified" ? "default" : "secondary"} className="text-[10px]">
                {kycBadges[kycLevel]?.label || "Starter"}
              </Badge>
            </div>

            {/* Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Progression</span>
                <span className="font-medium">{kycProgress}%</span>
              </div>
              <Progress value={kycProgress} className="h-2" />
            </div>

            <Separator />

            {/* Documents checklist */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Documents requis</p>
              {kycSteps.map((step, i) => (
                <DocRow
                  key={i}
                  label={step.label}
                  done={step.done}
                  onClick={() => i === 0 ? undefined : navigate("/gp/profil-public")}
                  disabled={i === 0}
                />
              ))}
            </div>

            {kycProgress < 100 && (
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-8" onClick={() => navigate("/gp/profil-public")}>
                <Upload className="w-3 h-3" /> Compléter mes documents
              </Button>
            )}

            <Separator />

            {/* Badge progression */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Badges & Plafonds</p>
              {kycBadges.map((badge) => (
                <div key={badge.level} className={`flex items-center gap-3 p-2 rounded-lg ${badge.unlocked ? "bg-emerald-500/5" : "bg-muted/50"}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${badge.unlocked ? "bg-emerald-500/10" : "bg-muted"}`}>
                    <Award className={`w-3.5 h-3.5 ${badge.unlocked ? "text-emerald-500" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs font-medium ${badge.unlocked ? "text-foreground" : "text-muted-foreground"}`}>
                      L{badge.level} — {badge.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{badge.desc}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[10px] font-medium ${badge.unlocked ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {badge.limit}
                    </p>
                    {badge.unlocked && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 ml-auto" />}
                  </div>
                </div>
              ))}
            </div>

            {/* Withdrawal info */}
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-medium">Plafond retrait actuel</p>
                <p className="text-[10px] text-muted-foreground">
                  {withdrawalLimit.toLocaleString("fr-FR")} FCFA/mois — Augmentez votre niveau KYC pour relever ce plafond.
                </p>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* ═══ 3. OPÉRATIONS ═══ */}
        <SettingsSection title="Opérations">
          <SettingsRow icon={User} label="Profil public" desc="Aperçu client" onClick={() => navigate("/gp/profil-public")} />
          <Separator />
          <SettingsRow icon={DollarSign} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" label="Grille tarifaire" desc={`${gpProfile.base_price_per_kg || 0} ${gpProfile.default_currency || "XOF"}/kg`} onClick={() => navigate("/gp/tarification")} />
          <Separator />
          <SettingsRow icon={ShieldX} iconColor="text-orange-500" iconBg="bg-orange-500/10" label="Restrictions" desc={`${(gpProfile.explicit_restrictions || []).length} actives`} onClick={() => navigate("/gp/restrictions")} />
          <Separator />
          <SettingsRow icon={Globe} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Devise" desc={gpProfile.default_currency || "XOF"} onClick={() => navigate("/gp/tarification")} />
          <Separator />
          <SettingsRow icon={ScanLine} iconColor="text-purple-500" iconBg="bg-purple-500/10" label="Scanner QR" desc="Caméra" onClick={() => navigate("/gp/scan")} />
          <Separator />
          <SettingsRow icon={BarChart3} iconColor="text-amber-500" iconBg="bg-amber-500/10" label="Performances" desc={isPremium ? "Statistiques avancées" : "🔒 Premium"} onClick={() => navigate("/gp/performances")} />
        </SettingsSection>

        {/* ═══ 4. SÉCURITÉ ═══ */}
        <SettingsSection title="Sécurité & Confiance">
          <SettingsRow icon={Shield} label="KTP & GeoTrack" desc="Score de confiance" onClick={() => navigate("/gp/ktp-geotrack")} />
          <Separator />
          <SettingsRow icon={Wallet} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" label="Portefeuille" desc="Solde et retraits" onClick={() => navigate("/gp/wallet")} />
          <Separator />
          <SettingsRow icon={Key} iconColor="text-amber-500" iconBg="bg-amber-500/10" label="Mot de passe" desc="Modifier l'accès" onClick={() => setShowPwdDialog(true)} />
          <Separator />
          <SettingsRow icon={Lock} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Mot de passe oublié" desc="Réinitialiser" onClick={() => setShowForgotPwd(true)} />
        </SettingsSection>

        {/* ═══ 5. NOTIFICATIONS ═══ */}
        <SettingsSection title="Notifications">
          <ToggleRow icon={Bell} label="Push" desc="Notifications en temps réel" checked={notifPrefs.push_notifications} onToggle={() => handleToggle("push_notifications")} />
          <Separator />
          <ToggleRow icon={Bell} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Messages clients" desc="Nouveaux messages" checked={notifPrefs.new_message_alerts} onToggle={() => handleToggle("new_message_alerts")} />
          <Separator />
          <ToggleRow icon={Bell} iconColor="text-orange-500" iconBg="bg-orange-500/10" label="Statuts commandes" desc="Mises à jour" checked={notifPrefs.order_status_alerts} onToggle={() => handleToggle("order_status_alerts")} />
        </SettingsSection>

        {/* ═══ 6. APPARENCE & LANGUE ═══ */}
        <SettingsSection title="Apparence & Langue">
          <div className="p-3">
            <div className="flex items-center gap-3 mb-2">
              <Palette className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Thème</span>
            </div>
            <ThemeToggle />
          </div>
          <Separator />
          <SettingsRow icon={Languages} iconColor="text-indigo-500" iconBg="bg-indigo-500/10" label="Langue" desc="Français" onClick={() => toast({ title: "Bientôt disponible", description: "Le choix de langue sera disponible prochainement." })} />
        </SettingsSection>

        {/* ═══ 7. ABONNEMENT & FACTURATION ═══ */}
        <SettingsSection title="Abonnement & Facturation">
          <SettingsRow 
            icon={Crown} 
            iconColor="text-amber-500" 
            iconBg="bg-amber-500/10" 
            label="Mon abonnement" 
            desc={isPremium ? `Plan ${(gpProfile as any).subscription === 'pro' ? 'Pro' : 'Premium'} actif` : "Plan gratuit"} 
            onClick={() => navigate("/gp/premium")} 
          />
          <Separator />
          <SettingsRow 
            icon={Star} 
            iconColor="text-primary" 
            iconBg="bg-primary/10" 
            label="Changer de plan" 
            desc="Comparer les offres" 
            onClick={() => navigate("/gp/premium")} 
          />
          <Separator />
          <SettingsRow 
            icon={FileText} 
            iconColor="text-blue-500" 
            iconBg="bg-blue-500/10" 
            label="Historique de facturation" 
            desc="Factures et reçus" 
            onClick={() => toast({ title: "Bientôt disponible", description: "L'historique de facturation sera bientôt accessible." })} 
          />
          <Separator />
          <SettingsRow 
            icon={Zap} 
            iconColor="text-emerald-500" 
            iconBg="bg-emerald-500/10" 
            label="Auto-acceptation" 
            desc={isPremium && (gpProfile as any).auto_accept_enabled ? "Activée ✅" : isPremium ? "Désactivée" : "🔒 Premium"} 
            onClick={() => isPremium ? navigate("/gp/auto-accept") : navigate("/gp/premium")} 
          />
        </SettingsSection>

        {/* Premium CTA — progressive */}
        <PremiumCTABanner variant="banner" context="dashboard" subscription={(gpProfile as any)?.subscription} />

        {/* ═══ 8. AIDE & LÉGAL ═══ */}
        <SettingsSection title="Aide & Légal">
          <SettingsRow icon={HelpCircle} label="Centre d'aide" desc="FAQ et support" onClick={() => toast({ title: "Bientôt disponible" })} />
          <Separator />
          <SettingsRow icon={FileText} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Conditions d'utilisation" desc="CGU & CGV" onClick={() => toast({ title: "Bientôt disponible" })} />
          <Separator />
          <SettingsRow icon={Shield} iconColor="text-green-500" iconBg="bg-green-500/10" label="Politique de confidentialité" desc="Données personnelles" onClick={() => toast({ title: "Bientôt disponible" })} />
          <Separator />
          <SettingsRow icon={Info} iconColor="text-muted-foreground" iconBg="bg-muted" label="À propos de Konnekt" desc="v1.0.0 — Prototype" onClick={() => toast({ title: "Konnekt v1.0.0", description: "Plateforme de transport collaboratif." })} />
        </SettingsSection>

        {/* ═══ 9. COMPTE (Déconnexion / Suppression) ═══ */}
        <SettingsSection title="Compte">
          <button onClick={async () => { await supabase.auth.signOut(); navigate("/"); }} className="w-full rounded-xl p-3 flex items-center gap-3 hover:bg-destructive/10 transition-colors active:scale-[0.98]">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-4 h-4 text-destructive" />
            </div>
            <div className="text-left">
              <span className="font-medium text-sm text-destructive">Déconnexion</span>
              <p className="text-[10px] text-muted-foreground">Se déconnecter de votre compte</p>
            </div>
          </button>
          <Separator />
          <button onClick={() => toast({ title: "Contactez le support", description: "Pour supprimer votre compte, contactez notre équipe support.", variant: "destructive" })} className="w-full rounded-xl p-3 flex items-center gap-3 hover:bg-destructive/10 transition-colors active:scale-[0.98]">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-destructive" />
            </div>
            <div className="text-left">
              <span className="font-medium text-sm text-destructive">Supprimer mon compte</span>
              <p className="text-[10px] text-muted-foreground">Action irréversible</p>
            </div>
          </button>
        </SettingsSection>
      </div>

      <PasswordChangeDialog open={showPwdDialog} onOpenChange={setShowPwdDialog} userEmail={userEmail} />
      <ForgotPasswordDialog open={showForgotPwd} onOpenChange={setShowForgotPwd} userEmail={userEmail} />
    </GPDashboardLayout>
  );
}

/* ─── Local helpers ─── */
function CompactInfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <span className="text-[10px] text-muted-foreground w-14 flex-shrink-0">{label}</span>
      <span className="text-xs font-medium truncate">{value}</span>
    </div>
  );
}

function DocRow({ label, done, onClick, disabled }: { label: string; done: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={disabled ? undefined : onClick} className={`w-full flex items-center justify-between py-1.5 ${disabled ? "" : "hover:opacity-80"} transition-opacity`}>
      <div className="flex items-center gap-2">
        {done ? (
          <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <FileCheck className="w-3 h-3 text-emerald-500" />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
            <Upload className="w-3 h-3 text-muted-foreground" />
          </div>
        )}
        <span className={`text-xs ${done ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
      </div>
      {done && <Badge variant="outline" className="text-[9px] h-4 bg-emerald-500/5 text-emerald-600 border-emerald-500/20">✓</Badge>}
    </button>
  );
}
