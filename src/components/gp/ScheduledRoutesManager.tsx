import { useState, useEffect } from "react";
import { 
  Plus, MapPin, Clock, Calendar, Trash2, Edit2, ChevronDown, ChevronUp,
  Route, ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface ScheduledRoute {
  id: string;
  route_name: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  days_of_week: number[];
  departure_time: string | null;
  estimated_duration_hours: number | null;
  price_per_kg: number;
  currency: string;
  available_capacity_kg: number | null;
  is_active: boolean;
  vehicle_id: string | null;
}

interface Vehicle {
  id: string;
  name: string;
  vehicle_type: string;
}

interface ScheduledRoutesManagerProps {
  gpId: string;
  vehicles: Vehicle[];
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Dim", full: "Dimanche" },
  { value: 1, label: "Lun", full: "Lundi" },
  { value: 2, label: "Mar", full: "Mardi" },
  { value: 3, label: "Mer", full: "Mercredi" },
  { value: 4, label: "Jeu", full: "Jeudi" },
  { value: 5, label: "Ven", full: "Vendredi" },
  { value: 6, label: "Sam", full: "Samedi" },
];

export function ScheduledRoutesManager({ gpId, vehicles }: ScheduledRoutesManagerProps) {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<ScheduledRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadRoutes();
  }, [gpId]);

  const loadRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from("scheduled_routes")
        .select("*")
        .eq("gp_id", gpId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error("Error loading routes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (routeId: string) => {
    try {
      const { error } = await supabase
        .from("scheduled_routes")
        .delete()
        .eq("id", routeId);

      if (error) throw error;
      toast({ title: "Navette supprimée" });
      loadRoutes();
    } catch (error) {
      console.error("Error deleting route:", error);
      toast({ title: "Erreur lors de la suppression", variant: "destructive" });
    }
  };

  const toggleActive = async (route: ScheduledRoute) => {
    try {
      const { error } = await supabase
        .from("scheduled_routes")
        .update({ is_active: !route.is_active })
        .eq("id", route.id);

      if (error) throw error;
      loadRoutes();
    } catch (error) {
      console.error("Error toggling route:", error);
    }
  };

  const getDaysLabel = (days: number[]) => {
    if (days.length === 7) return "Tous les jours";
    if (days.length === 0) return "Non défini";
    return days.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(", ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Navettes régulières</h3>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Nouvelle navette
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer une navette régulière</DialogTitle>
            </DialogHeader>
            <RouteForm 
              gpId={gpId}
              vehicles={vehicles}
              onSuccess={() => {
                setShowAddDialog(false);
                loadRoutes();
              }}
              onCancel={() => setShowAddDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {routes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Route className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">Aucune navette régulière</p>
            <p className="text-xs text-muted-foreground mb-4">
              Créez des trajets fixes pour vos rotations habituelles
            </p>
            <Button variant="outline" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Créer ma première navette
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {routes.map((route) => {
            const isExpanded = expandedId === route.id;
            
            return (
              <Collapsible 
                key={route.id} 
                open={isExpanded} 
                onOpenChange={() => setExpandedId(isExpanded ? null : route.id)}
              >
                <Card className={!route.is_active ? "opacity-60" : ""}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                          <Route className="w-5 h-5 text-secondary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{route.origin_city}</span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span className="font-medium text-foreground">{route.destination_city}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {getDaysLabel(route.days_of_week)}
                            {route.departure_time && ` à ${route.departure_time.slice(0, 5)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {route.price_per_kg} FCFA/kg
                        </Badge>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {route.estimated_duration_hours && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>{route.estimated_duration_hours}h de trajet</span>
                          </div>
                        )}
                        {route.available_capacity_kg && (
                          <div>
                            <span className="text-muted-foreground">Capacité:</span>
                            <span className="ml-1 font-medium">{route.available_capacity_kg} kg</span>
                          </div>
                        )}
                      </div>

                      {/* Schedule */}
                      <div className="flex flex-wrap gap-1">
                        {DAYS_OF_WEEK.map(day => (
                          <Badge 
                            key={day.value}
                            variant={route.days_of_week.includes(day.value) ? "default" : "outline"}
                            className="text-xs"
                          >
                            {day.label}
                          </Badge>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={route.is_active} 
                            onCheckedChange={() => toggleActive(route)}
                          />
                          <span className="text-sm text-muted-foreground">
                            {route.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDelete(route.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Route Form Component
interface RouteFormProps {
  gpId: string;
  vehicles: Vehicle[];
  route?: ScheduledRoute;
  onSuccess: () => void;
  onCancel: () => void;
}

function RouteForm({ gpId, vehicles, route, onSuccess, onCancel }: RouteFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [originCity, setOriginCity] = useState(route?.origin_city || "");
  const [destinationCity, setDestinationCity] = useState(route?.destination_city || "");
  const [destinationCountry, setDestinationCountry] = useState(route?.destination_country || "SN");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(route?.days_of_week || []);
  const [departureTime, setDepartureTime] = useState(route?.departure_time?.slice(0, 5) || "");
  const [duration, setDuration] = useState(route?.estimated_duration_hours?.toString() || "");
  const [pricePerKg, setPricePerKg] = useState(route?.price_per_kg?.toString() || "");
  const [capacity, setCapacity] = useState(route?.available_capacity_kg?.toString() || "");
  const [vehicleId, setVehicleId] = useState(route?.vehicle_id || "");

  const toggleDay = (day: number) => {
    setDaysOfWeek(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleSave = async () => {
    if (!originCity || !destinationCity || !pricePerKg) {
      toast({ title: "Veuillez remplir tous les champs requis", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const data = {
        gp_id: gpId,
        route_name: `${originCity} - ${destinationCity}`,
        origin_city: originCity,
        origin_country: "SN",
        destination_city: destinationCity,
        destination_country: destinationCountry,
        days_of_week: daysOfWeek,
        departure_time: departureTime ? `${departureTime}:00` : null,
        estimated_duration_hours: duration ? parseInt(duration) : null,
        price_per_kg: parseInt(pricePerKg),
        available_capacity_kg: capacity ? parseFloat(capacity) : null,
        vehicle_id: vehicleId || null,
      };

      if (route) {
        const { error } = await supabase
          .from("scheduled_routes")
          .update(data)
          .eq("id", route.id);
        if (error) throw error;
        toast({ title: "Navette mise à jour" });
      } else {
        const { error } = await supabase
          .from("scheduled_routes")
          .insert(data);
        if (error) throw error;
        toast({ title: "Navette créée" });
      }
      onSuccess();
    } catch (error: any) {
      console.error("Error saving route:", error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Route */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Ville de départ *</Label>
          <Input 
            value={originCity}
            onChange={(e) => setOriginCity(e.target.value)}
            placeholder="Dakar"
          />
        </div>
        <div className="space-y-2">
          <Label>Ville d'arrivée *</Label>
          <Input 
            value={destinationCity}
            onChange={(e) => setDestinationCity(e.target.value)}
            placeholder="Abidjan"
          />
        </div>
      </div>

      {/* Days of week */}
      <div className="space-y-2">
        <Label>Jours de circulation</Label>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map(day => (
            <div key={day.value} className="flex items-center gap-2">
              <Checkbox 
                id={`day-${day.value}`}
                checked={daysOfWeek.includes(day.value)}
                onCheckedChange={() => toggleDay(day.value)}
              />
              <label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
                {day.full}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Time & Duration */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Heure de départ</Label>
          <Input 
            type="time"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Durée (heures)</Label>
          <Input 
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="12"
          />
        </div>
      </div>

      {/* Price & Capacity */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Prix par kg (FCFA) *</Label>
          <Input 
            type="number"
            value={pricePerKg}
            onChange={(e) => setPricePerKg(e.target.value)}
            placeholder="1500"
          />
        </div>
        <div className="space-y-2">
          <Label>Capacité (kg)</Label>
          <Input 
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="5000"
          />
        </div>
      </div>

      {/* Vehicle */}
      {vehicles.length > 0 && (
        <div className="space-y-2">
          <Label>Véhicule assigné</Label>
          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un véhicule (optionnel)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Aucun</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name} ({v.vehicle_type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>
          Annuler
        </Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving}>
          {saving ? (
            <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : route ? (
            "Mettre à jour"
          ) : (
            "Créer la navette"
          )}
        </Button>
      </div>
    </div>
  );
}
