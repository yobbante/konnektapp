/**
 * RoutierPublierPage — Publier une ligne navette (route fixe)
 * 
 * Formulaire compact pour créer une offre routière type navette.
 * Réutilise gp_offers avec transport_type = "routier"
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Route, Calendar, Weight, MapPin, Truck,
  ChevronLeft, Check, Car, Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function RoutierPublierPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);

  const [form, setForm] = useState({
    originCity: "",
    destinationCity: "",
    departureDate: "",
    arrivalDate: "",
    capacity: "",
    pricePerKg: "",
    vehicleId: "",
    conditions: "",
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: gp } = await supabase
        .from("gp_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("gp_type", "routier")
        .maybeSingle();

      if (!gp) { navigate("/routier/inscription"); return; }
      setGpProfile(gp);

      // Pre-fill from profile route
      setForm(f => ({
        ...f,
        originCity: gp.base_origin_city || "",
        destinationCity: gp.base_destination_city || "",
        pricePerKg: String(gp.base_price_per_kg || ""),
      }));

      const [vehiclesRes, ordersRes] = await Promise.all([
        supabase.from("vehicles").select("id, name, vehicle_type, max_weight_kg, is_active").eq("gp_id", gp.id).eq("is_active", true),
        supabase.from("orders").select("status").eq("gp_id", gp.id),
      ]);

      setVehicles(vehiclesRes.data || []);
      setPendingCount(ordersRes.data?.filter(o => o.status === "pending").length || 0);
      setActiveCount(ordersRes.data?.filter(o => ["accepted", "collected", "in_transit"].includes(o.status)).length || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!form.originCity || !form.destinationCity || !form.departureDate || !form.capacity) {
      toast({ title: "Champs requis", description: "Remplissez les champs obligatoires", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("gp_offers").insert({
        gp_id: gpProfile.id,
        origin_city: form.originCity,
        origin_country: gpProfile.base_origin_country || gpProfile.country_code || "SN",
        destination_city: form.destinationCity,
        destination_country: gpProfile.base_destination_country || gpProfile.country_code || "SN",
        departure_date: form.departureDate,
        arrival_date: form.arrivalDate || null,
        total_capacity: parseFloat(form.capacity),
        available_capacity: parseFloat(form.capacity),
        price_per_kg: parseFloat(form.pricePerKg) || 0,
        currency: gpProfile.default_currency || "XOF",
        transport_type: "routier" as any,
        vehicle_id: form.vehicleId || null,
        conditions: form.conditions || null,
        status: "active" as any,
      });

      if (error) throw error;

      toast({ title: "✅ Ligne publiée !", description: `${form.originCity} → ${form.destinationCity}` });
      navigate("/routier/apercu");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader message="Chargement..." />;
  if (!gpProfile) return null;

  const selectedVehicle = vehicles.find(v => v.id === form.vehicleId);

  return (
    <RoutierDashboardLayout gpProfile={gpProfile} pendingCount={pendingCount} activeOrdersCount={activeCount}>
      <div className="px-4 py-3 space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/routier/apercu")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Publier une ligne</h1>
            <p className="text-xs text-muted-foreground">Créez un trajet navette pour recevoir des réservations</p>
          </div>
        </div>

        {/* Route Card */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Route className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold">Trajet</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Ville départ</Label>
                <Input className="h-9" placeholder="Ex: Dakar" value={form.originCity}
                  onChange={e => setForm(f => ({ ...f, originCity: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Ville arrivée</Label>
                <Input className="h-9" placeholder="Ex: Thiès" value={form.destinationCity}
                  onChange={e => setForm(f => ({ ...f, destinationCity: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle */}
        {vehicles.length > 0 && (
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold">Véhicule</span>
              </div>
              <Select value={form.vehicleId} onValueChange={v => {
                setForm(f => ({ ...f, vehicleId: v }));
                const vh = vehicles.find(x => x.id === v);
                if (vh?.max_weight_kg) setForm(f => ({ ...f, capacity: String(vh.max_weight_kg) }));
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sélectionner un véhicule" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      <span className="flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5" />
                        {v.name} · {v.vehicle_type?.replace(/_/g, " ")} · {v.max_weight_kg}kg
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Dates + Capacity */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Date départ *
                </Label>
                <Input type="date" className="h-9" value={form.departureDate}
                  onChange={e => setForm(f => ({ ...f, departureDate: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Date arrivée
                </Label>
                <Input type="date" className="h-9" value={form.arrivalDate}
                  onChange={e => setForm(f => ({ ...f, arrivalDate: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Weight className="w-3 h-3" /> Capacité (kg) *
                </Label>
                <Input type="number" className="h-9" placeholder="500" value={form.capacity}
                  onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Prix/kg ({gpProfile.default_currency || "XOF"})</Label>
                <Input type="number" className="h-9" placeholder="500" value={form.pricePerKg}
                  onChange={e => setForm(f => ({ ...f, pricePerKg: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label className="text-[10px] text-muted-foreground">Conditions (optionnel)</Label>
              <Input className="h-9" placeholder="Ex: Pas de liquides, fragile ok..." value={form.conditions}
                onChange={e => setForm(f => ({ ...f, conditions: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {form.originCity && form.destinationCity && form.departureDate && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground mb-2">Récapitulatif</p>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                    {form.originCity} → {form.destinationCity}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {form.departureDate && format(new Date(form.departureDate), "d MMM yyyy", { locale: fr })}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>{form.capacity || "—"} kg</span>
                  <span>·</span>
                  <span>{form.pricePerKg || "—"} {gpProfile.default_currency || "XOF"}/kg</span>
                  {selectedVehicle && (
                    <>
                      <span>·</span>
                      <span>{selectedVehicle.name}</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Publish button */}
        <Button
          className="w-full h-12 text-base font-bold gap-2"
          onClick={handlePublish}
          disabled={saving || !form.originCity || !form.destinationCity || !form.departureDate || !form.capacity}
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <>
              <Check className="w-5 h-5" />
              Publier la ligne
            </>
          )}
        </Button>
      </div>
    </RoutierDashboardLayout>
  );
}
