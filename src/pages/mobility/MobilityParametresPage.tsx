/**
 * MobilityParametresPage — Complete settings for Mobility partners
 * Mirrors GPParametresPage structure with Mobility-specific fields
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings, User, Bell, Shield, LogOut, Phone, Edit3, Save, X,
  MessageCircle, Key, Wallet, Bus, MapPin, Palette, Languages,
  HelpCircle, FileText, Info, Trash2, BadgeCheck, Mail,
  Car, Route, Calendar, Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import {
  SettingsSection, SettingsRow, ToggleRow,
  PasswordChangeDialog, ForgotPasswordDialog,
  loadNotificationPrefs, saveNotificationPref,
  type NotificationPrefs, defaultNotificationPrefs,
} from "@/components/settings/SharedSettingsComponents";

export default function MobilityParametresPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [showPwdDialog, setShowPwdDialog] = useState(false);
  const [showForgotPwd, setShowForgotPwd] = useState(false);
  const [profileForm, setProfileForm] = useState({
    business_name: "", base_city: "",
  });
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(defaultNotificationPrefs);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserEmail(user.email || "");

      const [profileRes, prefsData] = await Promise.all([
        supabase.from("mobility_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        loadNotificationPrefs(user.id),
      ]);

      const p = profileRes.data;
      if (!p) { navigate("/mobility/inscription"); return; }
      setProfile(p);
      setNotifPrefs(prefsData);
      setProfileForm({
        business_name: p.business_name || "",
        base_city: p.base_city || "",
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("mobility_profiles").update({
        ...profileForm, updated_at: new Date().toISOString(),
      }).eq("id", profile.id);
      if (error) throw error;
      setProfile((prev: any) => ({ ...prev, ...profileForm }));
      setEditingProfile(false);
      toast({ title: "Profil mis à jour" });
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
  if (!profile) return null;

  const kycStatus = profile.status || "pending";
  const isVerified = kycStatus === "verified";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-transport-mobility text-white px-4 pt-safe">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/mobility/apercu")} className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-[15px] font-bold leading-tight">Paramètres</h1>
              <p className="text-[11px] opacity-80">{profile.business_name}</p>
            </div>
          </div>
          <Settings className="w-5 h-5 opacity-60" />
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* 1. PROFIL */}
        <SettingsSection title="Profil">
          {editingProfile ? (
            <div className="p-3 space-y-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Nom de l'entreprise</Label>
                <Input className="h-8 text-sm" value={profileForm.business_name} onChange={e => setProfileForm(p => ({ ...p, business_name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Ville de base</Label>
                <Input className="h-8 text-sm" value={profileForm.base_city} onChange={e => setProfileForm(p => ({ ...p, base_city: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveProfile} disabled={saving} size="sm" className="flex-1 gap-1 h-8 text-xs bg-transport-mobility hover:bg-transport-mobility/90">
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
                  <div className="w-8 h-8 rounded-full bg-transport-mobility/10 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-transport-mobility" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-tight">{profile.business_name}</p>
                    <p className="text-[10px] text-muted-foreground">{userEmail}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingProfile(true)}>
                  <Edit3 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Separator />
              <div className="px-3 py-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                <InfoPair icon={MapPin} label="Ville" value={profile.base_city || "—"} />
                <InfoPair icon={Bus} label="Type" value={profile.service_type === "private_driver" ? "Chauffeur privé" : "Navette"} />
              </div>
            </>
          )}
        </SettingsSection>

        {/* 2. VÉRIFICATION */}
        <SettingsSection title="Vérification">
          <div className="p-3 flex items-center gap-3">
            <BadgeCheck className={`w-4 h-4 flex-shrink-0 ${isVerified ? "text-emerald-500" : "text-muted-foreground"}`} />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Statut du compte</span>
                <Badge variant={isVerified ? "default" : "secondary"} className="text-[9px] h-4">
                  {isVerified ? "Vérifié" : "En attente"}
                </Badge>
              </div>
              <Progress value={isVerified ? 100 : 50} className="h-1.5" />
            </div>
          </div>
        </SettingsSection>

        {/* 3. OPÉRATIONS */}
        <SettingsSection title="Opérations">
          <SettingsRow icon={Route} iconColor="text-transport-mobility" iconBg="bg-transport-mobility/10" label="Mes trajets" desc="Gérer mes lignes" onClick={() => navigate("/mobility/apercu")} />
          <Separator />
          <SettingsRow icon={Car} iconColor="text-transport-mobility" iconBg="bg-transport-mobility/10" label="Mes véhicules" desc="Flotte et documents" onClick={() => navigate("/mobility/vehicules")} />
          <Separator />
          <SettingsRow icon={Calendar} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Horaires" desc="Planning des départs" onClick={() => navigate("/mobility/apercu")} />
          <Separator />
          <SettingsRow icon={Users} iconColor="text-amber-500" iconBg="bg-amber-500/10" label="Passagers" desc="Historique des réservations" onClick={() => navigate("/mobility/apercu")} />
        </SettingsSection>

        {/* 4. SÉCURITÉ & FINANCES */}
        <SettingsSection title="Sécurité & Finances">
          <SettingsRow icon={Wallet} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" label="Portefeuille" desc="Solde et retraits" onClick={() => navigate("/mobility/wallet")} />
          <Separator />
          <SettingsRow icon={Key} iconColor="text-amber-500" iconBg="bg-amber-500/10" label="Mot de passe" desc="Modifier ou réinitialiser" onClick={() => setShowPwdDialog(true)} />
          <Separator />
          <SettingsRow icon={Shield} label="Sécurité" desc="Connexions et sessions" onClick={() => toast({ title: "Bientôt disponible" })} />
        </SettingsSection>

        {/* 5. NOTIFICATIONS */}
        <SettingsSection title="Notifications">
          <ToggleRow icon={Bell} label="Push" desc="Temps réel" checked={notifPrefs.push_notifications} onToggle={() => handleToggle("push_notifications")} />
          <Separator />
          <ToggleRow icon={Bell} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Messages" desc="Passagers" checked={notifPrefs.new_message_alerts} onToggle={() => handleToggle("new_message_alerts")} />
          <Separator />
          <ToggleRow icon={Bell} iconColor="text-transport-mobility" iconBg="bg-transport-mobility/10" label="Réservations" desc="Nouvelles réservations" checked={notifPrefs.new_offer_alerts} onToggle={() => handleToggle("new_offer_alerts")} />
          <Separator />
          <ToggleRow icon={Mail} iconColor="text-orange-500" iconBg="bg-orange-500/10" label="Email" desc="Récapitulatifs" checked={notifPrefs.email_notifications} onToggle={() => handleToggle("email_notifications")} />
        </SettingsSection>

        {/* 6. AUTRES */}
        <SettingsSection title="Autres">
          <div className="px-3 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Palette className="w-3.5 h-3.5 text-transport-mobility" />
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

        {/* 7. COMPTE */}
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
    </div>
  );
}

function InfoPair({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 py-0.5 min-w-0">
      <Icon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
      <span className="text-muted-foreground flex-shrink-0">{label}:</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}
