import { useState, useEffect } from "react";
import { TrendingUp, Calendar, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subDays, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

interface PriceHistoryEntry {
  id: string;
  gp_id: string;
  price_per_kg: number;
  currency: string;
  origin_city: string;
  destination_city: string;
  recorded_at: string;
}

interface GPProfile {
  id: string;
  business_name: string;
}

const PERIODS = [
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "3 mois" },
  { value: "365d", label: "1 an" },
];

export function GPPriceHistoryChart() {
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [gpProfiles, setGpProfiles] = useState<GPProfile[]>([]);
  const [selectedGp, setSelectedGp] = useState<string>("all");
  const [period, setPeriod] = useState("30d");
  const [loading, setLoading] = useState(true);

  const getStartDate = () => {
    const days = parseInt(period);
    if (period.includes("d")) return subDays(new Date(), days);
    return subMonths(new Date(), parseInt(period) / 30);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch GP profiles
      const { data: profiles } = await supabase
        .from("gp_profiles")
        .select("id, business_name")
        .order("business_name");
      
      if (profiles) setGpProfiles(profiles);

      // Fetch price history
      let query = supabase
        .from("gp_price_history")
        .select("*")
        .gte("recorded_at", getStartDate().toISOString())
        .order("recorded_at", { ascending: true });

      if (selectedGp !== "all") {
        query = query.eq("gp_id", selectedGp);
      }

      const { data: historyData } = await query;
      if (historyData) setHistory(historyData);
      
      setLoading(false);
    };

    fetchData();
  }, [selectedGp, period]);

  // Transform data for chart
  const chartData = history.reduce((acc, entry) => {
    const date = format(new Date(entry.recorded_at), "dd/MM", { locale: fr });
    const existing = acc.find(d => d.date === date);
    
    if (existing) {
      existing.avgPrice = (existing.avgPrice * existing.count + entry.price_per_kg) / (existing.count + 1);
      existing.count++;
      existing.minPrice = Math.min(existing.minPrice, entry.price_per_kg);
      existing.maxPrice = Math.max(existing.maxPrice, entry.price_per_kg);
    } else {
      acc.push({
        date,
        avgPrice: entry.price_per_kg,
        minPrice: entry.price_per_kg,
        maxPrice: entry.price_per_kg,
        count: 1,
      });
    }
    return acc;
  }, [] as { date: string; avgPrice: number; minPrice: number; maxPrice: number; count: number }[]);

  // Calculate stats
  const stats = {
    avgPrice: history.length ? (history.reduce((sum, h) => sum + h.price_per_kg, 0) / history.length).toFixed(2) : 0,
    minPrice: history.length ? Math.min(...history.map(h => h.price_per_kg)) : 0,
    maxPrice: history.length ? Math.max(...history.map(h => h.price_per_kg)) : 0,
    totalEntries: history.length,
  };

  // Get unique routes
  const routes = [...new Set(history.map(h => `${h.origin_city} → ${h.destination_city}`))];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5" />
            Historique des prix
          </CardTitle>
          <div className="flex gap-2">
            <Select value={selectedGp} onValueChange={setSelectedGp}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Tous les GP" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Tous les GP</SelectItem>
                {gpProfiles.map(gp => (
                  <SelectItem key={gp.id} value={gp.id}>
                    {gp.business_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[120px] h-9">
                <Calendar className="w-4 h-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {PERIODS.map(p => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="p-3 bg-muted rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Prix moyen</p>
            <p className="text-lg font-bold">{stats.avgPrice} €/kg</p>
          </div>
          <div className="p-3 bg-green-500/10 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Min</p>
            <p className="text-lg font-bold text-green-600">{stats.minPrice} €</p>
          </div>
          <div className="p-3 bg-red-500/10 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Max</p>
            <p className="text-lg font-bold text-red-600">{stats.maxPrice} €</p>
          </div>
          <div className="p-3 bg-primary/10 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Entrées</p>
            <p className="text-lg font-bold">{stats.totalEntries}</p>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  className="text-muted-foreground"
                  label={{ value: '€/kg', angle: -90, position: 'insideLeft', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="avgPrice" 
                  name="Prix moyen"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="minPrice" 
                  name="Min"
                  stroke="hsl(var(--success, 142 76% 36%))" 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="maxPrice" 
                  name="Max"
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            {loading ? "Chargement..." : "Aucune donnée pour cette période"}
          </div>
        )}

        {/* Routes covered */}
        {routes.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Trajets concernés</p>
            <div className="flex flex-wrap gap-1.5">
              {routes.slice(0, 8).map((route, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {route}
                </Badge>
              ))}
              {routes.length > 8 && (
                <Badge variant="secondary" className="text-xs">
                  +{routes.length - 8} autres
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
