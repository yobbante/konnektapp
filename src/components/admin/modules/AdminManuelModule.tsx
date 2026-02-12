/**
 * Admin Manuel Module — Manual parcels analytics
 */
import { useState, useEffect, useMemo } from "react";
import { PackageOpen, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export function AdminManuelModule() {
  const [parcels, setParcels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("manual_parcels")
      .select("*, gp:gp_profiles(business_name, city)")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setParcels(data || []);
        setLoading(false);
      });
  }, []);

  const totalCommission = parcels.reduce((s, p) => s + (p.commission_amount || 0), 0);
  const totalVolume = parcels.reduce((s, p) => s + (p.amount_paid || 0), 0);

  // GP with too many manual parcels
  const gpManualCounts = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {};
    parcels.forEach(p => {
      const key = p.gp_id;
      if (!counts[key]) counts[key] = { name: p.gp?.business_name || "—", count: 0 };
      counts[key].count++;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [parcels]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <PackageOpen className="w-5 h-5 text-orange-500" />
        Colis Manuel (Hors Plateforme)
        <Badge variant="secondary" className="text-xs">{parcels.length}</Badge>
      </h2>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl border bg-card">
          <p className="text-xs text-muted-foreground">Volume total</p>
          <p className="text-lg font-bold">{totalVolume.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">FCFA</span></p>
        </div>
        <div className="p-3 rounded-xl border bg-card">
          <p className="text-xs text-muted-foreground">Commission 3%</p>
          <p className="text-lg font-bold text-green-600">{totalCommission.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">FCFA</span></p>
        </div>
        <div className="p-3 rounded-xl border bg-card">
          <p className="text-xs text-muted-foreground">Nb. colis</p>
          <p className="text-lg font-bold">{parcels.length}</p>
        </div>
      </div>

      {/* GP Abuse Detection */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          GP avec volume manuel élevé
        </h3>
        {gpManualCounts.slice(0, 10).map((gp, i) => (
          <div key={i} className="p-3 rounded-xl border bg-card flex items-center justify-between">
            <span className="text-sm font-medium">{gp.name}</span>
            <Badge variant={gp.count > 10 ? "destructive" : "secondary"} className="text-xs">
              {gp.count} colis
            </Badge>
          </div>
        ))}
      </div>

      {/* Recent Manual Parcels */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Colis manuels récents</h3>
        {parcels.slice(0, 20).map(p => (
          <div key={p.id} className="p-3 rounded-xl border bg-card">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-sm">{p.order_number}</span>
              <span className="font-bold text-sm">{p.amount_paid?.toLocaleString()} {p.currency}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{p.origin_city} → {p.destination_city} · {p.weight}kg</span>
              <span>{p.gp?.business_name || "—"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}