/**
 * Terrain Alertes Tab — Prioritized alerts and disputes.
 */
import { useState, useEffect } from "react";
import { AlertTriangle, Scale, ScanLine, UserX, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import type { TerrainOrder } from "@/pages/AdminTerrainDashboard";

interface Props {
  orders: TerrainOrder[];
  onRefresh: () => void;
}

interface Alert {
  id: string;
  type: "weight" | "unconfirmed" | "scan_error" | "external_pending" | "dispute";
  icon: any;
  title: string;
  description: string;
  orderId?: string;
  severity: "high" | "medium" | "low";
  action?: string;
}

export function TerrainAlertesTab({ orders, onRefresh }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadAlerts();
  }, [orders]);

  const loadAlerts = async () => {
    setLoading(true);
    const alertList: Alert[] = [];

    // Weight disputed orders
    const weightDisputed = orders.filter(o => o.logistics_status === "weight_disputed");
    weightDisputed.forEach(o => {
      alertList.push({
        id: `weight-${o.id}`,
        type: "weight",
        icon: Scale,
        title: "Poids modifié — validation client requise",
        description: `${o.order_number} · ${o.origin_city} → ${o.destination_city}`,
        orderId: o.id,
        severity: "high",
        action: "Voir détails",
      });
    });

    // Unconfirmed deliveries (arrived > 24h ago)
    const arrived = orders.filter(o => o.status === "arrived");
    arrived.forEach(o => {
      alertList.push({
        id: `unconfirmed-${o.id}`,
        type: "unconfirmed",
        icon: Clock,
        title: "Colis arrivé — non confirmé",
        description: `${o.order_number} · En attente de remise`,
        orderId: o.id,
        severity: "medium",
        action: "Voir",
      });
    });

    // External recipients without confirmation
    const externalPending = orders.filter(o => 
      !o.recipient_name && o.delivery_code && o.status === "arrived"
    );
    externalPending.forEach(o => {
      alertList.push({
        id: `external-${o.id}`,
        type: "external_pending",
        icon: UserX,
        title: "Destinataire externe non validé",
        description: `${o.order_number} · Code remise: ${o.delivery_code}`,
        orderId: o.id,
        severity: "medium",
      });
    });

    // Fetch disputes
    try {
      const { data } = await supabase
        .from("disputes")
        .select("id, dispute_number, status, category, description, order_id")
        .in("status", ["open", "under_review", "awaiting_response"])
        .order("created_at", { ascending: false })
        .limit(20);

      setDisputes(data || []);
      (data || []).forEach(d => {
        alertList.push({
          id: `dispute-${d.id}`,
          type: "dispute",
          icon: AlertTriangle,
          title: `Litige ${d.dispute_number}`,
          description: d.description?.slice(0, 60) || d.category,
          orderId: d.order_id,
          severity: "high",
          action: "Arbitrer",
        });
      });
    } catch (err) {
      console.error("Error loading disputes:", err);
    }

    // Sort by severity
    const severityOrder = { high: 0, medium: 1, low: 2 };
    alertList.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    setAlerts(alertList);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const severityColor = {
    high: "border-l-red-500",
    medium: "border-l-amber-500",
    low: "border-l-blue-500",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{alerts.length} alerte{alerts.length !== 1 ? "s" : ""}</p>
        <Button variant="ghost" size="sm" onClick={onRefresh} className="text-xs">
          Actualiser
        </Button>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucune alerte active</p>
            <p className="text-xs text-muted-foreground mt-1">Tout est sous contrôle ✓</p>
          </CardContent>
        </Card>
      ) : (
        alerts.map(alert => (
          <Card
            key={alert.id}
            className={`border-l-4 ${severityColor[alert.severity]} cursor-pointer active:scale-[0.98] transition-transform`}
            onClick={() => alert.orderId && navigate(`/admin/order/${alert.orderId}`)}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  alert.severity === "high" ? "bg-red-500/10" : "bg-amber-500/10"
                }`}>
                  <alert.icon className={`w-4 h-4 ${
                    alert.severity === "high" ? "text-red-500" : "text-amber-500"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                </div>
                {alert.severity === "high" && (
                  <Badge variant="destructive" className="text-[10px]">Urgent</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
