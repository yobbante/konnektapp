import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, ChevronRight, Plus, Plane, MapPin,
  Weight, Calendar, Clock, CheckCircle, Users, ArrowLeftRight
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
import { COUNTRIES, CITIES } from "./InteractiveRouteSelector";

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
  defaultRoute?: {
    originCity: string;
    originCountry: string;
    destinationCity: string;
    destinationCountry: string;
  };
  defaultPricePerKg?: number;
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function DepartureCalendarView({ 
  departures, 
  onAddDeparture,
  onDeleteDeparture,
  defaultRoute,
  defaultPricePerKg = 8
}: DepartureCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get the last departure to inverse for return trip logic
  const lastDeparture = useMemo(() => {
    const sorted = [...departures].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted[0] || null;
  }, [departures]);

  const [newDeparture, setNewDeparture] = useState({
    originCity: defaultRoute?.originCity || "",
    originCountry: defaultRoute?.originCountry || "FR",
    destinationCity: defaultRoute?.destinationCity || "",
    destinationCountry: defaultRoute?.destinationCountry || "SN",
    capacity: "",
    pricePerKg: String(defaultPricePerKg),
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
    
    // Smart pre-fill: inverse last departure for return trip
    if (lastDeparture) {
      setNewDeparture({
        originCity: lastDeparture.destinationCity,
        originCountry: lastDeparture.destinationCountry,
        destinationCity: lastDeparture.originCity,
        destinationCountry: lastDeparture.originCountry,
        capacity: "",
        pricePerKg: String(lastDeparture.pricePerKg || defaultPricePerKg),
        type: lastDeparture.type === "aller" ? "retour" : "aller",
      });
    } else if (defaultRoute) {
      setNewDeparture({
        originCity: defaultRoute.originCity,
        originCountry: defaultRoute.originCountry,
        destinationCity: defaultRoute.destinationCity,
        destinationCountry: defaultRoute.destinationCountry,
        capacity: "",
        pricePerKg: String(defaultPricePerKg),
        type: "aller",
      });
    } else {
      setNewDeparture({
        originCity: "",
        originCountry: "FR",
        destinationCity: "",
        destinationCountry: "SN",
        capacity: "",
        pricePerKg: String(defaultPricePerKg),
        type: "aller",
      });
    }
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

      {/* Add Departure Dialog - Interactive Route Selector */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Nouveau voyage
            </DialogTitle>
          </DialogHeader>

          {selectedDate && (
            <div className="space-y-4">
              {/* Date display */}
              <div className="text-center p-3 bg-muted rounded-lg">
                <Calendar className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="font-medium">
                  {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
              </div>

              {/* Current selection with flags */}
              <div className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border">
                <div className="flex items-center justify-center gap-4 mb-3">
                  <div className="text-center">
                    <span className="text-3xl">{COUNTRIES[newDeparture.originCountry]?.flag || "🌍"}</span>
                    <p className="text-sm font-medium mt-1">{newDeparture.originCity || "Ville"}</p>
                  </div>
                  
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                      const temp = { city: newDeparture.originCity, country: newDeparture.originCountry };
                      setNewDeparture(prev => ({
                        ...prev,
                        originCity: prev.destinationCity,
                        originCountry: prev.destinationCountry,
                        destinationCity: temp.city,
                        destinationCountry: temp.country,
                        type: prev.type === "aller" ? "retour" : "aller",
                      }));
                    }}
                    className="h-10 w-10 rounded-full bg-background border hover:bg-accent"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </Button>
                  
                  <div className="text-center">
                    <span className="text-3xl">{COUNTRIES[newDeparture.destinationCountry]?.flag || "🌍"}</span>
                    <p className="text-sm font-medium mt-1">{newDeparture.destinationCity || "Ville"}</p>
                  </div>
                </div>

                {/* Route badge with type */}
                <div className="flex justify-center gap-2">
                  <Badge variant={newDeparture.type === "aller" ? "default" : "secondary"} className="px-3">
                    <Plane className="w-3 h-3 mr-1" />
                    {newDeparture.type === "aller" ? "Aller" : "Retour"}
                  </Badge>
                </div>
              </div>

              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={newDeparture.type === "aller" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewDeparture(prev => ({ ...prev, type: "aller" }))}
                >
                  <Plane className="w-4 h-4 mr-1" /> Aller
                </Button>
                <Button
                  type="button"
                  variant={newDeparture.type === "retour" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewDeparture(prev => ({ ...prev, type: "retour" }))}
                >
                  <Plane className="w-4 h-4 mr-1 rotate-180" /> Retour
                </Button>
              </div>

              {/* City dropdowns */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>{COUNTRIES[newDeparture.originCountry]?.flag || "🌍"}</span> Ville de départ
                  </Label>
                  <Select 
                    value={newDeparture.originCity} 
                    onValueChange={(city) => {
                      const cityInfo = CITIES.find(c => c.city === city);
                      if (cityInfo) {
                        setNewDeparture(prev => ({ 
                          ...prev, 
                          originCity: cityInfo.city, 
                          originCountry: cityInfo.country 
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir">
                        {newDeparture.originCity && (
                          <span className="flex items-center gap-2">
                            <span>{COUNTRIES[newDeparture.originCountry]?.flag || "🌍"}</span>
                            <span>{newDeparture.originCity}</span>
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px] bg-popover z-50">
                      {CITIES.map((item) => (
                        <SelectItem key={`${item.city}-${item.country}`} value={item.city}>
                          <span className="flex items-center gap-2">
                            <span>{COUNTRIES[item.country]?.flag || "🌍"}</span>
                            <span>{item.city}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>{COUNTRIES[newDeparture.destinationCountry]?.flag || "🌍"}</span> Ville d'arrivée
                  </Label>
                  <Select 
                    value={newDeparture.destinationCity} 
                    onValueChange={(city) => {
                      const cityInfo = CITIES.find(c => c.city === city);
                      if (cityInfo) {
                        setNewDeparture(prev => ({ 
                          ...prev, 
                          destinationCity: cityInfo.city, 
                          destinationCountry: cityInfo.country 
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir">
                        {newDeparture.destinationCity && (
                          <span className="flex items-center gap-2">
                            <span>{COUNTRIES[newDeparture.destinationCountry]?.flag || "🌍"}</span>
                            <span>{newDeparture.destinationCity}</span>
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px] bg-popover z-50">
                      {CITIES.map((item) => (
                        <SelectItem key={`${item.city}-${item.country}`} value={item.city}>
                          <span className="flex items-center gap-2">
                            <span>{COUNTRIES[item.country]?.flag || "🌍"}</span>
                            <span>{item.city}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Popular routes */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Trajets populaires</Label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { o: "Dakar", oC: "SN", d: "Paris", dC: "FR" },
                    { o: "Paris", oC: "FR", d: "Dakar", dC: "SN" },
                    { o: "Dakar", oC: "SN", d: "New York", dC: "US" },
                    { o: "Paris", oC: "FR", d: "Abidjan", dC: "CI" },
                    { o: "Dakar", oC: "SN", d: "Montréal", dC: "CA" },
                  ].map((r, i) => (
                    <Badge
                      key={i}
                      variant={newDeparture.originCity === r.o && newDeparture.destinationCity === r.d ? "default" : "outline"}
                      className="cursor-pointer text-xs hover:bg-accent"
                      onClick={() => setNewDeparture(prev => ({
                        ...prev,
                        originCity: r.o,
                        originCountry: r.oC,
                        destinationCity: r.d,
                        destinationCountry: r.dC,
                      }))}
                    >
                      {r.o} - {r.d}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Capacity */}
              <div className="space-y-1.5">
                <Label className="text-xs">Capacité disponible (kg) *</Label>
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
