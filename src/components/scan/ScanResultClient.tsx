/**
 * ScanResultClient - Read-only scan result for clients
 * 
 * Shows: status, route, GP, delivery estimate, scan history
 * Cannot modify anything. Uses ScanStatusBadge for consistent theming.
 */
import { motion } from "framer-motion";
import { Package, MapPin, History, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScanStatusBadge } from "./ScanStatusBadge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ScanResultClientProps {
  order: {
    id: string;
    order_number: string;
    status: string;
    weight: number;
    origin_city: string;
    destination_city: string;
    origin_country: string;
    destination_country: string;
    delivery_date: string | null;
    gp_name?: string | null;
    scan_history?: Array<{
      action: string;
      user_role: string;
      created_at: string;
    }>;
  };
}

const ACTION_LABELS: Record<string, string> = {
  view: "Consulté",
  deposit_confirm: "Dépôt confirmé",
  delivery_confirm: "Livraison confirmée",
  weight_modify: "Poids modifié",
  pickup_confirm: "Enlèvement confirmé",
  stock_confirm: "Réception stock",
};

const ROLE_LABELS: Record<string, string> = {
  client: "Client",
  gp: "Transporteur",
  agent_logistique: "Agent",
  admin: "Admin",
  system: "Système",
};

export function ScanResultClient({ order }: ScanResultClientProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-4 space-y-4"
    >
      {/* Read-only badge */}
      <Badge variant="outline" className="gap-1">
        <Eye className="w-3 h-3" />
        Consultation uniquement
      </Badge>

      {/* Order Info */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Commande</span>
            <span className="font-mono font-bold text-sm">{order.order_number}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Statut</span>
            <ScanStatusBadge status={order.status} />
          </div>
          <Separator />

          {/* Route visualization */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-primary ring-2 ring-primary/20" />
              <div className="w-0.5 h-8 bg-gradient-to-b from-primary to-success" />
              <div className="w-3 h-3 rounded-full bg-success ring-2 ring-success/20" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="font-medium text-sm">{order.origin_city}</p>
                <p className="text-xs text-muted-foreground">{order.origin_country}</p>
              </div>
              <div>
                <p className="font-medium text-sm">{order.destination_city}</p>
                <p className="text-xs text-muted-foreground">{order.destination_country}</p>
              </div>
            </div>
          </div>

          <Separator />
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Poids</p>
              <p className="font-semibold text-sm">{order.weight} kg</p>
            </div>
            {order.gp_name && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Transporteur</p>
                <p className="font-semibold text-sm">{order.gp_name}</p>
              </div>
            )}
          </div>

          {order.delivery_date && (
            <div className="p-2.5 rounded-lg bg-muted/50 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">Livraison estimée</p>
                <p className="text-sm font-medium">
                  {format(new Date(order.delivery_date), "d MMMM yyyy", { locale: fr })}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scan History */}
      {order.scan_history && order.scan_history.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">Historique des scans</h4>
            </div>
            <div className="space-y-2">
              {order.scan_history.slice(0, 10).map((scan, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                    <span className="font-medium">{ACTION_LABELS[scan.action] || scan.action}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                      {ROLE_LABELS[scan.user_role] || scan.user_role}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground">
                    {format(new Date(scan.created_at), "d/MM HH:mm", { locale: fr })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
