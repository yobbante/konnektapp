import { Truck, Package, TrendingUp, Users, Clock, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AdminStats {
  totalGps: number;
  pendingGps: number;
  verifiedGps: number;
  suspendedGps: number;
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  commissions: number;
  avgRating: number;
}

interface AdminStatsCardsProps {
  stats: AdminStats;
}

export function AdminStatsCards({ stats }: AdminStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <div className="mobile-card">
        <div className="flex items-center gap-2 mb-1">
          <Truck className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">Transporteurs</span>
        </div>
        <p className="text-xl font-bold">{stats.totalGps}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {stats.pendingGps > 0 && (
            <Badge variant="default" className="text-xs">
              {stats.pendingGps} en attente
            </Badge>
          )}
          <Badge variant="success" className="text-xs">
            {stats.verifiedGps} vérifiés
          </Badge>
        </div>
      </div>

      <div className="mobile-card">
        <div className="flex items-center gap-2 mb-1">
          <Package className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">Commandes</span>
        </div>
        <p className="text-xl font-bold">{stats.totalOrders}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge variant="secondary" className="text-xs">
            {stats.pendingOrders} en cours
          </Badge>
          <Badge variant="success" className="text-xs">
            {stats.deliveredOrders} livrées
          </Badge>
        </div>
      </div>

      <div className="mobile-card">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">Revenus totaux</span>
        </div>
        <p className="text-xl font-bold">{stats.totalRevenue.toLocaleString()} FCFA</p>
      </div>

      <div className="mobile-card">
        <div className="flex items-center gap-2 mb-1">
          <Star className="w-4 h-4 text-warning" />
          <span className="text-xs text-muted-foreground">Note moyenne</span>
        </div>
        <p className="text-xl font-bold">{stats.avgRating.toFixed(1)}/5</p>
        <p className="text-xs text-muted-foreground mt-1">
          Commission: {stats.commissions.toLocaleString()} FCFA
        </p>
      </div>
    </div>
  );
}
