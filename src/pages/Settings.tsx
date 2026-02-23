import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { 
  ArrowLeft, Bell, Mail, MessageSquare, 
  Package, TrendingUp, Megaphone, Palette, User, Shield, LogOut,
  ChevronRight, Smartphone, CheckCircle, XCircle, HelpCircle,
  Key, Lock, FileText, Eye, EyeOff, CreditCard, Heart, Globe
} from "lucide-react";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { Badge } from "@/components/ui/badge";
import { SwitchToTransporteurButton } from "@/components/profile/SwitchToTransporteurButton";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  new_message_alerts: boolean;
  new_offer_alerts: boolean;
  order_status_alerts: boolean;
  marketing_emails: boolean;
}

const defaultPreferences: NotificationPreferences = {
  email_notifications: true,
  push_notifications: true,
  new_message_alerts: true,
  new_offer_alerts: true,
  order_status_alerts: true,
  marketing_emails: false,
};

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const { isSupported, permission, requestPermission } = usePushNotifications();
  
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    checkAuthAndLoadPreferences();
  }, []);

  const checkAuthAndLoadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth", { state: { returnTo: "/settings" } }); return; }

      setUserId(user.id);
      setUserEmail(user.email || "");

      const [prefsRes, profileRes] = await Promise.all([
        supabase.from("notification_preferences").select("*").eq("user_id", user.id).single(),
        supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
      ]);

      if (prefsRes.data) {
        setPreferences({
          email_notifications: prefsRes.data.email_notifications,
          push_notifications: prefsRes.data.push_notifications,
          new_message_alerts: prefsRes.data.new_message_alerts,
          new_offer_alerts: prefsRes.data.new_offer_alerts,
          order_status_alerts: prefsRes.data.order_status_alerts,
          marketing_emails: prefsRes.data.marketing_emails,
        });
      }
      if (profileRes.data) setUserName(profileRes.data.full_name || "");
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof NotificationPreferences) => {
    const newValue = !preferences[key];
    setPreferences(prev => ({ ...prev, [key]: newValue }));
    if (userId) {
      try {
        await supabase.from("notification_preferences").upsert({
          user_id: userId, [key]: newValue, updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      } catch (error) { console.error("Error saving preference:", error); }
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caractères", variant: "destructive" });
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
      if (error) throw error;
      toast({ title: "Mot de passe modifié", description: "Votre nouveau mot de passe est actif" });
      setShowPasswordDialog(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message || "Impossible de modifier le mot de passe", variant: "destructive" });
    } finally { setPasswordLoading(false); }
  };

  const handleForgotPassword = async () => {
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/settings`,
      });
      if (error) throw error;
      setResetEmailSent(true);
      toast({ title: "Email envoyé", description: "Vérifiez votre boîte mail" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally { setResetLoading(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><MiniLoader size="lg" /></div>;
  }

  // Section renderer for consistent styling
  const SectionHeader = ({ title }: { title: string }) => (
    <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{title}</h2>
  );

  const SettingsRow = ({ icon: Icon, iconColor = "text-primary", iconBg = "bg-primary/10", label, desc, onClick, right }: {
    icon: any; iconColor?: string; iconBg?: string; label: string; desc?: string; onClick?: () => void; right?: React.ReactNode;
  }) => (
    <button onClick={onClick} className="w-full flex items-center justify-between p-3.5 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div className="text-left">
          <p className="font-medium text-sm">{label}</p>
          {desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}
        </div>
      </div>
      {right || <ChevronRight className="w-4 h-4 text-muted-foreground" />}
    </button>
  );

  const ToggleRow = ({ icon: Icon, iconColor = "text-primary", iconBg = "bg-primary/10", label, desc, checked, onToggle }: {
    icon: any; iconColor?: string; iconBg?: string; label: string; desc?: string; checked: boolean; onToggle: () => void;
  }) => (
    <div className="flex items-center justify-between p-3.5">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div>
          <Label className="font-medium text-sm cursor-pointer">{label}</Label>
          {desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onToggle} />
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 pb-safe">
      <MobileHeader />
      
      <main className="px-4 pb-24" style={{ paddingTop: 'calc(70px + env(safe-area-inset-top, 0px))' }}>
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Paramètres</h1>
              <p className="text-xs text-muted-foreground">{userName || userEmail}</p>
            </div>
          </div>

          {/* ─── COMPTE ─── */}
          <SectionHeader title="Mon compte" />
          <div className="bg-card rounded-2xl border border-border overflow-hidden mb-5">
            <SettingsRow icon={User} label="Mon profil" desc="Informations, photo, KYC" onClick={() => navigate("/profil/complet")} />
            <Separator />
            <SettingsRow icon={CreditCard} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" label="Portefeuille" desc="Solde, transactions" onClick={() => navigate("/client/wallet")} />
            <Separator />
            <SettingsRow icon={Heart} iconColor="text-pink-500" iconBg="bg-pink-500/10" label="Favoris" desc="Transporteurs sauvegardés" onClick={() => navigate("/favoris")} />
          </div>

          {/* ─── APPARENCE ─── */}
          <SectionHeader title="Apparence" />
          <div className="bg-card rounded-2xl border border-border p-4 mb-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Palette className="w-4 h-4 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Thème</p>
                <p className="text-[11px] text-muted-foreground">Clair, sombre ou système</p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          {/* ─── NOTIFICATIONS ─── */}
          <SectionHeader title="Notifications" />
          <div className="bg-card rounded-2xl border border-border overflow-hidden mb-3">
            {/* Browser Push Status */}
            <div className="flex items-center justify-between p-3.5 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Notifications navigateur</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {!isSupported ? (
                      <Badge variant="outline" className="text-[10px] h-5">Non supporté</Badge>
                    ) : permission === "granted" ? (
                      <Badge variant="success" className="text-[10px] h-5 gap-1"><CheckCircle className="w-3 h-3" />Activées</Badge>
                    ) : permission === "denied" ? (
                      <Badge variant="destructive" className="text-[10px] h-5 gap-1"><XCircle className="w-3 h-3" />Bloquées</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] h-5">Non activées</Badge>
                    )}
                  </div>
                </div>
              </div>
              {isSupported && permission !== "granted" && permission !== "denied" && (
                <Button variant="outline" size="sm" onClick={requestPermission}>Activer</Button>
              )}
            </div>
            <Separator />
            <ToggleRow icon={Mail} label="Email" desc="Alertes par email" checked={preferences.email_notifications} onToggle={() => handleToggle("email_notifications")} />
            <Separator />
            <ToggleRow icon={Bell} label="Push" desc="Temps réel" checked={preferences.push_notifications} onToggle={() => handleToggle("push_notifications")} />
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden mb-5">
            <ToggleRow icon={MessageSquare} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Messages" desc="Nouveaux messages" checked={preferences.new_message_alerts} onToggle={() => handleToggle("new_message_alerts")} />
            <Separator />
            <ToggleRow icon={TrendingUp} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" label="Offres" desc="Nouvelles offres" checked={preferences.new_offer_alerts} onToggle={() => handleToggle("new_offer_alerts")} />
            <Separator />
            <ToggleRow icon={Package} iconColor="text-orange-500" iconBg="bg-orange-500/10" label="Commandes" desc="Statut des envois" checked={preferences.order_status_alerts} onToggle={() => handleToggle("order_status_alerts")} />
            <Separator />
            <ToggleRow icon={Megaphone} iconColor="text-purple-500" iconBg="bg-purple-500/10" label="Marketing" desc="Offres et actualités" checked={preferences.marketing_emails} onToggle={() => handleToggle("marketing_emails")} />
          </div>

          {/* ─── SÉCURITÉ ─── */}
          <SectionHeader title="Sécurité" />
          <div className="bg-card rounded-2xl border border-border overflow-hidden mb-5">
            <SettingsRow icon={Key} iconColor="text-amber-500" iconBg="bg-amber-500/10" label="Changer le mot de passe" desc="Mettre à jour votre accès" onClick={() => setShowPasswordDialog(true)} />
            <Separator />
            <SettingsRow icon={Lock} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Mot de passe oublié" desc="Réinitialiser par email" onClick={() => setShowForgotPassword(true)} />
            <Separator />
            <SettingsRow icon={Shield} iconColor="text-primary" iconBg="bg-primary/10" label="Vérification d'identité" desc="Documents KYC" onClick={() => navigate("/profil/complet")} />
          </div>

          {/* ─── AIDE & LÉGAL ─── */}
          <SectionHeader title="Aide & informations" />
          <div className="bg-card rounded-2xl border border-border overflow-hidden mb-5">
            <SettingsRow icon={HelpCircle} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Tutoriels" desc="Guides d'utilisation" onClick={() => navigate("/tutoriels")} />
            <Separator />
            <SettingsRow icon={FileText} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" label="Documents légaux" desc="CGU, CGV, Confidentialité" onClick={() => navigate("/documents-legaux")} />
            <Separator />
            <SettingsRow icon={Globe} iconColor="text-muted-foreground" iconBg="bg-muted" label="Langue" desc="Français" right={<Badge variant="outline" className="text-[10px]">FR</Badge>} />
          </div>

          {/* ─── SWITCH ROLE ─── */}
          <div className="mb-3">
            <SwitchToTransporteurButton />
          </div>

          {/* ─── DÉCONNEXION ─── */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden mb-6">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3.5 hover:bg-destructive/5 transition-colors text-destructive">
              <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
                <LogOut className="w-4 h-4" />
              </div>
              <p className="font-medium text-sm">Se déconnecter</p>
            </button>
          </div>

          <p className="text-center text-[10px] text-muted-foreground mb-4">Konnekt v1.0.0</p>
        </div>
      </main>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Key className="w-5 h-5" />Changer le mot de passe</DialogTitle>
            <DialogDescription>Entrez votre nouveau mot de passe</DialogDescription>
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
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowNewPassword(!showNewPassword)}>
                  {showNewPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirmer le mot de passe</Label>
              <Input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} placeholder="••••••••" />
            </div>
            <Button className="w-full" onClick={handleChangePassword} disabled={passwordLoading || !passwordForm.newPassword || !passwordForm.confirmPassword}>
              {passwordLoading ? <MiniLoader size="sm" /> : "Modifier le mot de passe"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lock className="w-5 h-5" />Réinitialiser le mot de passe</DialogTitle>
            <DialogDescription>
              {resetEmailSent ? "Un email de réinitialisation a été envoyé" : "Nous vous enverrons un lien par email"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {resetEmailSent ? (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Vérifiez votre boîte mail : <strong>{userEmail}</strong></p>
                <Button variant="outline" className="mt-4" onClick={() => { setShowForgotPassword(false); setResetEmailSent(false); }}>Fermer</Button>
              </div>
            ) : (
              <>
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="text-muted-foreground">Email : <strong className="text-foreground">{userEmail}</strong></p>
                </div>
                <Button className="w-full" onClick={handleForgotPassword} disabled={resetLoading}>
                  {resetLoading ? <MiniLoader size="sm" /> : "Envoyer le lien"}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <MobileNav />
    </div>
  );
}
