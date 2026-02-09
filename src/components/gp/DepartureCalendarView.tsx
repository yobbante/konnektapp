import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, ChevronRight, Plus, Plane, MapPin,
  Weight, Calendar, Clock, CheckCircle, ArrowLeftRight, X, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, isBefore, startOfDay } from "date-fns";
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
  defaultRoute?: {
    originCity: string;
    originCountry: string;
    destinationCity: string;
    destinationCountry: string;
  };
  defaultPricePerKg?: number;
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// Country flags map
const FLAGS: Record<string, string> = {
  FR: "🇫🇷", SN: "🇸🇳", CI: "🇨🇮", CM: "🇨🇲", ML: "🇲🇱", US: "🇺🇸", CA: "🇨🇦",
  AE: "🇦🇪", GB: "🇬🇧", BE: "🇧🇪", MA: "🇲🇦", TN: "🇹🇳", GA: "🇬🇦", CG: "🇨🇬",
  DE: "🇩🇪", ES: "🇪🇸", IT: "🇮🇹", CH: "🇨🇭", NL: "🇳🇱", GN: "🇬🇳",
};

export function DepartureCalendarView({ 
  departures, 
  onAddDeparture,
  onDeleteDeparture,
  defaultRoute,
  defaultPricePerKg = 8
}: DepartureCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get the last departure to inverse for return trip logic
  const lastDeparture = useMemo(() => {
    const sorted = [...departures].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted[0] || null;
  }, [departures]);

  const [newDeparture, setNewDeparture] = useState({
    capacity: "",
    pricePerKg: String(defaultPricePerKg),
    type: "aller" as "aller" | "retour",
    returnDate: "" as string,
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

  // Determine current route based on last departure or default
  const currentRoute = useMemo(() => {
    if (lastDeparture) {
      // Smart inversion: next trip is the return of the last one
      return {
        originCity: lastDeparture.destinationCity,
        originCountry: lastDeparture.destinationCountry,
        destinationCity: lastDeparture.originCity,
        destinationCountry: lastDeparture.originCountry,
        type: lastDeparture.type === "aller" ? "retour" as const : "aller" as const,
      };
    }
    if (defaultRoute) {
      return {
        ...defaultRoute,
        type: "aller" as const,
      };
    }
    return {
      originCity: "Dakar",
      originCountry: "SN",
      destinationCity: "Paris",
      destinationCountry: "FR",
      type: "aller" as const,
    };
  }, [lastDeparture, defaultRoute]);

  const handleDateClick = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return;
    setSelectedDate(date);
    // Sync form with current smart route and pricing
    setNewDeparture({
      capacity: lastDeparture ? String(lastDeparture.capacity) : "",
      pricePerKg: String(lastDeparture?.pricePerKg || defaultPricePerKg),
      type: currentRoute.type,
      returnDate: "",
    });
    setShowAddSheet(true);
  };

  const handleAddDeparture = async () => {
    if (!selectedDate || !newDeparture.capacity) {
      return;
    }

    setLoading(true);
    try {
      // Add the main departure using the fixed route
      await onAddDeparture({
        date: format(selectedDate, 'yyyy-MM-dd'),
        originCity: currentRoute.originCity,
        originCountry: currentRoute.originCountry,
        destinationCity: currentRoute.destinationCity,
        destinationCountry: currentRoute.destinationCountry,
        capacity: parseFloat(newDeparture.capacity),
        pricePerKg: newDeparture.pricePerKg ? parseFloat(newDeparture.pricePerKg) : defaultPricePerKg,
        type: newDeparture.type,
      });

      // If return date is set, also add the return trip
      if (newDeparture.returnDate && newDeparture.type === "aller") {
        await onAddDeparture({
          date: newDeparture.returnDate,
          originCity: currentRoute.destinationCity,
          originCountry: currentRoute.destinationCountry,
          destinationCity: currentRoute.originCity,
          destinationCountry: currentRoute.originCountry,
          capacity: parseFloat(newDeparture.capacity),
          pricePerKg: newDeparture.pricePerKg ? parseFloat(newDeparture.pricePerKg) : defaultPricePerKg,
          type: "retour",
        });
      }

      setShowAddSheet(false);
    } finally {
      setLoading(false);
    }
  };

  const swapType = () => {
    setNewDeparture(prev => ({
      ...prev,
      type: prev.type === "aller" ? "retour" : "aller",
    }));
  };

  const getFlag = (code: string) => FLAGS[code] || "🌍";

  return (
    <div className="space-y-4">
      {/* Current Route Display */}
      {defaultRoute && (
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center justify-center gap-3">
              <div className="text-center">
                <span className="text-2xl">{getFlag(defaultRoute.originCountry)}</span>
                <p className="text-xs font-medium">{defaultRoute.originCity}</p>
              </div>
              <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
              <div className="text-center">
                <span className="text-2xl">{getFlag(defaultRoute.destinationCountry)}</span>
                <p className="text-xs font-medium">{defaultRoute.destinationCity}</p>
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-2">
              Votre navette fixe
            </p>
          </CardContent>
        </Card>
      )}

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
        <Button size="sm" variant="outline" onClick={() => setCurrentMonth(new Date())}>
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
                return <div key={`pad-${index}`} className="h-14 md:h-16" />;
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
                    h-14 md:h-16 rounded-lg flex flex-col items-center justify-center relative
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
          <span>Ajouter</span>
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

      {/* Use SmartVoyageForm for adding departures */}
      {showAddSheet && selectedDate && defaultRoute && (
        <SmartVoyageFormInline
          open={showAddSheet}
          onClose={() => setShowAddSheet(false)}
          selectedDate={selectedDate}
          defaultRoute={defaultRoute}
          defaultPricePerKg={defaultPricePerKg}
          onAddDeparture={onAddDeparture}
        />
      )}
    </div>
  );
}

/** Inline voyage form for calendar — uses same teal design as SmartVoyageForm */
function SmartVoyageFormInline({
  open,
  onClose,
  selectedDate,
  defaultRoute,
  defaultPricePerKg,
  onAddDeparture,
}: {
  open: boolean;
  onClose: () => void;
  selectedDate: Date;
  defaultRoute: { originCity: string; originCountry: string; destinationCity: string; destinationCountry: string };
  defaultPricePerKg: number;
  onAddDeparture: DepartureCalendarViewProps["onAddDeparture"];
}) {
  const [loading, setLoading] = useState(false);
  const [tripType, setTripType] = useState<"aller" | "retour">("aller");
  const [form, setForm] = useState({
    capacity: "23",
    airline: "",
    flightNumber: "",
    arrivalDate: "",
  });

  const currentRoute = tripType === "aller"
    ? defaultRoute
    : {
        originCity: defaultRoute.destinationCity,
        originCountry: defaultRoute.destinationCountry,
        destinationCity: defaultRoute.originCity,
        destinationCountry: defaultRoute.originCountry,
      };

  const getFlag = (code: string) => FLAGS[code] || "🌍";

  const handleSubmit = async () => {
    if (!form.capacity || parseFloat(form.capacity) <= 0) return;
    setLoading(true);
    try {
      await onAddDeparture({
        date: format(selectedDate, 'yyyy-MM-dd'),
        originCity: currentRoute.originCity,
        originCountry: currentRoute.originCountry,
        destinationCity: currentRoute.destinationCity,
        destinationCountry: currentRoute.destinationCountry,
        capacity: parseFloat(form.capacity),
        pricePerKg: defaultPricePerKg,
        type: tripType,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !loading && !o && onClose()}>
      <SheetContent side="bottom" className="h-auto max-h-[95vh] rounded-t-2xl p-0">
        {/* Teal header */}
        <div className="bg-primary text-primary-foreground px-5 py-4 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <Plane className="w-5 h-5" />
            <h2 className="text-lg font-bold">Nouveau voyage</h2>
          </div>
        </div>

        <div className="px-5 py-5 space-y-5 overflow-y-auto max-h-[calc(95vh-72px)] pb-safe">
          {/* Route card — locked */}
          <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-center gap-5">
              <div className="text-center">
                <span className="text-3xl">{getFlag(currentRoute.originCountry)}</span>
                <p className="text-xs font-medium mt-1">{currentRoute.originCity}</p>
              </div>
              <Plane className={`w-5 h-5 text-primary ${tripType === "retour" ? "rotate-180" : ""}`} />
              <div className="text-center">
                <span className="text-3xl">{getFlag(currentRoute.destinationCountry)}</span>
                <p className="text-xs font-medium mt-1">{currentRoute.destinationCity}</p>
              </div>
            </div>
            <div className="flex justify-center mt-2.5">
              <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-[11px] gap-1 px-3 py-1">
                <MapPin className="w-3 h-3" /> Navette verrouillée
              </Badge>
            </div>
          </div>

          {/* Aller / Retour toggle */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={tripType === "aller" ? "default" : "outline"}
              className={`h-12 text-sm font-semibold gap-2 rounded-xl ${tripType === "aller" ? "" : "border-2"}`}
              onClick={() => setTripType("aller")}
            >
              <Plane className="w-4 h-4" /> Aller
            </Button>
            <Button
              type="button"
              variant={tripType === "retour" ? "default" : "outline"}
              className={`h-12 text-sm font-semibold gap-2 rounded-xl ${tripType === "retour" ? "" : "border-2"}`}
              onClick={() => setTripType("retour")}
            >
              <Plane className="w-4 h-4 rotate-180" /> Retour
            </Button>
          </div>

          {/* Date de départ */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-4 h-4" /> Date de départ
            </Label>
            <div className="h-12 rounded-xl border-2 border-primary/30 bg-background flex items-center px-3">
              <p className="font-semibold text-sm">
                {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>

          {/* Capacité */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Weight className="w-4 h-4" /> Capacité (kg) *
            </Label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="23"
              className="h-12 text-lg rounded-xl border-2 border-primary/30 focus:border-primary"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
          </div>

          {/* Compagnie + N° Vol */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Compagnie</Label>
              <Input
                placeholder="Air Sénégal..."
                value={form.airline}
                onChange={(e) => setForm({ ...form, airline: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">N° Vol</Label>
              <Input
                placeholder="AF123"
                value={form.flightNumber}
                onChange={(e) => setForm({ ...form, flightNumber: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          {/* Date d'arrivée estimée */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Date d'arrivée estimée
            </Label>
            <Input
              type="datetime-local"
              value={form.arrivalDate}
              onChange={(e) => setForm({ ...form, arrivalDate: e.target.value })}
              className="h-12 rounded-xl border-2 border-primary/30 focus:border-primary"
            />
          </div>

          {/* Prix verrouillé */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/60 border">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Info className="w-4 h-4" /> Prix verrouillé
            </span>
            <span className="font-bold text-sm">
              {defaultPricePerKg.toLocaleString()} /kg
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1 pb-4">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl border-2 text-sm font-semibold"
              onClick={onClose}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              className="flex-1 h-12 rounded-xl text-sm font-semibold gap-2"
              onClick={handleSubmit}
              disabled={loading || !form.capacity || parseFloat(form.capacity) <= 0}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Créer le voyage
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
