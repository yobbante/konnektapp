import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { GPOverviewTab } from "@/components/gp/dashboard/GPOverviewTab";
import { PageLoader } from "@/components/ui/PageLoader";
import { useGPProfile } from "@/hooks/useGPProfile";

export default function GPApercuPage() {
  const { gpProfile, loading, pendingCount, activeCount } = useGPProfile();

  if (loading) return <PageLoader message="Chargement..." />;
  if (!gpProfile) return null;

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingCount}
      activeOrdersCount={activeCount}
      activeTab="apercu"
    >
      <GPOverviewTab gpId={gpProfile.id} gpProfile={gpProfile} />
    </GPDashboardLayout>
  );
}
