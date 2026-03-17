/**
 * GPGrowthTab — Dedicated tab/page for GP growth metrics & tools
 * Accessed from GP dashboard
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { GPGrowthHub } from "./GPGrowthHub";
import { PageLoader } from "@/components/ui/PageLoader";
import { useGPProfile } from "@/hooks/useGPProfile";

export default function GPGrowthTab() {
  const navigate = useNavigate();
  const { gpProfile, loading } = useGPProfile();

  if (loading) return <PageLoader />;
  if (!gpProfile) {
    navigate("/auth");
    return null;
  }

  return (
    <GPDashboardLayout gpProfile={gpProfile} pendingCount={0} activeOrdersCount={0}>
      <div className="p-4 space-y-4">
        <div>
          <h2 className="text-lg font-bold">Croissance & Parrainage</h2>
          <p className="text-xs text-muted-foreground">Devenez un micro-agent Konnekt et gagnez plus</p>
        </div>
        <GPGrowthHub gpId={gpProfile.id} gpName={gpProfile.business_name} />
      </div>
    </GPDashboardLayout>
  );
}
