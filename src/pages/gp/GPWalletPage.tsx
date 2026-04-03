import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { GPWalletCard } from "@/components/gp/GPWalletCard";
import { WalletSkeleton } from "@/components/ui/skeletons";
import { useGPProfile } from "@/hooks/useGPProfile";
import { SmartVoyageForm } from "@/components/gp/SmartVoyageForm";
import { PremiumCTABanner } from "@/components/gp/PremiumCTABanner";
import { isGPPremium } from "@/lib/premiumGating";

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
      <div className="px-4 py-4 space-y-4">
        <GPWalletCard
          wallet={wallet ? { ...wallet, currency: gpProfile.default_currency || wallet.currency || "XOF" } : null}
          gpId={gpProfile.id}
          withdrawalLimit={gpProfile.withdrawal_limit ?? 300000}
          kycLevel={gpProfile.kyc_level ?? 0}
          onActivateKYC={() => navigate("/gp/profil-public")}
        />

        {/* Premium CTA — progressive */}
        <PremiumCTABanner variant="card" context="wallet" subscription={(gpProfile as any).subscription} />
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
