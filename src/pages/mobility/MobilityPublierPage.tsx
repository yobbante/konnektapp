/**
 * Publish a mobility trip — with shuttle route quick-fill for agencies
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bus, ChevronLeft, MapPin, Calendar, Clock, Users, Luggage, Check, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { format } from "date-fns";

const MOBILITY_TYPES = [
  { value: "shuttle", label: "Navette inter-ville" },
  { value: "private_driver", label: "Chauffeur privé" },
  { value: "group_mission", label: "Transport groupe" },
  { value: "premium", label: "Premium / VIP" },
];

export default function MobilityPublierPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [shuttleRoutes, setShuttleRoutes] = useState<any[]>([]);

  const [originCity, setOriginCity] = useState("");
  const [destCity, setDestCity] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [duration, setDuration] = useState("");
  const [mobilityType, setMobilityType] = useState("shuttle");
  const [totalSeats, setTotalSeats] = useState("4");
  const [pricePerSeat, setPricePerSeat] = useState("");
  const [luggagePolicy, setLuggagePolicy] = useState("1 bagage moyen autorisé");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: mp } = await supabase.from("mobility_profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!mp) { navigate("/mobility/inscription"); return; }
      setProfile(mp);
      setOriginCity(mp.base_city || "");

      const { data: vehs } = await supabase.from("mobility_vehicles").select("*").eq("mobility_profile_id", mp.id).eq("is_active", true);
      setVehicles(vehs || []);
      if (vehs?.length) {
        setSelectedVehicle(vehs[0].id);
        setTotalSeats(String(vehs[0].passenger_capacity || 4));
      }

      // Load shuttle routes for agencies
      if (mp.provider_type === "agence") {
        const { data: routes } = await supabase
          .from("mobility_shuttle_routes")
          .select("*")
          .eq("mobility_profile_id", mp.id)
          .eq("is_active", true);
        setShuttleRoutes(routes || []);
      }

      setLoading(false);
    };
    load();
  }, [navigate]);

  const applyRoute = (route: any) => {
    setOriginCity(route.origin_city);
    setDestCity(route.destination_city);
    setDepartureTime(route.departure_time?.slice(0, 5) || "");
    setPricePerSeat(String(route.price_per_seat || ""));
    setTotalSeats(String(route.total_seats || "15"));
    setMobilityType("shuttle");
    toast({ title: "Route appliquée", description: `${route.origin_city} → ${route.destination_city}` });
  };

  const handlePublish = async () => {
    if (!originCity || !destCity || !departureDate || !departureTime || !pricePerSeat) {
      toast({ title: "Champs requis", description: "Remplissez tous les champs obligatoires", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("mobility_offers").insert({
        mobility_profile_id: profile.id,
        vehicle_id: selectedVehicle || null,
        origin_city: originCity,
        origin_country: profile.base_country || "SN",
        destination_city: destCity,
        destination_country: profile.base_country || "SN",
        departure_date: departureDate,
        departure_time: departureTime,
        estimated_duration_minutes: duration ? parseInt(duration) : null,
        mobility_type: mobilityType as any,
        total_seats: parseInt(totalSeats),
        available_seats: parseInt(totalSeats),
        price_per_seat: parseFloat(pricePerSeat),
        currency: profile.default_currency || "XOF",
        luggage_policy: luggagePolicy,
      });

      if (error) throw error;
      toast({ title: "Trajet publié !", description: `${originCity} → ${destCity}` });
      navigate("/mobility/apercu");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><MiniLoader /></div>;

  const seats = parseInt(totalSeats) || 0;
  const price = parseFloat(pricePerSeat) || 0;
  const totalRevenue = seats * price;
  const commission = Math.round(totalRevenue * 0.08);
  const netRevenue = totalRevenue - commission;
  const isAgence = profile?.provider_type === "agence";

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2"><ChevronLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="font-bold">Publier un trajet</h1>
          <p className="text-xs text-muted-foreground">
            {isAgence ? "Agence Mobility" : "Konnekt Mobility"}
          </p>
        </div>
        {isAgence && <Badge variant="outline" className="ml-auto text-[10px]">Agence</Badge>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick-fill from shuttle routes (agencies only) */}
        {isAgence && shuttleRoutes.length > 0 && (
          <Card className="border-transport-mobility/20 bg-transport-mobility/5">
            <CardContent className="p-3 space-y-2">
              <h3 className="font-semibold text-xs flex items-center gap-2">
                <Repeat className="w-3.5 h-3.5 text-transport-mobility" /> Navettes régulières
              </h3>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {shuttleRoutes.map(route => (
                  <button
                    key={route.id}
                    onClick={() => applyRoute(route)}
                    className="flex-shrink-0 bg-background border border-border rounded-lg px-3 py-2 text-left hover:border-transport-mobility/50 transition-colors"
                  >
                    <p className="text-xs font-semibold">{route.origin_city} → {route.destination_city}</p>
                    <p className="text-[10px] text-muted-foreground">{route.departure_time?.slice(0, 5)} · {route.price_per_seat?.toLocaleString()} FCFA · {route.total_seats} places</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Route */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-transport-mobility" /> Itinéraire</h3>
            <div><Label>Ville de départ *</Label><Input value={originCity} onChange={e => setOriginCity(e.target.value)} placeholder="Dakar" /></div>
            <div><Label>Destination *</Label><Input value={destCity} onChange={e => setDestCity(e.target.value)} placeholder="Saint-Louis" /></div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-transport-mobility" /> Horaires</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date *</Label><Input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} min={format(new Date(), "yyyy-MM-dd")} /></div>
              <div><Label>Heure *</Label><Input type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)} /></div>
            </div>
            <div><Label>Durée estimée (min)</Label><Input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="180" /></div>
          </CardContent>
        </Card>

        {/* Capacity & Price */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Users className="w-4 h-4 text-transport-mobility" /> Capacité & Tarif</h3>
            <div>
              <Label>Type de service *</Label>
              <Select value={mobilityType} onValueChange={setMobilityType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOBILITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {vehicles.length > 0 && (
              <div>
                <Label>Véhicule</Label>
                <Select value={selectedVehicle} onValueChange={v => {
                  setSelectedVehicle(v);
                  const veh = vehicles.find(x => x.id === v);
                  if (veh) setTotalSeats(String(veh.passenger_capacity || 4));
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} ({v.passenger_capacity} places)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Places disponibles *</Label><Input type="number" value={totalSeats} onChange={e => setTotalSeats(e.target.value)} /></div>
              <div><Label>Prix / siège (FCFA) *</Label><Input type="number" value={pricePerSeat} onChange={e => setPricePerSeat(e.target.value)} placeholder="5000" /></div>
            </div>
            {price > 0 && (
              <div className="bg-transport-mobility/5 border border-transport-mobility/20 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Revenu brut ({seats} × {price.toLocaleString()})</span>
                  <span className="font-medium">{totalRevenue.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Commission Konnekt (8%)</span>
                  <span className="text-destructive">-{commission.toLocaleString()} FCFA</span>
                </div>
                <div className="border-t border-transport-mobility/20 pt-1 flex justify-between">
                  <span className="text-xs font-semibold">Revenu net estimé</span>
                  <span className="text-sm font-bold text-transport-mobility">{netRevenue.toLocaleString()} FCFA</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Luggage & Notes */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Luggage className="w-4 h-4 text-transport-mobility" /> Options</h3>
            <div><Label>Politique bagages</Label><Input value={luggagePolicy} onChange={e => setLuggagePolicy(e.target.value)} /></div>
            <div><Label>Description / Notes</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Infos supplémentaires..." rows={2} /></div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border pb-safe">
        <Button
          className="w-full bg-transport-mobility hover:bg-transport-mobility/90"
          disabled={submitting || !originCity || !destCity || !departureDate || !departureTime || !pricePerSeat}
          onClick={handlePublish}
        >
          {submitting ? <MiniLoader /> : <><Check className="w-4 h-4 mr-2" /> Publier le trajet</>}
        </Button>
      </div>
    </div>
  );
}
