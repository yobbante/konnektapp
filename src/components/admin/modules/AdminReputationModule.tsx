/**
 * Admin Reputation Module — KTP scores, reputation, sanctions
 */
import { useState, useEffect } from "react";
import { Shield, TrendingUp, AlertTriangle, Ban, Star, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export function AdminReputationModule() {
  const [ktpData, setKtpData] = useState<any[]>([]);
  const [reputationData, setReputationData] = useState<any[]>([]);
  const [sanctions, setSanctions] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [ktpRes, repRes, sanctionsRes, incidentsRes] = await Promise.all([
      supabase.from("ktp_status").select("*, gp:gp_profiles(business_name, city, status)").order("trust_score", { ascending: true }),
      supabase.from("transporter_reputation").select("*, gp:gp_profiles(business_name, city)").order("internal_score", { ascending: true }),
      supabase.from("sanctions").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("reputation_incidents").select("*, gp:gp_profiles(business_name)").order("created_at", { ascending: false }).limit(50),
    ]);
    setKtpData(ktpRes.data || []);
    setReputationData(repRes.data || []);
    setSanctions(sanctionsRes.data || []);
    setIncidents(incidentsRes.data || []);
    setLoading(false);
  };

  const ktpLevels = {
    pro: ktpData.filter(k => k.ktp_level === "pro").length,
    verified: ktpData.filter(k => k.ktp_level === "verified").length,
    basic: ktpData.filter(k => k.ktp_level === "basic").length,
    inactive: ktpData.filter(k => k.ktp_level === "inactive").length,
  };

  const avgScore = ktpData.length > 0 ? Math.round(ktpData.reduce((s, k) => s + k.trust_score, 0) / ktpData.length) : 0;
  const activeSanctions = sanctions.filter(s => s.is_active).length;

  const ktpLevelColor = (level: string) => {
    const map: Record<string, string> = {
      pro: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
      verified: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      basic: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      inactive: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
    return map[level] || map.basic;
  };

  const scoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Award className="w-5 h-5 text-amber-500" />
        Réputation & KTP
      </h2>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border bg-card">
          <p className="text-xs text-muted-foreground">Score moyen KTP</p>
          <p className={`text-xl font-bold ${scoreColor(avgScore)}`}>{avgScore}/100</p>
        </div>
        <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
          <p className="text-xs text-muted-foreground">GP Pro</p>
          <p className="text-xl font-bold text-emerald-600">{ktpLevels.pro}</p>
        </div>
        <div className="p-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
          <p className="text-xs text-muted-foreground">Sanctions actives</p>
          <p className="text-xl font-bold text-red-600">{activeSanctions}</p>
        </div>
        <div className="p-3 rounded-xl border bg-card">
          <p className="text-xs text-muted-foreground">Incidents récents</p>
          <p className="text-xl font-bold">{incidents.length}</p>
        </div>
      </div>

      {/* KTP Level Distribution */}
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(ktpLevels).map(([level, count]) => (
          <div key={level} className="p-2 rounded-lg border bg-card text-center">
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${ktpLevelColor(level)}`}>{level}</span>
            <p className="text-lg font-bold mt-1">{count}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="ktp">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="ktp">KTP Scores</TabsTrigger>
          <TabsTrigger value="sanctions">Sanctions ({activeSanctions})</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
        </TabsList>

        <TabsContent value="ktp" className="space-y-2 mt-3">
          {ktpData.slice(0, 30).map(ktp => (
            <div key={ktp.id} className="p-3 rounded-xl border bg-card">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{ktp.gp?.business_name || "—"}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${ktpLevelColor(ktp.ktp_level)}`}>{ktp.ktp_level}</span>
                </div>
                <span className={`text-lg font-bold ${scoreColor(ktp.trust_score)}`}>{ktp.trust_score}</span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-xs text-muted-foreground mt-1">
                <span>Com: {ktp.commission_rate}%</span>
                <span>Livraisons: {ktp.total_deliveries_evaluated}</span>
                <span>Ponctualité: {ktp.delivery_punctuality_score}%</span>
                <span>Scan: {ktp.scan_compliance_score}%</span>
                <span>Paiement: {ktp.payment_release_rule}</span>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="sanctions" className="space-y-2 mt-3">
          {sanctions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune sanction</p>
          ) : (
            sanctions.slice(0, 20).map(s => (
              <div key={s.id} className="p-3 rounded-xl border bg-card">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Ban className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium">{s.sanction_type}</span>
                    {s.is_active && <Badge variant="destructive" className="text-[10px]">Active</Badge>}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString("fr")}</span>
                </div>
                <p className="text-xs text-muted-foreground">{s.reason}</p>
                {s.ends_at && <p className="text-[10px] text-muted-foreground mt-1">Expire: {new Date(s.ends_at).toLocaleDateString("fr")}</p>}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="incidents" className="space-y-2 mt-3">
          {incidents.slice(0, 20).map(inc => (
            <div key={inc.id} className="p-3 rounded-xl border bg-card flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-sm font-medium">{inc.gp?.business_name || "—"}</span>
                  <span className="text-[10px] text-muted-foreground">{inc.incident_type}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{inc.description}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${inc.score_impact < 0 ? "text-red-600" : "text-green-600"}`}>
                  {inc.score_impact > 0 ? "+" : ""}{inc.score_impact}
                </p>
                <p className="text-[10px] text-muted-foreground">{inc.previous_score} → {inc.new_score}</p>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
