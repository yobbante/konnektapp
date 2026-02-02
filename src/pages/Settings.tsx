import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { 
  ArrowLeft, Settings as SettingsIcon, Bell, Mail, MessageSquare, 
  Package, TrendingUp, Megaphone, Palette, User, Shield, LogOut,
  ChevronRight, Smartphone, CheckCircle, XCircle, HelpCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { Badge } from "@/components/ui/badge";

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
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const { isSupported, permission, requestPermission } = usePushNotifications();

  useEffect(() => {
    checkAuthAndLoadPreferences();
  }, []);

  const checkAuthAndLoadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth", { state: { returnTo: "/settings" } });
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || "");

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching preferences:", error);
      }

      if (data) {
        setPreferences({
          email_notifications: data.email_notifications,
          push_notifications: data.push_notifications,
          new_message_alerts: data.new_message_alerts,
          new_offer_alerts: data.new_offer_alerts,
          order_status_alerts: data.order_status_alerts,
          marketing_emails: data.marketing_emails,
        });
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof NotificationPreferences) => {
    const newValue = !preferences[key];
    setPreferences(prev => ({ ...prev, [key]: newValue }));
    
    // Auto-save
    if (userId) {
      try {
        await supabase
          .from("notification_preferences")
          .upsert({
            user_id: userId,
            [key]: newValue,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
      } catch (error) {
        console.error("Error saving preference:", error);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <MiniLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
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
              <h1 className="text-xl font-bold flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                Paramètres
              </h1>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
            </div>
          </div>

          {/* Account Section */}
          <section className="mb-6">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">
              Compte
            </h2>
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <button 
                onClick={() => navigate("/profile")}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Mon profil</p>
                    <p className="text-xs text-muted-foreground">Informations personnelles</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
              
              <Separator />
              
              <button 
                onClick={() => navigate("/tutoriels")}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-accent" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Tutoriels</p>
                    <p className="text-xs text-muted-foreground">Guides d'utilisation</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </section>

          {/* Appearance Section */}
          <section className="mb-6">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">
              Apparence
            </h2>
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Palette className="w-5 h-5 text-purple-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Thème</p>
                  <p className="text-xs text-muted-foreground">Clair, sombre ou système</p>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </section>

          {/* Notifications Section */}
          <section className="mb-6">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">
              Notifications
            </h2>
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {/* Browser Push Status */}
              <div className="flex items-center justify-between p-4 bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Notifications navigateur</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {!isSupported ? (
                        <Badge variant="outline" className="text-[10px] h-5">Non supporté</Badge>
                      ) : permission === "granted" ? (
                        <Badge variant="success" className="text-[10px] h-5 gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Activées
                        </Badge>
                      ) : permission === "denied" ? (
                        <Badge variant="destructive" className="text-[10px] h-5 gap-1">
                          <XCircle className="w-3 h-3" />
                          Bloquées
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] h-5">Non activées</Badge>
                      )}
                    </div>
                  </div>
                </div>
                {isSupported && permission !== "granted" && permission !== "denied" && (
                  <Button variant="outline" size="sm" onClick={requestPermission}>
                    Activer
                  </Button>
                )}
              </div>

              <Separator />

              {/* Email Notifications */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <Label className="font-medium text-sm">Email</Label>
                    <p className="text-xs text-muted-foreground">Alertes par email</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.email_notifications}
                  onCheckedChange={() => handleToggle("email_notifications")}
                />
              </div>

              <Separator />

              {/* Push Notifications */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <Label className="font-medium text-sm">Push</Label>
                    <p className="text-xs text-muted-foreground">Notifications temps réel</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.push_notifications}
                  onCheckedChange={() => handleToggle("push_notifications")}
                />
              </div>
            </div>
          </section>

          {/* Alert Types */}
          <section className="mb-6">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">
              Types d'alertes
            </h2>
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {[
                { key: "new_message_alerts", icon: MessageSquare, color: "blue", label: "Messages", desc: "Nouveaux messages" },
                { key: "new_offer_alerts", icon: TrendingUp, color: "green", label: "Offres", desc: "Nouvelles offres" },
                { key: "order_status_alerts", icon: Package, color: "orange", label: "Commandes", desc: "Statut des envois" },
                { key: "marketing_emails", icon: Megaphone, color: "purple", label: "Marketing", desc: "Offres et actualités" },
              ].map((item, index) => (
                <div key={item.key}>
                  {index > 0 && <Separator />}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full bg-${item.color}-500/10 flex items-center justify-center`}>
                        <item.icon className={`w-4 h-4 text-${item.color}-500`} />
                      </div>
                      <div>
                        <Label className="font-medium text-sm">{item.label}</Label>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences[item.key as keyof NotificationPreferences]}
                      onCheckedChange={() => handleToggle(item.key as keyof NotificationPreferences)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Security & Logout */}
          <section className="mb-6">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 px-1">
              Sécurité
            </h2>
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <button 
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-success" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Confidentialité</p>
                    <p className="text-xs text-muted-foreground">Données et sécurité</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>

              <Separator />

              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-4 hover:bg-destructive/5 transition-colors text-destructive"
              >
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <LogOut className="w-5 h-5" />
                </div>
                <p className="font-medium">Se déconnecter</p>
              </button>
            </div>
          </section>

          {/* App Version */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            Yobbanté Connect v1.0.0
          </p>
        </motion.div>
      </main>

      <MobileNav />
    </div>
  );
}
