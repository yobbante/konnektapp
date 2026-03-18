/**
 * VoyageDashboard — Mini dashboard for occasional voyageurs
 * Shows published trips, incoming requests, earnings summary
 * Accessible from the Voyage button when user has published trips
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plane, MapPin, Calendar, Luggage, ChevronRight, Plus,
  Clock, CheckCircle2, Package, DollarSign, ArrowRight,
  MessageCircle, Eye, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

interface VoyageDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewTrip: () => void;
}

interface Trip {
  id: string;
  origin_city: string;
  destination_city: string;
  departure_date: string;
  available_capacity: number;
  total_capacity: number;
  price_per_kg: number;
  currency: string;
  status: string;
  bookings_count: number | null;
  views_count: number | null;
}

export function VoyageDashboard({ open, onOpenChange, onNewTrip }: VoyageDashboardProps) {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "past">("active");

  useEffect(() => {
    if (!open) return;
    fetchTrips();
  }, [open]);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("gp_type", "occasionnel" as any)
        .maybeSingle();

      if (!gpProfile) {
        setTrips([]);
        return;
      }

      const { data } = await supabase
        .from("gp_offers")
        .select("id, origin_city, destination_city, departure_date, available_capacity, total_capacity, price_per_kg, currency, status, bookings_count, views_count")
        .eq("gp_id", gpProfile.id)
        .order("departure_date", { ascending: false });

      setTrips(data || []);
    } catch (err) {
      console.error("Error fetching trips:", err);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const activeTrips = trips.filter(t => t.status === "active" && t.departure_date >= today);
  const pastTrips = trips.filter(t => t.status !== "active" || t.departure_date < today);
  const displayedTrips = activeTab === "active" ? activeTrips : pastTrips;

  const totalEarnings = trips.reduce((sum, t) => {
    const booked = (t.total_capacity - t.available_capacity);
    return sum + booked * t.price_per_kg;
  }, 0);

  const totalBookings = trips.reduce((sum, t) => sum + (t.bookings_count || 0), 0);

  const formatDate = (d: string) => {
    try { return format(new Date(d), "EEE d MMM", { locale: fr }); }
    catch { return d; }
  };

  const getStatusConfig = (trip: Trip) => {
    if (trip.departure_date < today) return { label: "Terminé", color: "bg-muted text-muted-foreground", icon: CheckCircle2 };
    if (trip.status !== "active") return { label: "Inactif", color: "bg-muted text-muted-foreground", icon: Clock };
    if (trip.available_capacity <= 0) return { label: "Complet", color: "bg-green-500/10 text-green-600", icon: CheckCircle2 };
    return { label: "En ligne", color: "bg-primary/10 text-primary", icon: Sparkles };
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Luggage className="w-4 h-4 text-white" />
              </div>
              Mes Voyages
            </div>
            <Button
              size="sm"
              onClick={() => { onOpenChange(false); onNewTrip(); }}
              className="h-8 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Nouveau
            </Button>
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-6 pb-8 overflow-y-auto max-h-[75vh] space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Voyages", value: trips.length, icon: Plane, color: "text-primary" },
              { label: "Réservations", value: totalBookings, icon: Package, color: "text-amber-500" },
              { label: "Gains", value: `${totalEarnings.toLocaleString()}€`, icon: DollarSign, color: "text-green-500" },
            ].map((stat) => (
              <div key={stat.label} className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
                <stat.icon className={cn("w-4 h-4 mx-auto mb-1", stat.color)} />
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* CTA to become pro */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Devenir GP Pro</p>
                <p className="text-[10px] text-muted-foreground">Dashboard complet, plus de clients</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { onOpenChange(false); navigate("/gp/bagages/inscription"); }}
                className="h-7 text-[10px] border-primary/30 text-primary"
              >
                Passer pro
                <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-muted/30 rounded-xl">
            {[
              { id: "active" as const, label: `En cours (${activeTrips.length})` },
              { id: "past" as const, label: `Passés (${pastTrips.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Trip List */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : displayedTrips.length === 0 ? (
            <div className="text-center py-8">
              <Plane className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                {activeTab === "active" ? "Aucun voyage en cours" : "Aucun voyage passé"}
              </p>
              {activeTab === "active" && (
                <Button
                  size="sm"
                  onClick={() => { onOpenChange(false); onNewTrip(); }}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs"
                >
                  Publier un trajet
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayedTrips.map((trip) => {
                const statusConfig = getStatusConfig(trip);
                const StatusIcon = statusConfig.icon;
                const bookedKg = trip.total_capacity - trip.available_capacity;
                const fillPercent = Math.round((bookedKg / trip.total_capacity) * 100);

                return (
                  <motion.button
                    key={trip.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => { onOpenChange(false); navigate(`/offres/${trip.id}`); }}
                    className="w-full text-left p-3.5 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-all space-y-2.5"
                  >
                    {/* Route + Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <span>{trip.origin_city}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{trip.destination_city}</span>
                      </div>
                      <Badge className={cn("text-[10px] gap-1", statusConfig.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {/* Details */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(trip.departure_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {bookedKg}/{trip.total_capacity}kg
                      </span>
                      <span className="font-semibold text-foreground">
                        {trip.price_per_kg}€/kg
                      </span>
                    </div>

                    {/* Fill bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            fillPercent >= 80 ? "bg-green-500" : fillPercent >= 40 ? "bg-amber-500" : "bg-primary"
                          )}
                          style={{ width: `${Math.max(3, fillPercent)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">{fillPercent}%</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
