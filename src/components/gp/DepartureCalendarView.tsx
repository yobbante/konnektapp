import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, ChevronRight, Plus, Plane, MapPin,
  Weight, Calendar, Clock, CheckCircle, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, isBefore, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

interface Departure {
  id: string;
  date: string;
  originCity: string;
  originCountry: string;
  destinationCity: string;
  destinationCountry: string;
  capacity: number;
  availableCapacity: number;
  pricePerKg: number;
  type: "aller" | "retour";
  status: "open" | "full" | "past";
}

interface DepartureCalendarViewProps {
  departures: Departure[];
  onAddDeparture: (data: {
    date: string;
    originCity: string;
    originCountry: string;
    destinationCity: string;
    destinationCountry: string;
    capacity: number;
    pricePerKg: number;
    type: "aller" | "retour";
  }) => Promise<void>;
  onDeleteDeparture?: (id: string) => Promise<void>;
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function DepartureCalendarView({ 
  departures, 
  onAddDeparture,
  onDeleteDeparture 
}: DepartureCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newDeparture, setNewDeparture] = useState({
    originCity: "",
    originCountry: "FR",
    destinationCity: "",
    destinationCountry: "SN",
    capacity: "",
    pricePerKg: "",
    type: "aller" as "aller" | "retour",
  });

  // Get days in current month view
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    // Add padding days for alignment (week starts on Monday)
    const startDay = start.getDay();
    const paddingStart = startDay === 0 ? 6 : startDay - 1;
    const paddingDays = Array(paddingStart).fill(null);
    
    return [...paddingDays, ...days];
  }, [currentMonth]);

  // Map departures to dates
  const departuresByDate = useMemo(() => {
    const map = new Map<string, Departure[]>();
    departures.forEach(dep => {
      const dateKey = dep.date.split('T')[0];
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(dep);
    });
    return map;
  }, [departures]);

  const getDeparturesForDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return departuresByDate.get(dateKey) || [];
  };

  const handleDateClick = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return;
    setSelectedDate(date);
    setShowAddDialog(true);
    setNewDeparture({
      originCity: "",
      originCountry: "FR",
      destinationCity: "",
      destinationCountry: "SN",
      capacity: "",
      pricePerKg: "",
      type: "aller",
    });
  };

  const handleAddDeparture = async () => {
    if (!selectedDate || !newDeparture.originCity || !newDeparture.destinationCity || !newDeparture.capacity) {
      return;
    }

    setLoading(true);
    try {
      await onAddDeparture({
        date: format(selectedDate, 'yyyy-MM-dd'),
        originCity: newDeparture.originCity,
        originCountry: newDeparture.originCountry,
        destinationCity: newDeparture.destinationCity,
        destinationCountry: newDeparture.destinationCountry,
        capacity: parseFloat(newDeparture.capacity),
        pricePerKg: newDeparture.pricePerKg ? parseFloat(newDeparture.pricePerKg) : 8,
        type: newDeparture.type,
      });
      setShowAddDialog(false);
    } finally {
      setLoading(false);
    }
  };

  // Quick route presets
  const quickRoutes = [
    { origin: "Paris", dest: "Dakar", oC: "FR", dC: "SN" },
    { origin: "Paris", dest: "Abidjan", oC: "FR", dC: "CI" },
    { origin: "Dakar", dest: "Paris", oC: "SN", dC: "FR" },
  ];

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[160px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        <Button size="sm" onClick={() => setCurrentMonth(new Date())}>
          Aujourd'hui
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-3">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day, index) => {
              if (!day) {
                return <div key={`pad-${index}`} className="h-16" />;
              }

              const dayDepartures = getDeparturesForDate(day);
              const isPast = isBefore(day, startOfDay(new Date()));
              const isCurrentDay = isToday(day);
              const hasDepartures = dayDepartures.length > 0;

              return (
                <motion.button
                  key={day.toISOString()}
                  whileHover={!isPast ? { scale: 1.05 } : undefined}
                  whileTap={!isPast ? { scale: 0.95 } : undefined}
                  onClick={() => !isPast && handleDateClick(day)}
                  disabled={isPast}
                  className={`
                    h-16 rounded-lg flex flex-col items-center justify-center relative
                    transition-all border
                    ${isPast 
                      ? 'opacity-40 cursor-not-allowed bg-muted/50 border-transparent' 
                      : 'hover:bg-primary/10 hover:border-primary/30 cursor-pointer border-border'
                    }
                    ${isCurrentDay ? 'ring-2 ring-primary ring-offset-1' : ''}
                    ${hasDepartures ? 'bg-primary/5 border-primary/20' : 'bg-card'}
                  `}
                >
                  <span className={`text-sm font-medium ${isCurrentDay ? 'text-primary' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  
                  {hasDepartures && (
                    <div className="flex gap-0.5 mt-1">
                      {dayDepartures.slice(0, 3).map((dep, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            dep.status === 'full' 
                              ? 'bg-amber-500' 
                              : dep.status === 'past' 
                              ? 'bg-muted-foreground' 
                              : 'bg-primary'
                          }`}
                        />
                      ))}
                      {dayDepartures.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{dayDepartures.length - 3}</span>
                      )}
                    </div>
                  )}

                  {!isPast && !hasDepartures && (
                    <Plus className="w-3 h-3 text-muted-foreground/50 mt-1" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span>Ouvert</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Complet</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Plus className="w-3 h-3" />
          <span>Clic pour ajouter</span>
        </div>
      </div>

      {/* Upcoming Departures List */}
      {departures.filter(d => d.status !== 'past').length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Mes prochains départs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {departures
              .filter(d => d.status !== 'past')
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .slice(0, 5)
              .map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      dep.type === 'aller' ? 'bg-primary/10' : 'bg-amber-500/10'
                    }`}>
                      <Plane className={`w-5 h-5 ${
                        dep.type === 'aller' ? 'text-primary' : 'text-amber-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {dep.originCity} → {dep.destinationCity}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(dep.date), 'EEE d MMM', { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={dep.status === 'open' ? 'default' : 'secondary'} className="text-xs">
                      {dep.availableCapacity} kg dispo
                    </Badge>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Add Departure Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Ajouter un départ
            </DialogTitle>
          </DialogHeader>

          {selectedDate && (
            <div className="space-y-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <Calendar className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="font-medium">
                  {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
              </div>

              {/* Quick routes */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Trajets rapides</Label>
                <div className="flex flex-wrap gap-2">
                  {quickRoutes.map((r, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => setNewDeparture(prev => ({
                        ...prev,
                        originCity: r.origin,
                        originCountry: r.oC,
                        destinationCity: r.dest,
                        destinationCountry: r.dC,
                      }))}
                    >
                      {r.origin} → {r.dest}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={newDeparture.type === "aller" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewDeparture(prev => ({ ...prev, type: "aller" }))}
                >
                  Aller
                </Button>
                <Button
                  type="button"
                  variant={newDeparture.type === "retour" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewDeparture(prev => ({ ...prev, type: "retour" }))}
                >
                  Retour
                </Button>
              </div>

              {/* Route */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Départ</Label>
                  <Input
                    placeholder="Paris"
                    value={newDeparture.originCity}
                    onChange={(e) => setNewDeparture(prev => ({ ...prev, originCity: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Arrivée</Label>
                  <Input
                    placeholder="Dakar"
                    value={newDeparture.destinationCity}
                    onChange={(e) => setNewDeparture(prev => ({ ...prev, destinationCity: e.target.value }))}
                  />
                </div>
              </div>

              {/* Capacity */}
              <div className="space-y-1">
                <Label className="text-xs">Capacité (kg) *</Label>
                <div className="relative">
                  <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="30"
                    className="pl-9"
                    value={newDeparture.capacity}
                    onChange={(e) => setNewDeparture(prev => ({ ...prev, capacity: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddDialog(false)}>
                  Annuler
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleAddDeparture}
                  disabled={loading || !newDeparture.originCity || !newDeparture.destinationCity || !newDeparture.capacity}
                >
                  {loading ? "..." : "Ajouter"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
