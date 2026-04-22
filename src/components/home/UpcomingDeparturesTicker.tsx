import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plane, Ship, Truck, AlertCircle, RefreshCw, Filter, Package, Weight, Calendar as CalIcon, MapPin } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

interface Departure {
  id: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  departure_date: string;
  available_capacity: number;
  total_capacity: number;
  currency: string;
  price_per_kg: number;
  transport_type: string;
  airline: string | null;
  flight_number: string | null;
  gp_id: string;
}

interface Props {
  userCity?: string;
}

// Pays Afrique de l'Ouest (CEDEAO)
const WEST_AFRICA = ["SN", "ML", "CI", "BF", "GH", "GN", "GW", "TG", "BJ", "NG", "NE", "LR", "SL", "GM", "MR", "CV"];

type FilterMode = "all" | "city" | "west_africa";

const REFRESH_INTERVAL = 30_000;

const transportIcon = (type: string) => {
  if (type === "maritime" || type === "ship") return Ship;
  if (type === "routier" || type === "truck") return Truck;
  return Plane;
};

const TickerInner = memo(function TickerInner({
  items,
  onSelect,
}: {
  items: Departure[];
  onSelect: (d: Departure) => void;
}) {
  // Duplicate for seamless loop
  const looped = useMemo(() => [...items, ...items], [items]);
  return (
    <div className="flex gap-3 animate-marquee whitespace-nowrap will-change-transform">
      {looped.map((dep, idx) => {
        const Icon = transportIcon(dep.transport_type);
        return (
          <button
            key={`${dep.id}-${idx}`}
            onClick={() => onSelect(dep)}
            className="flex items-center gap-2 px-3 py-1.5 bg-background/80 backdrop-blur-sm rounded-lg border border-border shadow-sm flex-shrink-0 hover:border-primary/40 hover:bg-primary/5 transition-colors active:scale-95"
          >
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-3 h-3 text-primary" />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-foreground">
                {dep.origin_city} → {dep.destination_city}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {format(new Date(dep.departure_date), "EEE d MMM", { locale: fr })}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="font-medium text-primary">{dep.available_capacity}kg</span>
            </div>
          </button>
        );
      })}
    </div>
  );
});

export function UpcomingDeparturesTicker({ userCity }: Props) {
  const navigate = useNavigate();
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [selected, setSelected] = useState<Departure | null>(null);
  const cacheRef = useRef<{ data: Departure[]; at: number } | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setError(null);
      // Cache hit < 25s
      if (silent && cacheRef.current && Date.now() - cacheRef.current.at < 25_000) return;

      const { data, error: err } = await supabase
        .from("gp_offers")
        .select(
          "id, origin_city, origin_country, destination_city, destination_country, departure_date, available_capacity, total_capacity, currency, price_per_kg, transport_type, airline, flight_number, gp_id"
        )
        .eq("status", "active")
        .gt("available_capacity", 0)
        .gte("departure_date", new Date().toISOString())
        .order("departure_date", { ascending: true })
        .limit(30);

      if (err) throw err;
      const list = (data || []) as Departure[];
      cacheRef.current = { data: list, at: Date.now() };
      setDepartures(list);
    } catch (e: any) {
      console.error("[UpcomingDeparturesTicker]", e);
      if (!silent) setError(e?.message || "Erreur de chargement");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false);
    const id = setInterval(() => fetchData(true), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  const filtered = useMemo(() => {
    if (filter === "city" && userCity) {
      const c = userCity.toLowerCase();
      return departures.filter((d) => d.origin_city?.toLowerCase().includes(c));
    }
    if (filter === "west_africa") {
      return departures.filter((d) => WEST_AFRICA.includes(d.origin_country));
    }
    return departures;
  }, [departures, filter, userCity]);

  const visibleItems = useMemo(() => filtered.slice(0, 15), [filtered]);

  const handleCreateRequest = () => {
    if (!selected) return;
    setSelected(null);
    navigate(
      `/client/nouvelle-commande?origin=${encodeURIComponent(selected.origin_city)}&destination=${encodeURIComponent(selected.destination_city)}&offer=${selected.id}`
    );
  };

  // ─── Loading skeleton ───
  if (loading) {
    return (
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-foreground">Prochains départs</h2>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Chargement…</span>
        </div>
        <div className="rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/10 py-2.5 px-3 flex gap-3 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-44 flex-shrink-0 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Error state ───
  if (error) {
    return (
      <div className="px-4 pb-3">
        <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Impossible de charger les départs.</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setLoading(true);
              fetchData(false);
            }}
            className="h-7 text-xs gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-2 gap-2">
          <h2 className="text-base font-bold text-foreground">Prochains départs</h2>
          <div className="flex items-center gap-1">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
              Tous
            </FilterChip>
            {userCity && (
              <FilterChip active={filter === "city"} onClick={() => setFilter("city")}>
                <MapPin className="w-2.5 h-2.5" />
                {userCity}
              </FilterChip>
            )}
            <FilterChip active={filter === "west_africa"} onClick={() => setFilter("west_africa")}>
              <Filter className="w-2.5 h-2.5" />
              Afrique Ouest
            </FilterChip>
          </div>
        </div>

        {visibleItems.length === 0 ? (
          <div className="rounded-xl bg-muted/30 border border-border p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Aucun départ disponible {filter === "city" ? `depuis ${userCity}` : filter === "west_africa" ? "en Afrique de l'Ouest" : ""}.
            </p>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/10 py-2.5">
            <TickerInner items={visibleItems} onSelect={setSelected} />
          </div>
        )}
      </div>

      {/* ─── Detail Drawer ─── */}
      <Drawer open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DrawerContent>
          {selected && (
            <>
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-2">
                  {(() => {
                    const Icon = transportIcon(selected.transport_type);
                    return <Icon className="w-5 h-5 text-primary" />;
                  })()}
                  {selected.origin_city} → {selected.destination_city}
                </DrawerTitle>
                <DrawerDescription>
                  Départ le {format(new Date(selected.departure_date), "EEEE d MMMM yyyy", { locale: fr })}
                </DrawerDescription>
              </DrawerHeader>

              <div className="px-4 pb-2 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <DetailTile icon={Package} label="Transport" value={selected.transport_type} />
                  <DetailTile
                    icon={Weight}
                    label="Capacité dispo"
                    value={`${selected.available_capacity} / ${selected.total_capacity} kg`}
                  />
                  <DetailTile
                    icon={CalIcon}
                    label="Prix au kg"
                    value={`${selected.price_per_kg} ${selected.currency}`}
                  />
                  <DetailTile
                    icon={MapPin}
                    label="Trajet"
                    value={`${selected.origin_country} → ${selected.destination_country}`}
                  />
                </div>

                {(selected.airline || selected.flight_number) && (
                  <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground">
                    {selected.airline && <span className="font-medium text-foreground">{selected.airline}</span>}
                    {selected.flight_number && <span> · Vol {selected.flight_number}</span>}
                  </div>
                )}
              </div>

              <div className="p-4 pt-2">
                <Button onClick={handleCreateRequest} className="w-full" size="lg">
                  Créer une demande pour ce départ
                </Button>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:border-primary/40"
      )}
    >
      {children}
    </button>
  );
}

function DetailTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-muted/40 border border-border p-2.5">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="text-sm font-semibold text-foreground capitalize">{value}</div>
    </div>
  );
}
