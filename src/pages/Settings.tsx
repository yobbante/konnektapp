import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { SwitchToTransporteurButton } from "@/components/profile/SwitchToTransporteurButton";
import { Button } from "@/components/ui/button";
import {
  SettingsSection, SettingsRow, ToggleRow,
  PasswordChangeDialog, ForgotPasswordDialog,
  loadNotificationPrefs, saveNotificationPref,
  type NotificationPrefs, defaultNotificationPrefs,
} from "@/components/settings/SharedSettingsComponents";
import {
  ArrowLeft, Bell, Mail, MessageSquare,
  Package, TrendingUp, Megaphone, Palette, User, Shield, LogOut,
  Smartphone, CheckCircle, XCircle, Key, Lock, FileText,
  CreditCard, Heart, Globe, HelpCircle,
} from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultNotificationPrefs);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [showPwdDialog, setShowPwdDialog] = useState(false);
  const [showForgotPwd, setShowForgotPwd] = useState(false);
  const { isSupported, permission, requestPermission } = usePushNotifications();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserId(user.id);
      setUserEmail(user.email || "");

      const [notifPrefs, profileRes] = await Promise.all([
        loadNotificationPrefs(user.id),
        supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
      ]);
      setPrefs(notifPrefs);
      if (profileRes.data) setUserName(profileRes.data.full_name || "");
      setLoading(false);
    })();
  }, []);

  const handleToggle = async (key: keyof NotificationPrefs) => {
    const newVal = !prefs[key];
    setPrefs(p => ({ ...p, [key]: newVal }));
    if (userId) await saveNotificationPref(userId, key, newVal);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><MiniLoader size="lg" /></div>;

  return (
    <div className="min-h-screen bg-muted/30 pb-safe">
      <MobileHeader />
      <main className="px-4 pb-24 space-y-5" style={{ paddingTop: "calc(70px + env(safe-area-inset-top, 0px))" }}>
        <div className="max-w-lg mx-auto space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Paramètres</h1>
              <p className="text-xs text-muted-foreground">{userName || userEmail}</p>
            </div>
          </div>

          {/* APPARENCE */}
          <SettingsSection title="Apparence">
            <div className="p-4">
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
          </SettingsSection>

          {/* COMPTE */}
          <SettingsSection title="Mon compte">
            <SettingsRow icon={User} label="Mon profil" desc="Informations, photo, KYC" onClick={() => navigate("/profil/complet")} />
            <Separator />
            <SettingsRow icon={CreditCard} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" label="Portefeuille" desc="Solde, transactions" onClick={() => navigate("/client/wallet")} />
            <Separator />
            <SettingsRow icon={Heart} iconColor="text-pink-500" iconBg="bg-pink-500/10" label="Favoris" desc="Transporteurs sauvegardés" onClick={() => navigate("/favoris")} />
          </SettingsSection>

          {/* NOTIFICATIONS */}
          <SettingsSection title="Notifications">
            {/* Browser push status */}
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
            <ToggleRow icon={Mail} label="Email" desc="Alertes par email" checked={prefs.email_notifications} onToggle={() => handleToggle("email_notifications")} />
            <Separator />
            <ToggleRow icon={Bell} label="Push" desc="Temps réel" checked={prefs.push_notifications} onToggle={() => handleToggle("push_notifications")} />
          </SettingsSection>

          <SettingsSection title="Alertes détaillées">
            <ToggleRow icon={MessageSquare} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Messages" desc="Nouveaux messages" checked={prefs.new_message_alerts} onToggle={() => handleToggle("new_message_alerts")} />
            <Separator />
            <ToggleRow icon={TrendingUp} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" label="Offres" desc="Nouvelles offres" checked={prefs.new_offer_alerts} onToggle={() => handleToggle("new_offer_alerts")} />
            <Separator />
            <ToggleRow icon={Package} iconColor="text-orange-500" iconBg="bg-orange-500/10" label="Commandes" desc="Statut des envois" checked={prefs.order_status_alerts} onToggle={() => handleToggle("order_status_alerts")} />
            <Separator />
            <ToggleRow icon={Megaphone} iconColor="text-purple-500" iconBg="bg-purple-500/10" label="Marketing" desc="Offres et actualités" checked={prefs.marketing_emails} onToggle={() => handleToggle("marketing_emails")} />
          </SettingsSection>

          {/* SÉCURITÉ */}
          <SettingsSection title="Sécurité">
            <SettingsRow icon={Key} iconColor="text-amber-500" iconBg="bg-amber-500/10" label="Changer le mot de passe" desc="Mettre à jour votre accès" onClick={() => setShowPwdDialog(true)} />
            <Separator />
            <SettingsRow icon={Lock} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Mot de passe oublié" desc="Réinitialiser par email" onClick={() => setShowForgotPwd(true)} />
            <Separator />
            <SettingsRow icon={Shield} label="Vérification d'identité" desc="Documents KYC" onClick={() => navigate("/profil/complet")} />
          </SettingsSection>

          {/* AIDE */}
          <SettingsSection title="Aide & informations">
            <SettingsRow icon={HelpCircle} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Aide & FAQ" desc="Questions fréquentes" onClick={() => navigate("/aide")} />
            <Separator />
            <SettingsRow icon={HelpCircle} iconColor="text-indigo-500" iconBg="bg-indigo-500/10" label="Tutoriels" desc="Guides d'utilisation" onClick={() => navigate("/tutoriels")} />
            <Separator />
            <SettingsRow icon={FileText} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" label="CGU & Confidentialité" onClick={() => navigate("/cgu")} />
            <Separator />
            <SettingsRow icon={Globe} iconColor="text-muted-foreground" iconBg="bg-muted" label="À propos" desc="v1.0.0" onClick={() => navigate("/a-propos")} />
            <Separator />
            <SettingsRow icon={Globe} iconColor="text-muted-foreground" iconBg="bg-muted" label="Langue" desc="Français" right={<Badge variant="outline" className="text-[10px]">FR</Badge>} />
          </SettingsSection>

          <SwitchToTransporteurButton />

          {/* DÉCONNEXION */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <button onClick={async () => { await supabase.auth.signOut(); navigate("/"); }} className="w-full flex items-center gap-3 p-3.5 hover:bg-destructive/5 transition-colors text-destructive">
              <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
                <LogOut className="w-4 h-4" />
              </div>
              <p className="font-medium text-sm">Se déconnecter</p>
            </button>
          </div>

          <p className="text-center text-[10px] text-muted-foreground mb-4">Konnekt v1.0.0</p>
        </div>
      </main>

      <PasswordChangeDialog open={showPwdDialog} onOpenChange={setShowPwdDialog} userEmail={userEmail} />
      <ForgotPasswordDialog open={showForgotPwd} onOpenChange={setShowForgotPwd} userEmail={userEmail} />
      <MobileNav />
    </div>
  );
}
