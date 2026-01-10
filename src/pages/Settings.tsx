import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Bell, Mail, MessageSquare, Package, TrendingUp, Megaphone, ArrowLeft, Settings as SettingsIcon, TestTube2, Smartphone, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { SendTestNotification } from "@/components/settings/SendTestNotification";
import { usePushNotifications } from "@/hooks/usePushNotifications";

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

      // Fetch existing preferences
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

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const savePreferences = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (error) throw error;

      toast({
        title: "Préférences enregistrées",
        description: "Vos paramètres de notification ont été mis à jour.",
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les préférences.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <SettingsIcon className="w-6 h-6" />
                Paramètres
              </h1>
              <p className="text-muted-foreground">
                Gérez vos préférences de notification
              </p>
            </div>
          </div>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Choisissez comment vous souhaitez être notifié
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* General Toggles */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <Label htmlFor="email" className="font-medium">Notifications par email</Label>
                      <p className="text-sm text-muted-foreground">
                        Recevoir les alertes par email
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="email"
                    checked={preferences.email_notifications}
                    onCheckedChange={() => handleToggle("email_notifications")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <Label htmlFor="push" className="font-medium">Notifications push</Label>
                      <p className="text-sm text-muted-foreground">
                        Recevoir les notifications en temps réel
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="push"
                    checked={preferences.push_notifications}
                    onCheckedChange={() => handleToggle("push_notifications")}
                  />
                </div>

                {/* Browser Push Permission */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <Label className="font-medium">Notifications navigateur</Label>
                      <div className="flex items-center gap-2 mt-1">
                        {!isSupported ? (
                          <Badge variant="outline" className="text-muted-foreground">
                            Non supporté
                          </Badge>
                        ) : permission === "granted" ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Activées
                          </Badge>
                        ) : permission === "denied" ? (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="w-3 h-3" />
                            Bloquées
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Non activées
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {isSupported && permission !== "granted" && permission !== "denied" && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={requestPermission}
                    >
                      Activer
                    </Button>
                  )}
                  {permission === "denied" && (
                    <p className="text-xs text-muted-foreground max-w-[120px] text-right">
                      Modifiez dans les paramètres du navigateur
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Specific Alerts */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Types d'alertes
                </h4>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <Label htmlFor="messages" className="font-medium">Nouveaux messages</Label>
                      <p className="text-sm text-muted-foreground">
                        Alertes pour les nouveaux messages
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="messages"
                    checked={preferences.new_message_alerts}
                    onCheckedChange={() => handleToggle("new_message_alerts")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <Label htmlFor="offers" className="font-medium">Nouvelles offres</Label>
                      <p className="text-sm text-muted-foreground">
                        Alertes pour les offres correspondant à vos recherches
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="offers"
                    checked={preferences.new_offer_alerts}
                    onCheckedChange={() => handleToggle("new_offer_alerts")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <Label htmlFor="orders" className="font-medium">Statut des commandes</Label>
                      <p className="text-sm text-muted-foreground">
                        Alertes sur l'avancement de vos envois
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="orders"
                    checked={preferences.order_status_alerts}
                    onCheckedChange={() => handleToggle("order_status_alerts")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <Label htmlFor="marketing" className="font-medium">Emails marketing</Label>
                      <p className="text-sm text-muted-foreground">
                        Recevoir nos offres et actualités
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="marketing"
                    checked={preferences.marketing_emails}
                    onCheckedChange={() => handleToggle("marketing_emails")}
                  />
                </div>
              </div>

              <Separator />

              {/* Test Notification Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Test des notifications
                </h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <TestTube2 className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <Label className="font-medium">Notification test</Label>
                      <p className="text-sm text-muted-foreground">
                        Vérifier le fonctionnement en temps réel
                      </p>
                    </div>
                  </div>
                  <SendTestNotification userId={userId} />
                </div>
              </div>

              <Separator />

              {/* Save Button */}
              <Button 
                onClick={savePreferences} 
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer les préférences"
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}