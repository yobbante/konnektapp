import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AerienDashboardLayout } from "@/components/layout/AerienDashboardLayout";
import { GPWalletCard } from "@/components/gp/GPWalletCard";
import { TransportPageLoader } from "@/components/ui/TransportLoader";

export default function AerienWalletPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: gp } = await supabase.from("gp_profiles").select("*").eq("user_id", user.id).in("gp_type", ["aerien","agence"]).maybeSingle();
      if (!gp) { navigate("/transporteur/inscription"); return; }
      setGpProfile(gp);
      const [wRes, oRes] = await Promise.all([
        supabase.from("gp_wallets").select("*").eq("gp_id", gp.id).maybeSingle(),
        supabase.from("orders").select("status").eq("gp_id", gp.id),
      ]);
      setWallet(wRes.data);
      setPendingCount(oRes.data?.filter(o => o.status === "pending").length || 0);
      setActiveCount(oRes.data?.filter(o => ["accepted","collected","in_transit"].includes(o.status)).length || 0);
      setLoading(false);
    })();
  }, []);

  if (loading) return <TransportPageLoader message="Chargement..." vehicle="truck" />;
  if (!gpProfile) return null;

  return (
    <AerienDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeOrdersCount={activeCount}>
      <div className="px-4 py-4">
        <GPWalletCard wallet={wallet} gpId={gpProfile.id} withdrawalLimit={gpProfile.withdrawal_limit ?? 300000} kycLevel={gpProfile.kyc_level ?? 0} onActivateKYC={() => navigate("/aerien/profil-public")} />
      </div>
    </AerienDashboardLayout>
  );
}
