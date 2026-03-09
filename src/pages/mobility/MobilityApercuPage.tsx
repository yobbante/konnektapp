/**
 * Mobility Dashboard — Overview for mobility partners
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Car, Plus, Calendar, Users, MapPin, Clock, ChevronRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { MobileNav } from "@/components/layout/MobileNav";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function MobilityApercuPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const { data: mobProfile } = await supabase
      .from("mobility_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!mobProfile) { navigate("/mobility/inscription"); return; }
    setProfile(mobProfile);

    const { data: tripsData } = await supabase
      .from("mobility_offers")
      .select("*")
      .eq("mobility_profile_id", mobProfile.id)
      .order("departure_date", { ascending: true })
      .limit(10);

    setTrips(tripsData || []);

    const { data: bookingsData } = await supabase
      .from("mobility_bookings")
      .select("*")
      .eq("mobility_profile_id", mobProfile.id)
      .order("created_at", { ascending: false })
      .limit(10);

    setBookings(bookingsData || []);
    setLoading(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><MiniLoader /></div>;

  const activeTrips = trips.filter(t => t.status === "active");
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter(b => b.status === "pending").length;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-transport-mobility text-white p-4 pt-safe">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Konnekt Mobility</h1>
            <p className="text-sm opacity-80">{profile?.business_name}</p>
          </div>
          <Badge className="bg-white/20 text-white border-0">
            {profile?.status === "verified" ? "Vérifié" : "En attente"}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <Card className="border-transport-mobility/20">
          <CardContent className="p-3 text-center">
            <Car className="w-5 h-5 mx-auto text-transport-mobility mb-1" />
            <p className="text-xl font-bold">{activeTrips.length}</p>
            <p className="text-[10px] text-muted-foreground">Trajets actifs</p>
          </CardContent>
        </Card>
        <Card className="border-transport-mobility/20">
          <CardContent className="p-3 text-center">
            <Users className="w-5 h-5 mx-auto text-transport-mobility mb-1" />
            <p className="text-xl font-bold">{totalBookings}</p>
            <p className="text-[10px] text-muted-foreground">Réservations</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20">
          <CardContent className="p-3 text-center">
            <Clock className="w-5 h-5 mx-auto text-amber-500 mb-1" />
            <p className="text-xl font-bold">{pendingBookings}</p>
            <p className="text-[10px] text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
      </div>

      {/* Publish CTA */}
      <div className="px-4 mb-4">
        <Button
          className="w-full bg-transport-mobility hover:bg-transport-mobility/90"
          onClick={() => navigate("/mobility/publier")}
        >
          <Plus className="w-4 h-4 mr-2" /> Publier un trajet
        </Button>
      </div>

      {/* Active Trips */}
      <div className="px-4 space-y-3">
        <h2 className="font-bold text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Prochains trajets
        </h2>
        {activeTrips.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              Aucun trajet publié. Créez votre premier trajet !
            </CardContent>
          </Card>
        ) : (
          activeTrips.map(trip => (
            <Card key={trip.id} className="hover:border-transport-mobility/30 transition-colors cursor-pointer">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-transport-mobility" />
                      {trip.origin_city} → {trip.destination_city}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{format(new Date(trip.departure_date), "dd MMM", { locale: fr })}</span>
                      <span>{trip.departure_time?.slice(0, 5)}</span>
                      <Badge variant="outline" className="text-[10px] h-5">
                        {trip.available_seats}/{trip.total_seats} places
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{trip.price_per_seat?.toLocaleString()} {trip.currency}</p>
                    <p className="text-[10px] text-muted-foreground">/siège</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Recent Bookings */}
      {bookings.length > 0 && (
        <div className="px-4 space-y-3 mt-6">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <Users className="w-4 h-4" /> Réservations récentes
          </h2>
          {bookings.slice(0, 5).map(b => (
            <Card key={b.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{b.booking_number}</p>
                  <p className="text-xs text-muted-foreground">{b.origin_city} → {b.destination_city} · {b.passenger_count} pers.</p>
                </div>
                <Badge className={b.status === "confirmed" ? "bg-green-500/10 text-green-600" : b.status === "pending" ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"}>
                  {b.status === "confirmed" ? "Confirmé" : b.status === "pending" ? "En attente" : b.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Links */}
      <div className="px-4 mt-6 space-y-2">
        {[
          { label: "Mon portefeuille", icon: Wallet, route: "/mobility/wallet" },
          { label: "Mes véhicules", icon: Car, route: "/mobility/vehicules" },
        ].map(item => (
          <button
            key={item.route}
            onClick={() => navigate(item.route)}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      <MobileNav />
    </div>
  );
}
