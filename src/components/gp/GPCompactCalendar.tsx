/**
 * GPCompactCalendar — Mobile-optimized departure calendar
 * 
 * Compact grid, touch-friendly, visual departure indicators
 * Tap date → opens SmartVoyageForm
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isToday, addMonths, subMonths, isBefore, startOfDay
} from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Departure {
  id: string;
  date: string;
  originCity: string;
  destinationCity: string;
  availableCapacity: number;
  type: "aller" | "retour";
  status: "open" | "full" | "past";
}

interface GPCompactCalendarProps {
  departures: Departure[];
  onDateTap: (date: Date) => void;
  onDepartureTap?: (departureId: string) => void;
}

const WEEKDAYS_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

export function GPCompactCalendar({ departures, onDateTap, onDepartureTap }: GPCompactCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const startDay = start.getDay();
    const paddingStart = startDay === 0 ? 6 : startDay - 1;
    return [...Array(paddingStart).fill(null), ...days];
  }, [currentMonth]);

  const departuresByDate = useMemo(() => {
    const map = new Map<string, Departure[]>();
    departures.forEach(dep => {
      const key = dep.date.split('T')[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(dep);
    });
    return map;
  }, [departures]);

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-sm font-semibold capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: fr })}
        </h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-2">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS_SHORT.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid — compact */}
          <div className="grid grid-cols-7 gap-0.5">
            {monthDays.map((day, i) => {
              if (!day) return <div key={`p-${i}`} className="h-10" />;

              const dateKey = format(day, "yyyy-MM-dd");
              const dayDeps = departuresByDate.get(dateKey) || [];
              const isPast = isBefore(day, startOfDay(new Date()));
              const isCurrent = isToday(day);
              const hasDeps = dayDeps.length > 0;

              return (
                <motion.button
                  key={dateKey}
                  whileTap={!isPast ? { scale: 0.9 } : undefined}
                  onClick={() => !isPast && onDateTap(day)}
                  disabled={isPast}
                  className={cn(
                    "h-10 rounded-lg flex flex-col items-center justify-center relative transition-all",
                    isPast && "opacity-30 cursor-not-allowed",
                    !isPast && "active:bg-primary/20",
                    isCurrent && "ring-2 ring-primary ring-offset-1",
                    hasDeps && "bg-primary/10"
                  )}
                >
                  <span className={cn(
                    "text-xs font-medium",
                    isCurrent && "text-primary font-bold"
                  )}>
                    {format(day, "d")}
                  </span>
                  {hasDeps && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayDeps.slice(0, 2).map((dep, j) => (
                        <div
                          key={j}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            dep.status === "full" ? "bg-amber-500" : "bg-primary"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          Ouvert
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Complet
        </div>
        <div className="flex items-center gap-1">
          <Plus className="w-2.5 h-2.5" />
          Ajouter
        </div>
      </div>

      {/* Upcoming departures list */}
      {departures.filter(d => d.status !== "past").length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prochains</p>
          {departures
            .filter(d => d.status !== "past")
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 4)
            .map(dep => (
              <div key={dep.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 cursor-pointer active:scale-[0.98] transition-all" onClick={() => onDepartureTap?.(dep.id)}>
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    dep.type === "aller" ? "bg-primary/10" : "bg-amber-500/10"
                  )}>
                    <Plane className={cn(
                      "w-4 h-4",
                      dep.type === "aller" ? "text-primary" : "text-amber-600 rotate-180"
                    )} />
                  </div>
                  <div>
                    <p className="font-medium text-xs">{dep.originCity} → {dep.destinationCity}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(dep.date), "EEE d MMM", { locale: fr })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {dep.availableCapacity} kg
                </Badge>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
