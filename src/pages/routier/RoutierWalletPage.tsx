import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { GPWalletCard } from "@/components/gp/GPWalletCard";
import { TransportPageLoader } from "@/components/ui/TransportLoader";

export default function RoutierWalletPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: gp } = await supabase
        .from("gp_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("gp_type", "routier")
        .maybeSingle();

      if (!gp) { navigate("/routier/inscription"); return; }
      setGpProfile(gp);

      // Load wallet
      const { data: w } = await supabase
        .from("gp_wallets")
        .select("*")
        .eq("gp_id", gp.id)
        .maybeSingle();
      setWallet(w);

      // Load counts
      const { data: orders } = await supabase
        .from("orders")
        .select("status")
        .eq("gp_id", gp.id);

      const pending = orders?.filter(o => o.status === "pending")?.length || 0;
      const active = orders?.filter(o => ["accepted", "collected", "in_transit"].includes(o.status))?.length || 0;
      setPendingCount(pending);
      setActiveCount(active);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <TransportPageLoader message="Chargement..." vehicle="truck" />;
  if (!gpProfile) return null;

  return (
    <RoutierDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeOrdersCount={activeCount}>
      <div className="px-4 py-4">
        <GPWalletCard
          wallet={wallet ? { ...wallet, currency: gpProfile.default_currency || wallet.currency || "XOF" } : null}
          gpId={gpProfile.id}
          withdrawalLimit={gpProfile.withdrawal_limit ?? 300000}
          kycLevel={gpProfile.kyc_level ?? 0}
          onActivateKYC={() => navigate("/routier/profil-public")}
        />
      </div>
    </RoutierDashboardLayout>
  );
}
