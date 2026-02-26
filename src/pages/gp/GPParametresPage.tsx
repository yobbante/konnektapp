/**
 * GPParametresPage — Paramètres GP complets, organisés par famille
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Settings, User, DollarSign, Bell, ScanLine, Shield, 
  Globe, ChevronRight, LogOut, Palette, MapPin, Phone,
  Mail, Edit3, Save, X, MessageCircle, FileCheck, Camera,
  ShieldX, Upload, BadgeCheck, CreditCard, Wallet, UserCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { toast } from "@/components/ui/use-toast";

export default function GPParametresPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [editingProfile, setEditingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    business_name: "",
    phone: "",
    whatsapp_phone: "",
    deposit_address: "",
    reception_address: "",
    description: "",
  });
  const [notifPrefs, setNotifPrefs] = useState({
    push_notifications: true,
    new_message_alerts: true,
    order_status_alerts: true,
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: profile } = await supabase
        .from("gp_profiles")
        .select("id, business_name, gp_type, status, base_price_per_kg, default_currency, deposit_address, reception_address, phone, whatsapp_phone, description, kyc_level, kyc_status, id_document_url, selfie_url, insurance_document_url, transport_license_url, explicit_restrictions")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) { navigate("/gp/inscription"); return; }
      setGpProfile(profile);
      setProfileForm({
        business_name: profile.business_name || "",
        phone: profile.phone || "",
        whatsapp_phone: profile.whatsapp_phone || "",
        deposit_address: profile.deposit_address || "",
        reception_address: profile.reception_address || "",
        description: profile.description || "",
      });

      const { data: orders } = await supabase
        .from("orders")
        .select("status")
        .eq("gp_id", profile.id);
      setPendingCount(orders?.filter(o => o.status === "pending").length || 0);
      setActiveCount(orders?.filter(o => ["accepted", "collected", "in_transit"].includes(o.status)).length || 0);

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

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("gp_profiles")
        .update({
          business_name: profileForm.business_name,
          phone: profileForm.phone,
          whatsapp_phone: profileForm.whatsapp_phone,
          deposit_address: profileForm.deposit_address,
          reception_address: profileForm.reception_address,
          description: profileForm.description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", gpProfile.id);

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

  const kycLevel = gpProfile.kyc_level ?? 0;
  const kycStatus = gpProfile.kyc_status || "pending";
  const hasId = !!gpProfile.id_document_url;
  const hasSelfie = !!gpProfile.selfie_url;
  const hasInsurance = !!gpProfile.insurance_document_url;
  const hasLicense = !!gpProfile.transport_license_url;
  const kycProgress = [hasId, hasSelfie].filter(Boolean).length;

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingCount}
      activeOrdersCount={activeCount}
      activeTab="parametres"
    >
      <div className="px-4 py-3 space-y-4 pb-24">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">Paramètres</h1>
        </div>

        {/* ═══ 1. IDENTITÉ & PROFIL ═══ */}
        <Section title="Identité & Profil">
          {editingProfile ? (
            <div className="p-3 space-y-3">
              <div>
                <Label className="text-xs">Nom commercial</Label>
                <Input className="h-10" value={profileForm.business_name} onChange={e => setProfileForm(p => ({ ...p, business_name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea value={profileForm.description} onChange={e => setProfileForm(p => ({ ...p, description: e.target.value }))} placeholder="Décrivez votre activité..." rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Téléphone</Label>
                  <Input className="h-10" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">WhatsApp</Label>
                  <Input className="h-10" value={profileForm.whatsapp_phone} onChange={e => setProfileForm(p => ({ ...p, whatsapp_phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Adresse de dépôt</Label>
                <Input className="h-10" value={profileForm.deposit_address} onChange={e => setProfileForm(p => ({ ...p, deposit_address: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Adresse de réception</Label>
                <Input className="h-10" value={profileForm.reception_address} onChange={e => setProfileForm(p => ({ ...p, reception_address: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveProfile} disabled={saving} size="sm" className="flex-1 gap-1">
                  <Save className="w-3.5 h-3.5" /> {saving ? "..." : "Enregistrer"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditingProfile(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{gpProfile.business_name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{gpProfile.description || "Aucune description"}</p>
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
              <CompactInfoRow icon={MapPin} label="Dépôt" value={gpProfile.deposit_address || "—"} />
              <Separator />
              <CompactInfoRow icon={MapPin} label="Réception" value={gpProfile.reception_address || "—"} />
            </>
          )}
        </Section>

        {/* ═══ 2. KYC & VÉRIFICATION ═══ */}
        <Section title="KYC & Vérification">
          <div className="p-3 space-y-3">
            {/* KYC Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BadgeCheck className={`w-5 h-5 ${kycStatus === 'verified' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-sm font-medium">Statut KYC</p>
                  <p className="text-xs text-muted-foreground">Niveau {kycLevel}</p>
                </div>
              </div>
              <Badge variant={kycStatus === 'verified' ? 'default' : 'secondary'} className="text-xs">
                {kycStatus === 'verified' ? '✓ Vérifié' : kycStatus === 'pending' ? 'En attente' : kycStatus}
              </Badge>
            </div>

            <Separator />

            {/* Document checklist */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Documents</p>
              <DocRow label="Pièce d'identité" done={hasId} onClick={() => navigate("/gp/profil-public")} />
              <DocRow label="Selfie de vérification" done={hasSelfie} onClick={() => navigate("/gp/profil-public")} />
              <DocRow label="Assurance transport" done={hasInsurance} onClick={() => navigate("/gp/profil-public")} />
              <DocRow label="Licence transport" done={hasLicense} onClick={() => navigate("/gp/profil-public")} />
            </div>

            {kycProgress < 2 && (
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => navigate("/gp/profil-public")}>
                <Upload className="w-3.5 h-3.5" />
                Compléter mes documents
              </Button>
            )}
          </div>
        </Section>

        {/* ═══ 3. OPÉRATIONS ═══ */}
        <Section title="Opérations">
          <CompactNavRow icon={User} label="Profil public" desc="Aperçu client" onClick={() => navigate("/gp/profil-public")} />
          <Separator />
          <CompactNavRow icon={DollarSign} label="Grille tarifaire" desc={`${gpProfile.base_price_per_kg || 0} ${gpProfile.default_currency || "XOF"}/kg`} onClick={() => navigate("/gp/tarification")} />
          <Separator />
          <CompactNavRow icon={ShieldX} label="Restrictions" desc={`${(gpProfile.explicit_restrictions || []).length} actives`} onClick={() => navigate("/gp/restrictions")} />
          <Separator />
          <CompactNavRow icon={Globe} label="Devise par défaut" desc={gpProfile.default_currency || "XOF"} onClick={() => navigate("/gp/tarification")} />
          <Separator />
          <CompactNavRow icon={ScanLine} label="Scanner QR" desc="Ouvrir la caméra" onClick={() => navigate("/gp/scan")} />
        </Section>

        {/* ═══ 4. SÉCURITÉ & CONFIANCE ═══ */}
        <Section title="Sécurité & Confiance">
          <CompactNavRow icon={Shield} label="KTP & GeoTrack" desc="Score de confiance" onClick={() => navigate("/gp/ktp-geotrack")} />
          <Separator />
          <CompactNavRow icon={Wallet} label="Portefeuille" desc="Solde et retraits" onClick={() => navigate("/gp/wallet")} />
        </Section>

        {/* ═══ 5. NOTIFICATIONS ═══ */}
        <Section title="Notifications">
          <CompactToggleRow icon={Bell} label="Push notifications" checked={notifPrefs.push_notifications} onChange={v => handleToggle("push_notifications", v)} />
          <Separator />
          <CompactToggleRow icon={Bell} label="Messages clients" checked={notifPrefs.new_message_alerts} onChange={v => handleToggle("new_message_alerts", v)} />
          <Separator />
          <CompactToggleRow icon={Bell} label="Statuts commandes" checked={notifPrefs.order_status_alerts} onChange={v => handleToggle("order_status_alerts", v)} />
        </Section>

        {/* ═══ 6. APPARENCE ═══ */}
        <Section title="Apparence">
          <div className="p-3">
            <div className="flex items-center gap-3 mb-2">
              <Palette className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Thème</span>
            </div>
            <ThemeToggle />
          </div>
        </Section>

        {/* Déconnexion */}
        <button
          onClick={handleSignOut}
          className="w-full bg-destructive/10 rounded-xl p-3 flex items-center gap-3 hover:bg-destructive/15 transition-colors active:scale-[0.98]"
        >
          <LogOut className="w-4 h-4 text-destructive" />
          <span className="font-medium text-sm text-destructive">Déconnexion</span>
        </button>
      </div>
    </GPDashboardLayout>
  );
}

/* ─── Helpers ─── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 px-1">{title}</h2>
      <div className="bg-card rounded-xl border border-border overflow-hidden">{children}</div>
    </section>
  );
}

function CompactInfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <span className="text-xs text-muted-foreground w-16 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium truncate">{value}</span>
    </div>
  );
}

function CompactNavRow({ icon: Icon, label, desc, onClick }: { icon: any; label: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-primary flex-shrink-0" />
        <div className="text-left">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-[11px] text-muted-foreground">{desc}</p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}

function CompactToggleRow({ icon: Icon, label, checked, onChange }: {
  icon: any; label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function DocRow({ label, done, onClick }: { label: string; done: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between py-1.5 hover:opacity-80 transition-opacity">
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
        <span className={`text-sm ${done ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
      </div>
      {!done && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}
