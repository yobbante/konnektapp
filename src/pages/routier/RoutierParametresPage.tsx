/**
 * RoutierParametresPage — Paramètres routier spécifiques
 * Mirroring GPParametresPage but with fleet/zones/road-specific settings
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings, User, Bell, Shield,
  Globe, LogOut, Palette, MapPin, Phone,
  Edit3, Save, X, MessageCircle,
  Car, Wallet, Key, Lock, Truck, Route,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { toast } from "@/components/ui/use-toast";
import {
  SettingsSection, SettingsRow, ToggleRow,
  PasswordChangeDialog, ForgotPasswordDialog,
  loadNotificationPrefs, saveNotificationPref,
  type NotificationPrefs, defaultNotificationPrefs,
} from "@/components/settings/SharedSettingsComponents";

export default function RoutierParametresPage() {
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
  const [vehicleCount, setVehicleCount] = useState(0);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserEmail(user.email || "");

      const [profileRes, prefsData] = await Promise.all([
        supabase.from("gp_profiles")
          .select("id, business_name, gp_type, status, road_type, deposit_address, reception_address, phone, whatsapp_phone, description, base_origin_city, base_origin_country, base_destination_city, base_destination_country, zones_covered, fleet_size")
          .eq("user_id", user.id).eq("gp_type", "routier").maybeSingle(),
        loadNotificationPrefs(user.id),
      ]);

      const profile = profileRes.data;
      if (!profile) { navigate("/routier/inscription"); return; }
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

      const [ordersRes, vehiclesRes] = await Promise.all([
        supabase.from("orders").select("status").eq("gp_id", profile.id),
        supabase.from("vehicles").select("id").eq("gp_id", profile.id),
      ]);
      setPendingCount(ordersRes.data?.filter(o => o.status === "pending").length || 0);
      setActiveCount(ordersRes.data?.filter(o => ["accepted", "collected", "in_transit"].includes(o.status)).length || 0);
      setVehicleCount(vehiclesRes.data?.length || 0);
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

  const roadTypeLabel = gpProfile.road_type === "shuttle" || gpProfile.road_type === "navette"
    ? "Navette" : gpProfile.road_type === "mission" ? "Mission" : "Hybride";

  return (
    <RoutierDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeOrdersCount={activeCount}>
      <div className="px-4 py-3 space-y-4 pb-24">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">Paramètres</h1>
        </div>

        {/* ═══ IDENTITÉ & PROFIL ═══ */}
        <SettingsSection title="Identité & Profil">
          {editingProfile ? (
            <div className="p-3 space-y-2.5">
              <div>
                <Label className="text-[10px] text-muted-foreground">Nom commercial</Label>
                <Input className="h-9" value={profileForm.business_name} onChange={e => setProfileForm(p => ({ ...p, business_name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Description</Label>
                <Textarea value={profileForm.description} onChange={e => setProfileForm(p => ({ ...p, description: e.target.value }))} placeholder="Décrivez votre activité de transport..." rows={2} />
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
                <Label className="text-[10px] text-muted-foreground">📍 Adresse de départ</Label>
                <Input className="h-9" value={profileForm.deposit_address} onChange={e => setProfileForm(p => ({ ...p, deposit_address: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">📍 Adresse d'arrivée / dépôt</Label>
                <Input className="h-9" value={profileForm.reception_address} onChange={e => setProfileForm(p => ({ ...p, reception_address: e.target.value }))} />
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
              <CompactInfoRow icon={Phone} label="Tél." value={gpProfile.phone || "—"} />
              <Separator />
              <CompactInfoRow icon={MessageCircle} label="WhatsApp" value={gpProfile.whatsapp_phone || "—"} />
              <Separator />
              <CompactInfoRow icon={MapPin} label="Départ" value={gpProfile.deposit_address || "—"} />
              <Separator />
              <CompactInfoRow icon={MapPin} label="Arrivée" value={gpProfile.reception_address || "—"} />
            </>
          )}
        </SettingsSection>

        {/* ═══ FLOTTE & VÉHICULES ═══ */}
        <SettingsSection title="Flotte & Véhicules">
          <SettingsRow icon={Car} label="Ma flotte" desc={`${vehicleCount} véhicule${vehicleCount > 1 ? "s" : ""}`} onClick={() => navigate("/routier/vehicules")} />
          <Separator />
          <SettingsRow icon={Truck} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Mode transport" desc={roadTypeLabel} onClick={() => {}} />
          <Separator />
          <SettingsRow icon={Route} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" label="Zones couvertes" desc={`${(gpProfile.zones_covered || []).length} zones`} onClick={() => navigate("/routier/apercu")} />
        </SettingsSection>

        {/* ═══ OPÉRATIONS ═══ */}
        <SettingsSection title="Opérations">
          <SettingsRow icon={User} label="Profil public" desc="Aperçu client" onClick={() => navigate("/routier/profil-public")} />
          <Separator />
          <SettingsRow icon={Wallet} iconColor="text-emerald-500" iconBg="bg-emerald-500/10" label="Portefeuille" desc="Solde et retraits" onClick={() => navigate("/routier/wallet")} />
          <Separator />
          <SettingsRow icon={Globe} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Devise" desc="XOF" onClick={() => {}} />
        </SettingsSection>

        {/* ═══ SÉCURITÉ ═══ */}
        <SettingsSection title="Sécurité">
          <SettingsRow icon={Shield} label="KTP" desc="Score de confiance" onClick={() => {}} />
          <Separator />
          <SettingsRow icon={Key} iconColor="text-amber-500" iconBg="bg-amber-500/10" label="Mot de passe" desc="Modifier" onClick={() => setShowPwdDialog(true)} />
          <Separator />
          <SettingsRow icon={Lock} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Mot de passe oublié" desc="Réinitialiser" onClick={() => setShowForgotPwd(true)} />
        </SettingsSection>

        {/* ═══ NOTIFICATIONS ═══ */}
        <SettingsSection title="Notifications">
          <ToggleRow icon={Bell} label="Push" desc="Notifications en temps réel" checked={notifPrefs.push_notifications} onToggle={() => handleToggle("push_notifications")} />
          <Separator />
          <ToggleRow icon={Bell} iconColor="text-blue-500" iconBg="bg-blue-500/10" label="Nouvelles missions" desc="Marketplace" checked={notifPrefs.new_message_alerts} onToggle={() => handleToggle("new_message_alerts")} />
          <Separator />
          <ToggleRow icon={Bell} iconColor="text-orange-500" iconBg="bg-orange-500/10" label="Statuts commandes" desc="Mises à jour" checked={notifPrefs.order_status_alerts} onToggle={() => handleToggle("order_status_alerts")} />
        </SettingsSection>

        {/* ═══ APPARENCE ═══ */}
        <SettingsSection title="Apparence">
          <div className="p-3">
            <div className="flex items-center gap-3 mb-2">
              <Palette className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Thème</span>
            </div>
            <ThemeToggle />
          </div>
        </SettingsSection>

        <button onClick={async () => { await supabase.auth.signOut(); navigate("/"); }} className="w-full bg-destructive/10 rounded-xl p-3 flex items-center gap-3 hover:bg-destructive/15 transition-colors active:scale-[0.98]">
          <LogOut className="w-4 h-4 text-destructive" />
          <span className="font-medium text-sm text-destructive">Déconnexion</span>
        </button>
      </div>

      <PasswordChangeDialog open={showPwdDialog} onOpenChange={setShowPwdDialog} userEmail={userEmail} />
      <ForgotPasswordDialog open={showForgotPwd} onOpenChange={setShowForgotPwd} userEmail={userEmail} />
    </RoutierDashboardLayout>
  );
}

function CompactInfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <span className="text-[10px] text-muted-foreground w-14 flex-shrink-0">{label}</span>
      <span className="text-xs font-medium truncate">{value}</span>
    </div>
  );
}
