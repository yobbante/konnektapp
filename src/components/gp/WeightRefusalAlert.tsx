import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Ban, Package, X, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RefusedOrder {
  order_id: string;
  order_number: string;
  client_name: string | null;
  origin_city: string;
  destination_city: string;
  declared_weight: number;
  measured_weight: number;
  refused_at: string;
}

interface WeightRefusalAlertProps {
  gpId: string;
}

/**
 * WeightRefusalAlert - GP Dashboard Component
 * 
 * PRV Rule: When client refuses weight modification,
 * GP must be notified and blocked from handling the package.
 */
export function WeightRefusalAlert({ gpId }: WeightRefusalAlertProps) {
  const { toast } = useToast();
  const [refusals, setRefusals] = useState<RefusedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRefusals();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("weight-refusals")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `gp_id=eq.${gpId}`,
      }, () => loadRefusals())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gpId]);

  const loadRefusals = async () => {
    try {
      // Get recently cancelled orders due to weight refusal
      const { data: history, error } = await supabase
        .from("order_status_history")
        .select(`
          order_id,
          notes,
          created_at,
          orders!inner(
            order_number,
            origin_city,
            destination_city,
            weight,
            gp_id,
            client_id
          )
        `)
        .eq("status", "cancelled")
        .like("notes", "%CLIENT REFUSE%")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Filter for this GP's orders
      const gpRefusals = (history || []).filter(
        (h: any) => h.orders?.gp_id === gpId
      );

      // Build refusal list
      const refusalList: RefusedOrder[] = [];
      
      for (const entry of gpRefusals as any[]) {
        // Parse weights from notes
        const match = entry.notes?.match(/Poids déclaré:\s*([\d.]+)\s*kg.*Poids mesuré:\s*([\d.]+)\s*kg/);
        const declaredWeight = match ? parseFloat(match[1]) : entry.orders.weight;
        const measuredWeight = match ? parseFloat(match[2]) : entry.orders.weight;

        // Get client name
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", entry.orders.client_id)
          .single();

        refusalList.push({
          order_id: entry.order_id,
          order_number: entry.orders.order_number,
          client_name: profile?.full_name || null,
          origin_city: entry.orders.origin_city,
          destination_city: entry.orders.destination_city,
          declared_weight: declaredWeight,
          measured_weight: measuredWeight,
          refused_at: entry.created_at,
        });
      }

      // Only show refusals from last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentRefusals = refusalList.filter(
        r => new Date(r.refused_at) > oneDayAgo
      );

      setRefusals(recentRefusals);
    } catch (error) {
      console.error("Error loading weight refusals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (orderId: string) => {
    setDismissedIds(prev => new Set([...prev, orderId]));
    toast({
      title: "Alerte masquée",
      description: "N'oubliez pas de restituer le colis au client.",
    });
  };

  const handleAcknowledge = async (orderId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Log acknowledgement
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        status: "cancelled",
        changed_by: user?.id || "",
        changed_by_type: "gp",
        notes: "GP a pris connaissance du refus client. Colis à restituer.",
      });

      setDismissedIds(prev => new Set([...prev, orderId]));
      toast({
        title: "Pris en compte",
        description: "N'oubliez pas de restituer le colis au client.",
      });
    } catch (error) {
      console.error("Error acknowledging refusal:", error);
    }
  };

  const visibleRefusals = refusals.filter(r => !dismissedIds.has(r.order_id));

  if (loading || visibleRefusals.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {visibleRefusals.map((refusal) => (
        <motion.div
          key={refusal.order_id}
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="mb-4"
        >
          {/* CRITICAL ALERT BANNER */}
          <Alert variant="destructive" className="border-destructive bg-destructive/10">
            <Ban className="h-5 w-5" />
            <AlertTitle className="font-bold text-base">
              ❌ Envoi annulé par le client
            </AlertTitle>
            <AlertDescription className="text-sm">
              Le client a refusé la modification de poids. Ce colis ne doit PAS être pris en charge.
            </AlertDescription>
          </Alert>

          <Card className="border-destructive/50 bg-destructive/5 shadow-lg mt-2">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Warning Icon */}
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-12 h-12 rounded-full bg-destructive flex items-center justify-center flex-shrink-0"
                >
                  <AlertTriangle className="w-6 h-6 text-white" />
                </motion.div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono font-bold">{refusal.order_number}</span>
                    <Badge variant="destructive" className="text-xs">
                      ANNULÉ
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mb-2">
                    {refusal.origin_city} → {refusal.destination_city}
                    {refusal.client_name && ` • ${refusal.client_name}`}
                  </p>

                  {/* Weight info */}
                  <div className="p-2 bg-background rounded-lg mb-3 border border-destructive/20 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Poids déclaré:</span>
                      <span>{refusal.declared_weight} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Poids mesuré:</span>
                      <span className="text-destructive font-medium">{refusal.measured_weight} kg</span>
                    </div>
                  </div>

                  {/* Critical Instructions */}
                  <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30 mb-3">
                    <p className="text-sm font-medium text-destructive flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Actions requises:
                    </p>
                    <ul className="text-xs text-destructive/80 mt-1 space-y-1 pl-6 list-disc">
                      <li>Ne PAS prendre en charge ce colis</li>
                      <li>⛔ Scan invalide pour cette commande</li>
                      <li>↩️ Restituer le colis au client/expéditeur</li>
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDismiss(refusal.order_id)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Masquer
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleAcknowledge(refusal.order_id)}
                    >
                      J'ai compris
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
