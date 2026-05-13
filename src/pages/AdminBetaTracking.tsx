// Admin Beta Tracking Dashboard — funnel + cohortes + GP list + chart 30j.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, TrendingUp, Users, Send, MousePointerClick } from "lucide-react";

interface Event {
  id: string;
  event_type: string;
  source: string | null;
  session_id: string | null;
  gp_id: string | null;
  user_id: string | null;
  metadata: any;
  created_at: string;
}

interface GPRow {
  id: string;
  business_name: string;
  city: string | null;
  status: string | null;
  created_at: string;
  total_deliveries: number | null;
}

const EVENT_LABELS: Record<string, string> = {
  cta_start: "Clic Commencer",
  form_view: "Vue formulaire",
  departure_published: "Départ publié",
  interest_clicked: "Intéressé",
};

type GPFilter = "all" | "registered" | "not_registered";

export default function AdminBetaTracking() {
  const [events, setEvents] = useState<Event[]>([]);
  const [gps, setGps] = useState<GPRow[]>([]);
  const [gpFilter, setGpFilter] = useState<GPFilter>("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: ev }, { data: g }] = await Promise.all([
      supabase
        .from("beta_tracking_events" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000),
      supabase
        .from("gp_profiles")
        .select("id, business_name, city, status, created_at, total_deliveries")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    setEvents((ev as unknown as Event[]) || []);
    setGps((g as unknown as GPRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Inscriptions par jour sur 30 derniers jours
  const dailyChart = useMemo(() => {
    const days: { day: string; count: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = gps.filter((g) => g.created_at?.slice(0, 10) === key).length;
      days.push({ day: key, count });
    }
    return days;
  }, [gps]);

  const filteredGps = useMemo(() => {
    if (gpFilter === "registered") return gps.filter((g) => g.status === "verified" || g.status === "active");
    if (gpFilter === "not_registered") return gps.filter((g) => !g.status || g.status === "pending");
    return gps;
  }, [gps, gpFilter]);

  const conversionRate = gps.length
    ? Math.round((gps.filter((g) => g.status === "verified" || g.status === "active").length / gps.length) * 100)
    : 0;

  const totalMissions = gps.reduce((s, g) => s + (g.total_deliveries || 0), 0);

  const funnel = useMemo(() => {
    const distinct = (type: string) => new Set(
      events.filter((e) => e.event_type === type).map((e) => e.session_id || e.user_id || e.id)
    ).size;
    const start = distinct("cta_start");
    const view = distinct("form_view");
    const pub = distinct("departure_published");
    const interest = distinct("interest_clicked");
    const activation = start ? Math.round((pub / start) * 100) : 0;
    return { start, view, pub, interest, activation };
  }, [events]);

  const sources = useMemo(() => {
    const map = new Map<string, { start: number; pub: number; interest: number }>();
    for (const e of events) {
      const src = e.source || "direct";
      if (!map.has(src)) map.set(src, { start: 0, pub: 0, interest: 0 });
      const row = map.get(src)!;
      if (e.event_type === "cta_start") row.start++;
      if (e.event_type === "departure_published") row.pub++;
      if (e.event_type === "interest_clicked") row.interest++;
    }
    return Array.from(map.entries())
      .map(([src, v]) => ({ src, ...v, rate: v.start ? Math.round((v.pub / v.start) * 100) : 0 }))
      .sort((a, b) => b.start - a.start);
  }, [events]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Beta Tracking</h1>
          <p className="text-sm text-muted-foreground">Funnel transporteurs · Cohortes par source</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Actualiser
        </Button>
      </header>

      {loading && events.length === 0 ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <>
          {/* Funnel */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Kpi icon={<MousePointerClick className="w-4 h-4" />} label="Clic Commencer" value={funnel.start} />
            <Kpi icon={<Users className="w-4 h-4" />} label="Vue formulaire" value={funnel.view} />
            <Kpi icon={<Send className="w-4 h-4" />} label="Départ publié" value={funnel.pub} />
            <Kpi icon={<TrendingUp className="w-4 h-4" />} label="Intéressé" value={funnel.interest} />
            <Kpi icon={<TrendingUp className="w-4 h-4" />} label="Activation %" value={`${funnel.activation}%`} highlight />
          </div>

          {/* Cohorts */}
          <Card className="p-4 mb-6">
            <h2 className="text-sm font-semibold mb-3">Cohortes par source</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-left py-2">Source</th>
                    <th className="text-right py-2">Clic</th>
                    <th className="text-right py-2">Publié</th>
                    <th className="text-right py-2">Intéressé</th>
                    <th className="text-right py-2">Activation</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-4 text-muted-foreground">Aucune donnée</td></tr>
                  ) : sources.map((s) => (
                    <tr key={s.src} className="border-b last:border-0">
                      <td className="py-2"><Badge variant="outline">{s.src}</Badge></td>
                      <td className="text-right">{s.start}</td>
                      <td className="text-right">{s.pub}</td>
                      <td className="text-right">{s.interest}</td>
                      <td className="text-right font-semibold">{s.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Recent events */}
          <Card className="p-4">
            <h2 className="text-sm font-semibold mb-3">Évènements récents</h2>
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {events.slice(0, 100).map((e) => (
                <div key={e.id} className="flex items-center justify-between text-xs border-b last:border-0 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="secondary" className="text-[10px]">{EVENT_LABELS[e.event_type] || e.event_type}</Badge>
                    <span className="text-muted-foreground truncate">{e.source || "direct"}</span>
                  </div>
                  <span className="text-muted-foreground shrink-0">{new Date(e.created_at).toLocaleString("fr-FR")}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: number | string; highlight?: boolean }) {
  return (
    <Card className={`p-4 ${highlight ? "bg-primary/5 border-primary/20" : ""}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">{icon}{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </Card>
  );
}
