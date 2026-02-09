/**
 * GPParametresPage — Paramètres GP dédiés
 * 
 * RÈGLES:
 * - Totalement isolé des paramètres client
 * - Accessible uniquement depuis le Dashboard GP
 * - Inclut: infos GP, tarification, devises, scan, notifications, opérationnel
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Settings, User, DollarSign, Bell, ScanLine, Shield, 
  Globe, ChevronRight, LogOut, Palette, Lock, MapPin
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { toast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";

export default function GPParametresPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [notifPrefs, setNotifPrefs] = useState({
    push_notifications: true,
    new_message_alerts: true,
    order_status_alerts: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: profile } = await supabase
        .from("gp_profiles")
        .select("id, business_name, gp_type, status, base_price_per_kg, default_currency, deposit_address, reception_address, phone, whatsapp_phone")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) { navigate("/gp/inscription"); return; }
      setGpProfile(profile);

      // Order counts
      const { data: orders } = await supabase
        .from("orders")
        .select("status")
        .eq("gp_id", profile.id);
      setPendingCount(orders?.filter(o => o.status === "pending").length || 0);
      setActiveCount(orders?.filter(o => ["accepted", "collected", "in_transit"].includes(o.status)).length || 0);

      // Load notification preferences
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("push_notifications, new_message_alerts, order_status_alerts")
        .eq("user_id", user.id)
        .single();

      if (prefs) {
        setNotifPrefs({
          push_notifications: prefs.push_notifications ?? true,
          new_message_alerts: prefs.new_message_alerts ?? true,
          order_status_alerts: prefs.order_status_alerts ?? true,
        });
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: string, value: boolean) => {
    setNotifPrefs(prev => ({ ...prev, [key]: value }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("notification_preferences").upsert({
        user_id: user.id,
        [key]: value,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    } catch (e) {
      console.error("Error saving preference:", e);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) return <PageLoader message="Chargement..." />;
  if (!gpProfile) return null;

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingCount}
      activeOrdersCount={activeCount}
      activeTab="parametres"
    >
      <div className="px-4 py-4 space-y-5 pb-24">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">Paramètres GP</h1>
        </div>

        {/* ─── Informations GP ─── */}
        <Section title="Informations GP">
          <SettingsRow
            icon={User}
            label="Profil public"
            description="Nom, photo, description"
            onClick={() => navigate("/gp/profil-public")}
          />
          <Separator />
          <SettingsRow
            icon={MapPin}
            label="Adresses"
            description={gpProfile.deposit_address ? "Dépôt & réception configurés" : "Non configuré"}
            onClick={() => navigate("/gp/profil-public")}
          />
        </Section>

        {/* ─── Tarification ─── */}
        <Section title="Tarification & Devises">
          <SettingsRow
            icon={DollarSign}
            label="Grille tarifaire"
            description={`${gpProfile.base_price_per_kg || 0} ${gpProfile.default_currency || "XOF"}/kg`}
            onClick={() => navigate("/gp/tarification")}
          />
          <Separator />
          <SettingsRow
            icon={Globe}
            label="Devise par défaut"
            description={gpProfile.default_currency || "XOF"}
            onClick={() => navigate("/gp/tarification")}
          />
        </Section>

        {/* ─── Scan ─── */}
        <Section title="Préférences de scan">
          <SettingsRow
            icon={ScanLine}
            label="Scanner QR"
            description="Ouvre la caméra directement"
            onClick={() => navigate("/gp/scan")}
          />
        </Section>

        {/* ─── Notifications GP ─── */}
        <Section title="Notifications GP">
          <div className="space-y-0">
            <ToggleRow
              icon={Bell}
              label="Push notifications"
              description="Alertes en temps réel"
              checked={notifPrefs.push_notifications}
              onCheckedChange={(v) => handleToggle("push_notifications", v)}
            />
            <Separator />
            <ToggleRow
              icon={Bell}
              label="Messages clients"
              description="Nouveaux messages reçus"
              checked={notifPrefs.new_message_alerts}
              onCheckedChange={(v) => handleToggle("new_message_alerts", v)}
            />
            <Separator />
            <ToggleRow
              icon={Bell}
              label="Statuts commandes"
              description="Mises à jour automatiques"
              checked={notifPrefs.order_status_alerts}
              onCheckedChange={(v) => handleToggle("order_status_alerts", v)}
            />
          </div>
        </Section>

        {/* ─── Sécurité ─── */}
        <Section title="Sécurité & Confiance">
          <SettingsRow
            icon={Shield}
            label="KTP & GeoTrack"
            description="Score de confiance et géolocalisation"
            onClick={() => navigate("/gp/ktp-geotrack")}
          />
        </Section>

        {/* ─── Apparence ─── */}
        <Section title="Apparence">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Palette className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Thème</p>
                <p className="text-xs text-muted-foreground">Clair, sombre ou système</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </Section>

        {/* ─── Déconnexion ─── */}
        <button
          onClick={handleSignOut}
          className="w-full bg-destructive/10 rounded-xl p-4 flex items-center gap-3 hover:bg-destructive/15 transition-colors active:scale-[0.98]"
        >
          <LogOut className="w-5 h-5 text-destructive" />
          <span className="font-medium text-destructive">Déconnexion</span>
        </button>
      </div>
    </GPDashboardLayout>
  );
}

/* ─── Helpers ─── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
        {title}
      </h2>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function SettingsRow({ icon: Icon, label, description, onClick }: {
  icon: any; label: string; description: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="text-left">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}

function ToggleRow({ icon: Icon, label, description, checked, onCheckedChange }: {
  icon: any; label: string; description: string; checked: boolean; onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
