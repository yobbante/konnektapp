/**
 * Admin Assurance Module — Insurance management
 */
import { useState, useEffect } from "react";
import { Shield, TrendingUp, Users, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AdminInsuranceTiers } from "@/components/admin/AdminInsuranceTiers";

export function AdminAssuranceModule() {
  const [stats, setStats] = useState({ total: 0, insuredOrders: 0, claims: 0 });
  const [insuredOrders, setInsuredOrders] = useState<any[]>([]);

  useEffect(() => {
    loadInsuranceData();
  }, []);

  const loadInsuranceData = async () => {
    const { data: orders } = await supabase
      .from("orders")
      .select("id, order_number, insurance_amount, status, gp_id, gp_profile:gp_profiles(business_name)")
      .not("insurance_amount", "is", null)
      .gt("insurance_amount", 0)
      .order("created_at", { ascending: false })
      .limit(50);

    const all = orders || [];
    setInsuredOrders(all);
    setStats({
      total: all.reduce((s, o) => s + (o.insurance_amount || 0), 0),
      insuredOrders: all.length,
      claims: 0, // Future: link to disputes with insurance claims
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Shield className="w-5 h-5 text-teal-500" />
        Assurance
      </h2>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl border bg-card">
          <p className="text-xs text-muted-foreground">Total collecté</p>
          <p className="text-lg font-bold">{(stats.total / 1000).toFixed(0)}k <span className="text-xs font-normal text-muted-foreground">FCFA</span></p>
        </div>
        <div className="p-3 rounded-xl border bg-card">
          <p className="text-xs text-muted-foreground">Colis assurés</p>
          <p className="text-lg font-bold">{stats.insuredOrders}</p>
        </div>
        <div className="p-3 rounded-xl border bg-card">
          <p className="text-xs text-muted-foreground">Sinistres</p>
          <p className="text-lg font-bold">{stats.claims}</p>
        </div>
      </div>

      {/* Insurance Tiers Config */}
      <AdminInsuranceTiers />

      {/* Insured Orders List */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Colis assurés récents</h3>
        {insuredOrders.slice(0, 15).map(o => (
          <div key={o.id} className="p-3 rounded-xl border bg-card flex items-center justify-between">
            <div>
              <span className="font-mono text-sm font-medium">{o.order_number}</span>
              <p className="text-xs text-muted-foreground">{(o as any).gp_profile?.business_name || "—"}</p>
            </div>
            <p className="font-bold text-sm">{o.insurance_amount?.toLocaleString()} FCFA</p>
          </div>
        ))}
      </div>
    </div>
  );
}