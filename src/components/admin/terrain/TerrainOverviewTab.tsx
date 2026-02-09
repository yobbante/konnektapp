/**
 * Terrain Overview — Real-time operational summary
 * Clickable stat cards that drill into filtered views.
 */
import { Package, Truck, MapPin, AlertTriangle, Users, Scale } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import type { TerrainStats, TerrainOrder } from "@/pages/AdminTerrainDashboard";

interface Props {
  stats: TerrainStats;
  orders: TerrainOrder[];
  onTabChange: (tab: string) => void;
  onRefresh: () => void;
}

export function TerrainOverviewTab({ stats, orders, onTabChange }: Props) {
  const cards = [
    { icon: Package, label: "À collecter", value: stats.colisACollecter, color: "bg-amber-500/15 text-amber-600 border-amber-500/30", tab: "colis" },
    { icon: Truck, label: "En transit", value: stats.colisEnTransit, color: "bg-blue-500/15 text-blue-600 border-blue-500/30", tab: "colis" },
    { icon: MapPin, label: "Arrivés", value: stats.colisArrives, color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", tab: "colis" },
    { icon: AlertTriangle, label: "Bloqués", value: stats.actionsBloques, color: "bg-red-500/15 text-red-600 border-red-500/30", tab: "alertes" },
    { icon: Users, label: "Agents actifs", value: stats.agentsActifs, color: "bg-purple-500/15 text-purple-600 border-purple-500/30", tab: "logistique" },
    { icon: Scale, label: "Litiges", value: stats.litiges, color: "bg-orange-500/15 text-orange-600 border-orange-500/30", tab: "alertes" },
  ];

  // Recent active orders (last 5)
  const recentActive = orders
    .filter(o => !["delivered", "cancelled"].includes(o.status))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card
              className={`border cursor-pointer active:scale-[0.97] transition-transform ${card.color}`}
              onClick={() => onTabChange(card.tab)}
            >
              <CardContent className="p-4">
                <card.icon className="w-6 h-6 mb-2 opacity-70" />
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs font-medium opacity-70">{card.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Active Orders */}
      {recentActive.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Derniers colis actifs</h3>
          {recentActive.map((order) => (
            <Card key={order.id} className="cursor-pointer active:scale-[0.98] transition-transform" onClick={() => onTabChange("colis")}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusDot status={order.status} />
                  <div>
                    <p className="font-mono text-sm font-bold">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.origin_city} → {order.destination_city}
                      {order.gp_name && ` · ${order.gp_name}`}
                    </p>
                  </div>
                </div>
                <StatusBadge status={order.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-amber-500",
    accepted: "bg-blue-500",
    collected: "bg-indigo-500",
    in_transit: "bg-purple-500",
    arrived: "bg-emerald-500",
    delivered: "bg-green-500",
  };
  return <div className={`w-2.5 h-2.5 rounded-full ${colors[status] || "bg-gray-400"}`} />;
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: "En attente",
    accepted: "Accepté",
    collected: "Collecté",
    in_transit: "Transit",
    arrived: "Arrivé",
    delivered: "Livré",
  };
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium">
      {labels[status] || status}
    </span>
  );
}
