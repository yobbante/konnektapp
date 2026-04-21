import { useEffect, useState } from "react";
import { Plane } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface Departure {
  id: string;
  origin_city: string;
  destination_city: string;
  departure_date: string;
  available_capacity: number;
  currency: string;
  price_per_kg: number;
}

/**
 * Bande défilante des prochains départs GP
 * Tirée directement des offres actives Konnekt (gp_offers)
 */
export function UpcomingDeparturesTicker() {
  const [departures, setDepartures] = useState<Departure[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("gp_offers")
        .select("id, origin_city, destination_city, departure_date, available_capacity, currency, price_per_kg")
        .eq("status", "active")
        .gt("available_capacity", 0)
        .gte("departure_date", new Date().toISOString())
        .order("departure_date", { ascending: true })
        .limit(15);
      if (active && data) setDepartures(data as Departure[]);
    })();
    return () => { active = false; };
  }, []);

  if (departures.length === 0) return null;

  // Duplicate list for seamless infinite scroll
  const items = [...departures, ...departures];

  return (
    <div className="px-4 pb-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-bold text-foreground">Prochains départs</h2>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">En direct</span>
      </div>
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/10 py-2.5">
        <div className="flex gap-3 animate-marquee whitespace-nowrap">
          {items.map((dep, idx) => (
            <div
              key={`${dep.id}-${idx}`}
              className="flex items-center gap-2 px-3 py-1.5 bg-background/80 backdrop-blur-sm rounded-lg border border-border shadow-sm flex-shrink-0"
            >
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Plane className="w-3 h-3 text-primary" />
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
                <span className="font-medium text-primary">
                  {dep.available_capacity}kg dispo
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
