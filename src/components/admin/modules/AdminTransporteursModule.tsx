/**
 * Admin Transporteurs Module — Manages ALL transporter types
 * GP, Routier, Maritime, Aérien, Mobility, Express, Agence
 */
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Ship, Plane, Car, Luggage, Zap, Building2, Users, Search, Eye, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { MiniLoader } from "@/components/ui/MiniLoader";

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Truck; color: string }> = {
  bagages_international: { label: "GP Bagages", icon: Luggage, color: "text-violet-500" },
  voyageur: { label: "Voyageur", icon: Users, color: "text-blue-500" },
  routier: { label: "Routier", icon: Truck, color: "text-orange-500" },
  maritime: { label: "Maritime", icon: Ship, color: "text-cyan-500" },
  aerien: { label: "Aérien", icon: Plane, color: "text-indigo-500" },
  express: { label: "Coursier", icon: Zap, color: "text-yellow-500" },
  agence: { label: "Agence", icon: Building2, color: "text-pink-500" },
};

type TypeFilter = "all" | string;

export function AdminTransporteursModule({ searchQuery }: { searchQuery: string }) {
  const navigate = useNavigate();
  const [gps, setGps] = useState<any[]>([]);
  const [mobilityProfiles, setMobilityProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [localSearch, setLocalSearch] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [gpRes, mobRes] = await Promise.all([
      supabase.from("gp_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("mobility_profiles").select("*").order("created_at", { ascending: false }),
    ]);
    setGps(gpRes.data || []);
    setMobilityProfiles(mobRes.data || []);
    setLoading(false);
  };

  const search = searchQuery || localSearch;

  // Combine all transporters into a unified list
  const allTransporters = useMemo(() => {
    const gpList = gps.map(gp => ({
      id: gp.id,
      name: gp.business_name,
      type: gp.gp_type,
      city: gp.city,
      country: gp.country_code,
      status: gp.status,
      rating: gp.rating,
      deliveries: gp.total_deliveries,
      phone: gp.phone,
      created_at: gp.created_at,
      source: "gp" as const,
    }));

    const mobList = mobilityProfiles.map(mp => ({
      id: mp.id,
      name: mp.business_name,
      type: "mobility",
      city: mp.base_city,
      country: mp.country_code,
      status: mp.status,
      rating: mp.rating || 0,
      deliveries: mp.total_trips || 0,
      phone: mp.phone,
      created_at: mp.created_at,
      source: "mobility" as const,
    }));

    return [...gpList, ...mobList];
  }, [gps, mobilityProfiles]);

  const filtered = useMemo(() => {
    let result = allTransporters;
    if (typeFilter !== "all") result = result.filter(t => t.type === typeFilter);
    if (statusFilter !== "all") result = result.filter(t => t.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.name?.toLowerCase().includes(q) ||
        t.city?.toLowerCase().includes(q) ||
        t.phone?.includes(q)
      );
    }
    return result;
  }, [allTransporters, typeFilter, statusFilter, search]);

  // Stats by type
  const typeStats = useMemo(() => {
    const stats: Record<string, number> = { all: allTransporters.length, mobility: 0 };
    allTransporters.forEach(t => {
      stats[t.type] = (stats[t.type] || 0) + 1;
    });
    return stats;
  }, [allTransporters]);

  if (loading) return <div className="py-12 text-center"><MiniLoader /></div>;

  return (
    <div className="space-y-4">
      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTypeFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            typeFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border hover:bg-muted/80"
          }`}
        >
          Tous ({typeStats.all})
        </button>
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${
                typeFilter === key ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border hover:bg-muted/80"
              }`}
            >
              <Icon className="w-3 h-3" />
              {cfg.label} ({typeStats[key] || 0})
            </button>
          );
        })}
        <button
          onClick={() => setTypeFilter("mobility")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${
            typeFilter === "mobility" ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border hover:bg-muted/80"
          }`}
        >
          <Car className="w-3 h-3" />
          Mobility ({typeStats.mobility || 0})
        </button>
      </div>

      {/* Status filter + search */}
      <div className="flex gap-2">
        <div className="flex gap-1">
          {["all", "pending", "verified", "suspended"].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2 py-1 rounded text-[10px] font-medium ${
                statusFilter === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {s === "all" ? "Tous" : s === "pending" ? "En attente" : s === "verified" ? "Vérifié" : "Suspendu"}
            </button>
          ))}
        </div>
        <Input
          placeholder="Rechercher..."
          value={localSearch}
          onChange={e => setLocalSearch(e.target.value)}
          className="h-8 text-xs flex-1"
        />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card><CardContent className="p-2 text-center">
          <p className="text-lg font-bold">{allTransporters.length}</p>
          <p className="text-[9px] text-muted-foreground">Total</p>
        </CardContent></Card>
        <Card><CardContent className="p-2 text-center">
          <p className="text-lg font-bold text-amber-500">{allTransporters.filter(t => t.status === "pending").length}</p>
          <p className="text-[9px] text-muted-foreground">En attente</p>
        </CardContent></Card>
        <Card><CardContent className="p-2 text-center">
          <p className="text-lg font-bold text-green-500">{allTransporters.filter(t => t.status === "verified").length}</p>
          <p className="text-[9px] text-muted-foreground">Vérifiés</p>
        </CardContent></Card>
        <Card><CardContent className="p-2 text-center">
          <p className="text-lg font-bold text-red-500">{allTransporters.filter(t => t.status === "suspended").length}</p>
          <p className="text-[9px] text-muted-foreground">Suspendus</p>
        </CardContent></Card>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">
            Aucun transporteur trouvé
          </CardContent></Card>
        ) : filtered.slice(0, 50).map(t => {
          const cfg = TYPE_CONFIG[t.type] || { label: t.type, icon: Truck, color: "text-muted-foreground" };
          const Icon = t.type === "mobility" ? Car : cfg.icon;
          return (
            <Card key={`${t.source}-${t.id}`} className="hover:border-primary/20 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      t.type === "mobility" ? "bg-transport-mobility/10" : "bg-muted"
                    }`}>
                      <Icon className={`w-4 h-4 ${t.type === "mobility" ? "text-transport-mobility" : cfg.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{t.name}</p>
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 shrink-0">
                          {t.type === "mobility" ? "Mobility" : cfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{t.city}</span>
                        {t.rating > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 text-amber-500" />
                            {t.rating.toFixed(1)}
                          </span>
                        )}
                        <span>{t.deliveries} {t.type === "mobility" ? "trajets" : "livraisons"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={
                      t.status === "verified" ? "bg-green-500/10 text-green-600 border-0" :
                      t.status === "pending" ? "bg-amber-500/10 text-amber-600 border-0" :
                      t.status === "suspended" ? "bg-red-500/10 text-red-600 border-0" :
                      "bg-muted text-muted-foreground border-0"
                    }>
                      {t.status === "verified" ? "Vérifié" :
                       t.status === "pending" ? "En attente" :
                       t.status === "suspended" ? "Suspendu" : t.status}
                    </Badge>
                    {t.source === "gp" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => navigate(`/admin/gp/${t.id}`)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length > 50 && (
          <p className="text-xs text-center text-muted-foreground py-2">
            Affichage limité à 50 / {filtered.length} résultats
          </p>
        )}
      </div>
    </div>
  );
}
