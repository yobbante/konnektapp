import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { GPWalletCard } from "@/components/gp/GPWalletCard";
import { PageLoader } from "@/components/ui/PageLoader";
import { useGPProfile } from "@/hooks/useGPProfile";
import { SmartVoyageForm } from "@/components/gp/SmartVoyageForm";

export default function GPWalletPage() {
  const navigate = useNavigate();
  const { gpProfile, loading: profileLoading, pendingCount, activeCount } = useGPProfile();
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showVoyageForm, setShowVoyageForm] = useState(false);

  useEffect(() => {
    if (gpProfile) loadWallet();
  }, [gpProfile]);

  const loadWallet = async () => {
    if (!gpProfile) return;
    const { data } = await supabase
      .from("gp_wallets")
      .select("*")
      .eq("gp_id", gpProfile.id)
      .maybeSingle();
    setWallet(data);
    setLoading(false);
  };

  if (profileLoading || loading) return <PageLoader message="Chargement..." />;
  if (!gpProfile) return null;

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingCount}
      activeOrdersCount={activeCount}
      activeTab="wallet"
      onNewVoyage={() => setShowVoyageForm(true)}
    >
      <div className="px-4 py-4">
        <GPWalletCard
          wallet={wallet}
          gpId={gpProfile.id}
          withdrawalLimit={gpProfile.withdrawal_limit ?? 300000}
          kycLevel={gpProfile.kyc_level ?? 0}
          onActivateKYC={() => navigate("/gp/profil-public")}
        />
      </div>

      {gpProfile && (
        <SmartVoyageForm
          open={showVoyageForm}
          onClose={() => setShowVoyageForm(false)}
          gpId={gpProfile.id}
          onSuccess={() => setShowVoyageForm(false)}
        />
      )}
    </GPDashboardLayout>
  );
}
