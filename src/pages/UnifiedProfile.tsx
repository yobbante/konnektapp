/**
 * UnifiedProfile — Refactored modular client profile page
 * 5 blocks: Header, Security, Wallet, Parcels, Settings
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { ProfileHeader, type ClientKYCLevel } from "@/components/client/profile/ProfileHeader";
import { SecurityModule } from "@/components/client/profile/SecurityModule";
import { WalletModule } from "@/components/client/profile/WalletModule";
import { ParcelModule } from "@/components/client/profile/ParcelModule";
import { SettingsModule } from "@/components/client/profile/SettingsModule";

interface ProfileData {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  avatar_url: string | null;
  country_code: string | null;
  kyc_level: number;
  cumulative_spent: number;
  id_document_url: string | null;
  selfie_url: string | null;
  kyc_verified_at: string | null;
  created_at: string;
}

interface OrderStats {
  total: number;
  pending: number;
  inTransit: number;
  delivered: number;
  totalSpent: number;
}

export default function UnifiedProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<OrderStats>({ total: 0, pending: 0, inTransit: 0, delivered: 0, totalSpent: 0 });
  const [escrowTotal, setEscrowTotal] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ full_name: "", phone: "", city: "", address: "" });

  const loadProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      // Parallel queries
      const [profileRes, ordersRes, escrowRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("orders").select("status, total_price").eq("client_id", user.id),
        supabase.from("escrow_transactions").select("amount, status").eq("client_id", user.id).eq("status", "held"),
      ]);

      if (profileRes.data) {
        const p = { ...profileRes.data, email: user.email } as ProfileData;
        setProfile(p);
        setFormData({
          full_name: p.full_name || "",
          phone: p.phone || "",
          city: p.city || "",
          address: p.address || "",
        });
      }

      if (ordersRes.data) {
        const orders = ordersRes.data;
        setStats({
          total: orders.length,
          pending: orders.filter(o => ["pending", "accepted"].includes(o.status)).length,
          inTransit: orders.filter(o => ["collected", "in_transit"].includes(o.status)).length,
          delivered: orders.filter(o => o.status === "delivered").length,
          totalSpent: orders.filter(o => o.status === "delivered").reduce((s, o) => s + (o.total_price || 0), 0),
        });
      }

      if (escrowRes.data) {
        setEscrowTotal(escrowRes.data.reduce((s, e) => s + (e.amount || 0), 0));
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq("id", profile.id);
      if (error) throw error;
      setProfile({ ...profile, ...formData });
      setIsEditing(false);
      toast({ title: "Profil mis à jour" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // Calculate protection score
  const getProtectionScore = (): number => {
    if (!profile) return 0;
    let score = 0;
    if (profile.phone) score += 25;
    if (profile.email) score += 25;
    if (profile.id_document_url) score += 25;
    if (profile.address) score += 25;
    return score;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <MiniLoader size="lg" />
      </div>
    );
  }

  const kycLevel = (profile?.kyc_level || 0) as ClientKYCLevel;
  const protectionScore = getProtectionScore();
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : "";

  return (
    <div className="min-h-screen bg-muted/30 pb-safe">
      <MobileHeader />
      
      <main className="px-4 pb-24" style={{ paddingTop: "calc(70px + env(safe-area-inset-top, 0px))" }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto space-y-4"
        >
          {/* Page title */}
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">Mon Espace</h1>
          </div>

          {/* 1️⃣ Header Identity & Badge */}
          <ProfileHeader
            fullName={profile?.full_name || null}
            email={profile?.email || null}
            avatarUrl={profile?.avatar_url || null}
            memberSince={memberSince}
            kycLevel={kycLevel}
            protectionScore={protectionScore}
            userId={profile?.user_id}
          />

          {/* 2️⃣ Security & Verification */}
          <SecurityModule
            kycLevel={kycLevel}
            phoneVerified={!!profile?.phone}
            emailVerified={!!profile?.email}
            idVerified={!!profile?.id_document_url}
            addressConfirmed={!!profile?.address}
            onUpgradeClick={() => toast({ title: "Bientôt disponible", description: "La vérification d'identité sera disponible prochainement" })}
          />

          {/* 3️⃣ Wallet */}
          <WalletModule
            availableBalance={0}
            pendingEscrow={escrowTotal}
            creditBonus={0}
            currency="FCFA"
            onViewTransactions={() => navigate("/historique")}
          />

          {/* 4️⃣ Parcels */}
          <ParcelModule stats={stats} />

          {/* Edit form (inline, toggled) */}
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-card rounded-2xl border border-border p-4 space-y-4"
            >
              <h3 className="font-semibold text-sm">Modifier mes informations</h3>
              <div className="space-y-3">
                {[
                  { key: "full_name" as const, label: "Nom complet", placeholder: "Votre nom" },
                  { key: "phone" as const, label: "Téléphone", placeholder: "+221 77 123 45 67" },
                  { key: "city" as const, label: "Ville", placeholder: "Votre ville" },
                  { key: "address" as const, label: "Adresse", placeholder: "Votre adresse" },
                ].map((field) => (
                  <div key={field.key}>
                    <Label className="text-xs text-muted-foreground">{field.label}</Label>
                    <Input
                      value={formData[field.key]}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="mt-1"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                  <X className="w-4 h-4 mr-1" /> Annuler
                </Button>
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving ? <MiniLoader size="sm" /> : <><Save className="w-4 h-4 mr-1" /> Enregistrer</>}
                </Button>
              </div>
            </motion.div>
          )}

          {/* 5️⃣ Settings & Support */}
          <SettingsModule
            onEditProfile={() => setIsEditing(!isEditing)}
            onSignOut={handleSignOut}
          />
        </motion.div>
      </main>

      <MobileNav />
    </div>
  );
}
