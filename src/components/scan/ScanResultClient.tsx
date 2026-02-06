/**
 * ScanResultClient - Read-only scan result for clients
 * 
 * Shows: status, route, GP, delivery estimate, scan history
 * Cannot modify anything.
 */
import { motion } from "framer-motion";
import { Package, Truck, MapPin, Clock, CheckCircle, History, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-amber-100 text-amber-800" },
  accepted: { label: "Acceptée", color: "bg-blue-100 text-blue-800" },
  collected: { label: "Collecté", color: "bg-indigo-100 text-indigo-800" },
  in_transit: { label: "En transit", color: "bg-purple-100 text-purple-800" },
  delivered: { label: "Livré", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Annulé", color: "bg-red-100 text-red-800" },
};

const ACTION_LABELS: Record<string, string> = {
  view: "Consulté",
  deposit_confirm: "Dépôt confirmé",
  delivery_confirm: "Livraison confirmée",
  weight_modify: "Poids modifié",
  pickup_confirm: "Enlèvement confirmé",
  stock_confirm: "Réception stock",
};

export function ScanResultClient({ order }: ScanResultClientProps) {
  const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.pending;

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
      <Card className="bg-muted/50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Commande</span>
            <span className="font-mono font-bold">{order.order_number}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Statut</span>
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
          </div>
          <Separator />
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <div className="w-0.5 h-6 bg-gradient-to-b from-primary to-accent" />
              <div className="w-2.5 h-2.5 rounded-full bg-accent" />
            </div>
            <div className="flex-1 space-y-2">
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
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Poids déclaré</span>
            <span className="font-medium">{order.weight} kg</span>
          </div>
          {order.gp_name && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Transporteur</span>
              <span className="font-medium">{order.gp_name}</span>
            </div>
          )}
          {order.delivery_date && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Livraison estimée</span>
              <span className="font-medium">
                {format(new Date(order.delivery_date), "d MMM yyyy", { locale: fr })}
              </span>
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
                    <span>{ACTION_LABELS[scan.action] || scan.action}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      {scan.user_role}
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
