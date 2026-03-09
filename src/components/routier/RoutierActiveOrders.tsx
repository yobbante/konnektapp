/**
 * RoutierActiveOrders - Active routier orders with status workflow
 * Replaces the basic RoutierEnCoursPage content with mission-aware tracking
 */
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MissionStatusUpdater } from "./MissionStatusUpdater";
import { cn } from "@/lib/utils";

interface RoutierActiveOrdersProps {
  gpId: string;
}

export function RoutierActiveOrders({ gpId }: RoutierActiveOrdersProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("gp_id", gpId)
        .in("status", ["accepted", "collected", "checked_in", "in_transit", "arrived_destination", "delivery_pending"])
        .order("created_at", { ascending: false });

      if (!error) setOrders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [gpId]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("routier-active-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `gp_id=eq.${gpId}` }, () => loadOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gpId, loadOrders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Transports en cours</h2>
          <p className="text-xs text-muted-foreground">{orders.length} transport{orders.length !== 1 ? "s" : ""} actif{orders.length !== 1 ? "s" : ""}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => loadOrders(true)} disabled={refreshing}>
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Truck className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Aucun transport actif</h3>
            <p className="text-sm text-muted-foreground">
              Acceptez des missions pour les voir ici.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <MissionStatusUpdater
              key={order.id}
              orderId={order.id}
              currentStatus={order.status}
              orderNumber={order.order_number || "—"}
              originCity={order.origin_city}
              destinationCity={order.destination_city}
              onStatusChange={() => loadOrders()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
