/**
 * UnifiedProfile — Modular client hub (no inline editing)
 * Links to /profil/complet for profile completion and /client/wallet for finances
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Loader2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

  // Avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const [profileRes, ordersRes, escrowRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("orders").select("status, total_price").eq("client_id", user.id),
        supabase.from("escrow_transactions").select("amount, status").eq("client_id", user.id).eq("status", "held"),
      ]);

      if (profileRes.data) {
        setProfile({ ...profileRes.data, email: user.email } as ProfileData);
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "Max 10 Mo", variant: "destructive" });
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const path = `${profile.user_id}/avatar/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("gp-documents").upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("gp-documents").getPublicUrl(path);
      const publicUrl = urlData?.publicUrl || path;
      await supabase.from("profiles").update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", profile.id);
      setProfile({ ...profile, avatar_url: publicUrl });
      toast({ title: "Photo mise à jour" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

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
    return <div className="min-h-screen bg-background flex items-center justify-center"><MiniLoader size="lg" /></div>;
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto space-y-4">
          {/* Page title */}
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">Mon Espace</h1>
          </div>

          {/* Profile Header with avatar upload */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-start gap-4 mb-3">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-2 border-primary/20 overflow-hidden">
                  {uploadingAvatar ? (
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  ) : profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-2xl object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-primary" />
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md"
                >
                  <Camera className="w-3 h-3 text-primary-foreground" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg truncate">{profile?.full_name || "Utilisateur"}</h2>
                <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  {profile?.user_id && (
                    <span className="text-xs text-muted-foreground font-mono">
                      KN-{profile.user_id.slice(0, 4).toUpperCase()}
                    </span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border border-transparent ${
                    kycLevel === 2 ? "bg-amber-500/10 text-amber-600" :
                    kycLevel === 1 ? "bg-emerald-500/10 text-emerald-600" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {kycLevel === 2 ? "🏆 Confirmé" : kycLevel === 1 ? "✅ Vérifié" : "🔘 Starter"}
                  </span>
                </div>
              </div>
            </div>

            {/* Protection Score */}
            <div className="pt-3 border-t border-border">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Compte sécurisé</span>
                <span className={protectionScore >= 100 ? "text-emerald-500 font-medium" : "text-primary font-medium"}>
                  {protectionScore}%
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${protectionScore}%` }}
                />
              </div>
              {protectionScore < 100 && (
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Complétez votre profil pour débloquer plus d'avantages
                </p>
              )}
            </div>
          </div>

          {/* Security */}
          <SecurityModule
            kycLevel={kycLevel}
            phoneVerified={!!profile?.phone}
            emailVerified={!!profile?.email}
            idVerified={!!profile?.id_document_url}
            addressConfirmed={!!profile?.address}
            onUpgradeClick={() => navigate("/profil/complet")}
          />

          {/* Wallet — links to dedicated page */}
          <WalletModule
            availableBalance={0}
            pendingEscrow={escrowTotal}
            creditBonus={0}
            currency="FCFA"
            onViewTransactions={() => navigate("/client/wallet")}
          />

          {/* Parcels */}
          <ParcelModule stats={stats} />

          {/* Settings — edit goes to completion page */}
          <SettingsModule
            onEditProfile={() => navigate("/profil/complet")}
            onSignOut={handleSignOut}
          />
        </motion.div>
      </main>

      <MobileNav />
    </div>
  );
}
