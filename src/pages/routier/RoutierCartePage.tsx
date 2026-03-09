/**
 * RoutierCartePage — Dedicated map tab for the Routier dashboard
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { RoutierInteractiveMap } from "@/components/routier/RoutierInteractiveMap";
import { TransportPageLoader } from "@/components/ui/TransportLoader";

export default function RoutierCartePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [activeMissions, setActiveMissions] = useState<any[]>([]);
  const [missionRequests, setMissionRequests] = useState<any[]>([]);
  const [pendingMissions, setPendingMissions] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: gp } = await supabase
        .from("gp_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setGpProfile(gp);

      if (!gp) { setLoading(false); return; }

      // Load missions in parallel
      const [activeRes, requestRes, pendingRes] = await Promise.all([
        supabase.from("orders")
          .select("*")
          .eq("gp_id", gp.id)
          .in("status", ["accepted", "collected", "in_transit"])
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("routier_missions")
          .select("*")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("orders")
          .select("*")
          .eq("gp_id", gp.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      setActiveMissions(activeRes.data || []);
      setMissionRequests(requestRes.data || []);
      setPendingMissions(pendingRes.data || []);
      setLoading(false);
    })();
  }, []);

  const defaultGp = gpProfile || { id: "", business_name: "Routier", gp_type: "routier", status: "pending" };

  if (loading) {
    return (
      <RoutierDashboardLayout gpProfile={defaultGp}>
        <TransportPageLoader />
      </RoutierDashboardLayout>
    );
  }

  return (
    <RoutierDashboardLayout gpProfile={defaultGp}>
      <div className="flex-1 relative" style={{ height: "calc(100vh - 180px)" }}>
        <RoutierInteractiveMap
          activeMissions={activeMissions}
          missionRequests={missionRequests}
          pendingMissions={pendingMissions}
          stats={{ delivered: 0, successRate: 0, avgRating: 0 }}
        />
      </div>
    </RoutierDashboardLayout>
  );
}
