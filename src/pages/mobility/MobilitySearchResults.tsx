/**
 * Search results for mobility trips
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bus, ChevronLeft, MapPin, Calendar, Clock, Users, Star, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function MobilitySearchResults() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const origin = params.get("from") || "";
  const dest = params.get("to") || "";
  const date = params.get("date") || "";
  const passengers = parseInt(params.get("passengers") || "1");

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    search();
  }, [origin, dest, date]);

  const search = async () => {
    let query = supabase
      .from("mobility_offers")
      .select("*, mobility_profiles(business_name, rating, total_trips)")
      .eq("status", "active")
      .gte("available_seats", passengers);

    if (origin) query = query.ilike("origin_city", `%${origin}%`);
    if (dest) query = query.ilike("destination_city", `%${dest}%`);
    if (date) query = query.gte("departure_date", date);

    query = query.order("departure_date", { ascending: true }).limit(20);

    const { data } = await query;
    setResults(data || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2"><ChevronLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="font-bold text-sm">{origin || "Toutes"} → {dest || "Toutes"}</h1>
          <p className="text-xs text-muted-foreground">{date ? format(new Date(date), "dd MMM yyyy", { locale: fr }) : "Toutes dates"} · {passengers} passager(s)</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="py-12 text-center"><MiniLoader /></div>
        ) : results.length === 0 ? (
          <div className="py-12 text-center">
            <Bus className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-semibold">Aucun trajet trouvé</p>
            <p className="text-sm text-muted-foreground mt-1">Modifiez vos critères ou revenez plus tard</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{results.length} trajet(s) trouvé(s)</p>
            {results.map(trip => (
              <Card
                key={trip.id}
                className="hover:border-transport-mobility/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/mobility/reserver?trip=${trip.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-transport-mobility shrink-0" />
                        <span className="font-semibold text-sm">{trip.origin_city}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="font-semibold text-sm">{trip.destination_city}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(trip.departure_date), "dd MMM", { locale: fr })}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {trip.departure_time?.slice(0, 5)}</span>
                        {trip.estimated_duration_minutes && (
                          <span>{Math.floor(trip.estimated_duration_minutes / 60)}h{trip.estimated_duration_minutes % 60 > 0 ? String(trip.estimated_duration_minutes % 60).padStart(2, '0') : ''}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px]">
                          <Users className="w-3 h-3 mr-1" /> {trip.available_seats} places
                        </Badge>
                        {trip.mobility_profiles?.rating > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            <Star className="w-3 h-3 mr-1 fill-amber-400 text-amber-400" /> {trip.mobility_profiles.rating?.toFixed(1)}
                          </Badge>
                        )}
                      </div>
                      {trip.mobility_profiles && (
                        <p className="text-xs text-muted-foreground mt-2">{trip.mobility_profiles.business_name}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-lg font-bold text-transport-mobility">{trip.price_per_seat?.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">{trip.currency}/siège</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
