/**
 * MissionStatusUpdater - GP updates mission/order status through workflow
 * Handles: accepted → collected → in_transit → delivered flow for routier missions
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Truck, Package, MapPin, Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface MissionStatusUpdaterProps {
  orderId: string;
  currentStatus: string;
  orderNumber: string;
  originCity: string;
  destinationCity: string;
  onStatusChange?: () => void;
}

const WORKFLOW_STEPS = [
  { key: "accepted", label: "Accepté", icon: Check, color: "bg-blue-500" },
  { key: "checked_in", label: "Déposé", icon: Package, color: "bg-amber-500" },
  { key: "in_transit", label: "En route", icon: Truck, color: "bg-purple-500" },
  { key: "arrived_destination", label: "Arrivé", icon: MapPin, color: "bg-cyan-500" },
  { key: "delivery_pending", label: "Livraison", icon: Truck, color: "bg-orange-500" },
  { key: "delivery_confirmed", label: "Livré", icon: Check, color: "bg-green-500" },
];

const getNextStatus = (current: string): string | null => {
  const flow = WORKFLOW_STEPS.map(s => s.key);
  const idx = flow.indexOf(current);
  if (idx >= 0 && idx < flow.length - 1) return flow[idx + 1];
  return null;
};

export function MissionStatusUpdater({
  orderId, currentStatus, orderNumber, originCity, destinationCity, onStatusChange
}: MissionStatusUpdaterProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const nextStatus = getNextStatus(currentStatus);
  const currentIdx = WORKFLOW_STEPS.findIndex(s => s.key === currentStatus);

  const handleAdvance = async () => {
    if (!nextStatus) return;
    setLoading(true);
    try {
      // For checked_in (deposit confirmation), redirect to scan page
      if (nextStatus === "checked_in") {
        navigate(`/gp/scan?order=${orderId}`);
        return;
      }

      // For delivery steps, redirect to scan page
      if (nextStatus === "delivery_pending" || nextStatus === "delivery_confirmed") {
        navigate(`/gp/scan?order=${orderId}`);
        return;
      }

      const { error } = await supabase
        .from("orders")
        .update({ status: nextStatus } as any)
        .eq("id", orderId);

      if (error) throw error;

      toast({ title: `Statut mis à jour: ${WORKFLOW_STEPS.find(s => s.key === nextStatus)?.label}` });
      onStatusChange?.();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Order header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-muted-foreground">{orderNumber}</p>
            <p className="text-sm font-semibold">{originCity} → {destinationCity}</p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {WORKFLOW_STEPS.find(s => s.key === currentStatus)?.label || currentStatus}
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-1">
          {WORKFLOW_STEPS.map((step, idx) => {
            const isComplete = idx <= currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <div key={step.key} className="flex-1 flex flex-col items-center">
                <motion.div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] ${
                    isComplete ? step.color : "bg-muted"
                  } ${isCurrent ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                  animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <step.icon className="w-3 h-3" />
                </motion.div>
                <span className={`text-[8px] mt-1 ${isComplete ? "text-foreground" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action button */}
        {nextStatus && (
          <Button className="w-full" onClick={handleAdvance} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : nextStatus === "delivery_pending" || nextStatus === "delivery_confirmed" ? (
              <QrCode className="w-4 h-4 mr-2" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            {nextStatus === "delivery_pending" || nextStatus === "delivery_confirmed"
              ? "Scanner pour livraison"
              : `Passer à: ${WORKFLOW_STEPS.find(s => s.key === nextStatus)?.label}`}
          </Button>
        )}

        {currentStatus === "delivery_confirmed" && (
          <div className="text-center text-green-600 font-medium text-sm">
            Mission terminee — fonds en cours de liberation
          </div>
        )}
      </CardContent>
    </Card>
  );
}
