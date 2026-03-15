/**
 * AerienAutoRoutes — Suggested air routes based on demand analysis
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Plane, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface SuggestedRoute {
  origin: string;
  destination: string;
  demandCount: number;
  avgWeight: number;
  avgBudget: number;
}

interface AerienAutoRoutesProps {
  gpId: string;
  onCreateDeparture?: (origin: string, destination: string) => void;
}

export function AerienAutoRoutes({ gpId, onCreateDeparture }: AerienAutoRoutesProps) {
  const [routes, setRoutes] = useState<SuggestedRoute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSuggestions(); }, []);

  const loadSuggestions = async () => {
    try {
      const { data: requests } = await supabase
        .from("freight_requests")
        .select("origin_city, destination_city, weight_kg, declared_value")
        .eq("freight_mode", "air")
        .in("status", ["open", "has_responses", "pending"]);

      const { data: departures } = await supabase
        .from("air_departures" as any)
        .select("origin_city, destination_city")
        .eq("gp_id", gpId)
        .eq("status", "active");

      if (!requests) return;

      const existingCorridors = new Set(
        (departures as any[] || []).map((d: any) => `${d.origin_city?.toLowerCase()}-${d.destination_city?.toLowerCase()}`)
      );

      const corridorDemand = new Map<string, { origin: string; dest: string; count: number; totalWeight: number; totalBudget: number }>();

      requests.forEach(r => {
        const key = `${r.origin_city?.toLowerCase()}-${r.destination_city?.toLowerCase()}`;
        if (existingCorridors.has(key)) return;

        const existing = corridorDemand.get(key) || { origin: r.origin_city, dest: r.destination_city, count: 0, totalWeight: 0, totalBudget: 0 };
        existing.count++;
        existing.totalWeight += r.weight_kg || 0;
        existing.totalBudget += r.declared_value || 0;
        corridorDemand.set(key, existing);
      });

      const suggestions: SuggestedRoute[] = [];
      corridorDemand.forEach(v => {
        if (v.count >= 2) {
          suggestions.push({
            origin: v.origin,
            destination: v.dest,
            demandCount: v.count,
            avgWeight: v.count > 0 ? Math.round(v.totalWeight / v.count * 10) / 10 : 0,
            avgBudget: v.count > 0 ? Math.round(v.totalBudget / v.count) : 0,
          });
        }
      });

      suggestions.sort((a, b) => b.demandCount - a.demandCount);
      setRoutes(suggestions.slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || routes.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <h3 className="text-xs font-bold">Routes recommandées</h3>
      </div>
      <p className="text-[10px] text-muted-foreground">Corridors aériens à forte demande sans offre de votre part</p>

      <div className="space-y-1.5">
        {routes.map((route, idx) => (
          <motion.div key={`${route.origin}-${route.destination}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
            <Card className="cursor-pointer active:scale-[0.99] transition-all border-primary/20 hover:border-primary/40"
              onClick={() => onCreateDeparture?.(route.origin, route.destination)}>
              <CardContent className="p-2.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                  <Plane className="w-4 h-4 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{route.origin} → {route.destination}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-muted-foreground">{route.demandCount} demandes</span>
                    {route.avgWeight > 0 && <span className="text-[9px] text-muted-foreground">~{route.avgWeight} kg</span>}
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px] shrink-0 border-emerald-500/40 text-emerald-600">
                  <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> Forte demande
                </Badge>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}