import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, isFuture } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, ArrowRight, Plus, Clock, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Departure {
  id: string;
  departure_date: string;
  origin_city: string;
  destination_city: string;
  available_capacity: number;
  total_capacity: number;
  price_per_kg: number;
  status: string;
  bookings_count: number;
}

interface DepartureCalendarProps {
  gpId: string;
  onCreateOffer?: () => void;
  onSelectOffer?: (offerId: string) => void;
}

export function DepartureCalendar({ gpId, onCreateOffer, onSelectOffer }: DepartureCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDepartures();
  }, [gpId, currentMonth]);

  const fetchDepartures = async () => {
    setLoading(true);
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    const { data, error } = await supabase
      .from("gp_offers")
      .select("id, departure_date, origin_city, destination_city, available_capacity, total_capacity, price_per_kg, status, bookings_count")
      .eq("gp_id", gpId)
      .gte("departure_date", start.toISOString())
      .lte("departure_date", end.toISOString())
      .order("departure_date", { ascending: true });

    if (!error && data) {
      setDepartures(data);
    }
    setLoading(false);
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getDeparturesForDay = (date: Date) => {
    return departures.filter(d => isSameDay(new Date(d.departure_date), date));
  };

  const selectedDayDepartures = selectedDate ? getDeparturesForDay(selectedDate) : [];

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  // Get the first day of month offset (Monday = 0)
  const firstDayOfMonth = startOfMonth(currentMonth);
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7; // Convert Sunday = 0 to Monday = 0

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Calendrier des départs
          </CardTitle>
          {onCreateOffer && (
            <Button size="sm" onClick={onCreateOffer}>
              <Plus className="w-4 h-4 mr-1" />
              Nouveau
            </Button>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-medium capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: fr })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for offset */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          
          {/* Days */}
          {days.map((day, index) => {
            const dayDepartures = getDeparturesForDay(day);
            const hasDepartures = dayDepartures.length > 0;
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isPast = !isToday(day) && !isFuture(day);

            return (
              <motion.button
                key={day.toISOString()}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.01 }}
                onClick={() => setSelectedDate(isSelected ? null : day)}
                className={cn(
                  "aspect-square rounded-lg flex flex-col items-center justify-center text-sm relative transition-all",
                  isToday(day) && "ring-2 ring-primary ring-offset-1",
                  isSelected && "bg-primary text-primary-foreground",
                  !isSelected && !isPast && "hover:bg-muted",
                  isPast && "text-muted-foreground/50",
                  hasDepartures && !isSelected && "bg-primary/10"
                )}
                disabled={loading}
              >
                <span className={cn("font-medium", isSelected && "text-primary-foreground")}>
                  {format(day, "d")}
                </span>
                {hasDepartures && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayDepartures.slice(0, 3).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isSelected ? "bg-primary-foreground" : "bg-primary"
                        )}
                      />
                    ))}
                    {dayDepartures.length > 3 && (
                      <span className={cn(
                        "text-[8px] ml-0.5",
                        isSelected ? "text-primary-foreground" : "text-primary"
                      )}>
                        +{dayDepartures.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Selected day departures */}
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 pt-4 border-t border-border"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm">
                Départs du {format(selectedDate, "d MMMM", { locale: fr })}
              </h4>
              <Badge variant="secondary">{selectedDayDepartures.length} départ(s)</Badge>
            </div>

            {selectedDayDepartures.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun départ prévu</p>
                {onCreateOffer && isFuture(selectedDate) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={onCreateOffer}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter un départ
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayDepartures.map((departure, i) => (
                  <motion.div
                    key={departure.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => onSelectOffer?.(departure.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-primary" />
                        <span className="font-medium">{departure.origin_city}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="font-medium">{departure.destination_city}</span>
                      </div>
                      <Badge variant={departure.status === 'active' ? 'success' : 'warning'} className="text-[10px]">
                        {departure.status === 'active' ? 'Active' : 'Pause'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{departure.available_capacity}/{departure.total_capacity} kg disponibles</span>
                      <span className="font-semibold text-primary">{departure.price_per_kg} FCFA/kg</span>
                    </div>
                    {departure.bookings_count > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {departure.bookings_count} réservation(s)
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
