/**
 * AerienConsolidationCard — Smart cargo consolidation view
 * Groups multiple client requests into consolidated air shipments
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plane, Users, Package, TrendingUp, ChevronRight, Zap, Scale } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ConsolidationGroup {
  corridor: string;
  originCity: string;
  destCity: string;
  requests: any[];
  totalWeight: number;
  clientCount: number;
  fillPercent: number;
}

interface AerienConsolidationCardProps {
  gpId: string;
  onCreateDeparture?: (corridor: ConsolidationGroup) => void;
}

const MAX_CARGO_KG = 500; // typical consolidated air cargo batch

export function AerienConsolidationCard({ gpId, onCreateDeparture }: AerienConsolidationCardProps) {
  const [groups, setGroups] = useState<ConsolidationGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadConsolidation(); }, []);

  const loadConsolidation = async () => {
    try {
      const { data } = await supabase
        .from("freight_requests")
        .select("*")
        .eq("freight_mode", "air")
        .in("status", ["open", "has_responses", "pending"])
        .order("created_at", { ascending: false });

      if (!data) return;

      const corridorMap = new Map<string, any[]>();
      data.forEach(req => {
        const key = `${req.origin_city?.toLowerCase()}-${req.destination_city?.toLowerCase()}`;
        const existing = corridorMap.get(key) || [];
        existing.push(req);
        corridorMap.set(key, existing);
      });

      const consolidations: ConsolidationGroup[] = [];
      corridorMap.forEach((requests, key) => {
        if (requests.length >= 2) {
          const totalWeight = requests.reduce((sum: number, r: any) => sum + (r.weight_kg || 0), 0);
          const uniqueClients = new Set(requests.map((r: any) => r.client_id)).size;

          consolidations.push({
            corridor: key,
            originCity: requests[0].origin_city,
            destCity: requests[0].destination_city,
            requests,
            totalWeight,
            clientCount: uniqueClients,
            fillPercent: Math.min(100, Math.round((totalWeight / MAX_CARGO_KG) * 100)),
          });
        }
      });

      consolidations.sort((a, b) => b.clientCount - a.clientCount);
      setGroups(consolidations.slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || groups.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5 text-amber-500" />
        <h3 className="text-xs font-bold">Smart Consolidation Cargo</h3>
        <Badge variant="secondary" className="text-[9px] h-4">{groups.length} corridors</Badge>
      </div>

      {groups.map((group, idx) => (
        <motion.div key={group.corridor} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
          <Card className="border-amber-500/20 bg-amber-50/30 dark:bg-amber-900/10 cursor-pointer active:scale-[0.99] transition-all"
            onClick={() => onCreateDeparture?.(group)}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Plane className="w-4 h-4 text-violet-600" />
                  <span className="text-xs font-semibold">{group.originCity} → {group.destCity}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </div>

              <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {group.clientCount} clients</span>
                <span className="flex items-center gap-1"><Scale className="w-3 h-3" /> {group.totalWeight.toFixed(1)} kg</span>
                <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {group.requests.length} demandes</span>
              </div>

              {/* Fill gauge */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Charge groupée</span>
                  <span className="font-bold text-primary">{group.fillPercent}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      group.fillPercent >= 80 ? "bg-emerald-500" : group.fillPercent >= 50 ? "bg-amber-500" : "bg-primary"
                    )}
                    style={{ width: `${Math.max(5, group.fillPercent)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}