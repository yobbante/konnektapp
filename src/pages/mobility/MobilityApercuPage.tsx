/**
 * Mobility Dashboard — Full-featured dashboard for mobility partners
 * Matches the pattern of GP/Routier dashboards with scan capability
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bus, Plus, Calendar, Users, MapPin, Clock, ChevronRight, Wallet,
  ScanLine, Ticket, TrendingUp, Bell, Settings, Star, BarChart3,
  Menu, LogOut, MessageCircle, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type DashTab = "home" | "trips" | "scan" | "bookings" | "profile";

export default function MobilityApercuPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashTab>("home");

  useEffect(() => { loadData(); }, []);

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

    const [tripsRes, bookingsRes] = await Promise.all([
      supabase.from("mobility_offers")
        .select("*")
        .eq("mobility_profile_id", mobProfile.id)
        .order("departure_date", { ascending: true })
        .limit(20),
      supabase.from("mobility_bookings")
        .select("*")
        .eq("mobility_profile_id", mobProfile.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    setTrips(tripsRes.data || []);
    setBookings(bookingsRes.data || []);
    setLoading(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><MiniLoader /></div>;

  const activeTrips = trips.filter(t => t.status === "active");
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter(b => b.status === "pending" || b.status === "active").length;
  const confirmedBookings = bookings.filter(b => b.status === "confirmed").length;
  const totalRevenue = bookings.reduce((s, b) => s + (b.total_price || 0), 0);
  const todayTrips = activeTrips.filter(t => {
    const d = new Date(t.departure_date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const TABS: { id: DashTab; icon: typeof Bus; label: string }[] = [
    { id: "home", icon: Bus, label: "Accueil" },
    { id: "trips", icon: Calendar, label: "Trajets" },
    { id: "scan", icon: ScanLine, label: "Scan" },
    { id: "bookings", icon: Ticket, label: "Tickets" },
    { id: "profile", icon: Settings, label: "Profil" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header — GP-style */}
      <div className="bg-transport-mobility text-white px-4 pt-safe">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <Bus className="w-5 h-5" />
            <div>
              <h1 className="text-[15px] font-bold leading-tight">Konnekt Mobility</h1>
              <p className="text-[11px] opacity-80 leading-tight">{profile?.business_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate("/mobility/publier")}
              className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center relative">
              <Bell className="w-4 h-4" />
              {pendingBookings > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center">
                  {pendingBookings}
                </span>
              )}
            </button>
          </div>
        </div>
        {/* Status bar */}
        <div className="flex items-center gap-2 pb-3">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${profile?.status === "verified" ? "bg-white/20" : "bg-amber-400/30 text-amber-100"}`}>
            {profile?.status === "verified" ? "Vérifié" : "En attente de vérification"}
          </span>
          <span className="text-[10px] opacity-70">{activeTrips.length} trajet(s) actif(s)</span>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === "home" && (
        <div className="space-y-4 p-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-transport-mobility/20">
              <CardContent className="p-3 text-center">
                <Bus className="w-5 h-5 mx-auto text-transport-mobility mb-1" />
                <p className="text-2xl font-bold">{activeTrips.length}</p>
                <p className="text-[10px] text-muted-foreground">Trajets actifs</p>
              </CardContent>
            </Card>
            <Card className="border-transport-mobility/20">
              <CardContent className="p-3 text-center">
                <Users className="w-5 h-5 mx-auto text-transport-mobility mb-1" />
                <p className="text-2xl font-bold">{totalBookings}</p>
                <p className="text-[10px] text-muted-foreground">Réservations</p>
              </CardContent>
            </Card>
            <Card className="border-amber-500/20">
              <CardContent className="p-3 text-center">
                <Clock className="w-5 h-5 mx-auto text-amber-500 mb-1" />
                <p className="text-2xl font-bold">{pendingBookings}</p>
                <p className="text-[10px] text-muted-foreground">En attente</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-500/20">
              <CardContent className="p-3 text-center">
                <TrendingUp className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
                <p className="text-2xl font-bold">{(totalRevenue / 1000).toFixed(0)}k</p>
                <p className="text-[10px] text-muted-foreground">Revenus (FCFA)</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="h-auto py-4 flex flex-col items-center gap-2 bg-transport-mobility hover:bg-transport-mobility/90"
              onClick={() => navigate("/mobility/publier")}
            >
              <Plus className="w-5 h-5" />
              <span className="text-xs">Publier un trajet</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 border-transport-mobility/30"
              onClick={() => setActiveTab("scan")}
            >
              <ScanLine className="w-5 h-5 text-transport-mobility" />
              <span className="text-xs">Scanner un ticket</span>
            </Button>
          </div>

          {/* Today's Trips */}
          {todayTrips.length > 0 && (
            <div>
              <h2 className="font-bold text-sm flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-amber-500" /> Aujourd'hui
              </h2>
              {todayTrips.map(trip => (
                <Card key={trip.id} className="mb-2 border-transport-mobility/20">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{trip.origin_city} → {trip.destination_city}</p>
                        <p className="text-xs text-muted-foreground">{trip.departure_time?.slice(0, 5)} · {trip.available_seats}/{trip.total_seats} places</p>
                      </div>
                      <Badge className="bg-transport-mobility/10 text-transport-mobility border-0">
                        {trip.price_per_seat?.toLocaleString()} {trip.currency}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Upcoming Trips */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Prochains trajets
              </h2>
              <button onClick={() => setActiveTab("trips")} className="text-xs text-primary font-medium flex items-center gap-0.5">
                Tout voir <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {activeTrips.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                  Aucun trajet publié. Créez votre premier trajet !
                </CardContent>
              </Card>
            ) : (
              activeTrips.slice(0, 4).map(trip => (
                <Card key={trip.id} className="mb-2 hover:border-transport-mobility/30 transition-colors">
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

          {/* Quick Links */}
          <div className="space-y-2 mt-4">
            {[
              { label: "Mon portefeuille", icon: Wallet, route: "/mobility/wallet" },
              { label: "Mes véhicules", icon: Bus, route: "/mobility/vehicules" },
              { label: "Statistiques", icon: BarChart3, route: "#" },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => item.route !== "#" && navigate(item.route)}
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
        </div>
      )}

      {activeTab === "trips" && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">Mes trajets</h2>
            <Button size="sm" className="bg-transport-mobility" onClick={() => navigate("/mobility/publier")}>
              <Plus className="w-4 h-4 mr-1" /> Nouveau
            </Button>
          </div>
          {trips.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Aucun trajet</CardContent></Card>
          ) : trips.map(trip => (
            <Card key={trip.id} className={trip.status !== "active" ? "opacity-50" : ""}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{trip.origin_city} → {trip.destination_city}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(trip.departure_date), "dd MMM yyyy", { locale: fr })} · {trip.departure_time?.slice(0, 5)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-[10px]">
                      {trip.available_seats}/{trip.total_seats} places
                    </Badge>
                    <p className="text-xs font-bold mt-1">{trip.price_per_seat?.toLocaleString()} {trip.currency}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "scan" && (
        <div className="p-4 space-y-4">
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-transport-mobility/10 flex items-center justify-center mx-auto mb-4">
              <ScanLine className="w-10 h-10 text-transport-mobility" />
            </div>
            <h2 className="text-lg font-bold mb-2">Scanner un ticket passager</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Validez l'embarquement en scannant le QR code du passager
            </p>
            <Button
              className="bg-transport-mobility hover:bg-transport-mobility/90 px-8 py-6 text-base"
              onClick={() => navigate("/mobility/scan-ticket")}
            >
              <ScanLine className="w-5 h-5 mr-2" /> Ouvrir le scanner
            </Button>
          </div>

          {/* Recent scans */}
          {bookings.filter(b => b.scanned_at).length > 0 && (
            <div>
              <h3 className="font-bold text-sm mb-2">Derniers scans</h3>
              {bookings.filter(b => b.scanned_at).slice(0, 5).map(b => (
                <Card key={b.id} className="mb-2">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{b.booking_number}</p>
                      <p className="text-xs text-muted-foreground">{b.passenger_count} passager(s)</p>
                    </div>
                    <Badge className="bg-green-500/10 text-green-600 border-0 text-[10px]">
                      {format(new Date(b.scanned_at), "dd MMM HH:mm", { locale: fr })}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "bookings" && (
        <div className="p-4 space-y-3">
          <h2 className="font-bold mb-2">Réservations ({totalBookings})</h2>
          {bookings.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Aucune réservation</CardContent></Card>
          ) : bookings.map(b => (
            <Card key={b.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{b.booking_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.origin_city} → {b.destination_city} · {b.passenger_count} pers.
                  </p>
                  {b.boarding_code && (
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                      Code: {b.boarding_code}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <Badge className={
                    b.scanned_at ? "bg-green-500/10 text-green-600" :
                    b.status === "confirmed" ? "bg-green-500/10 text-green-600" :
                    b.status === "active" ? "bg-blue-500/10 text-blue-600" :
                    b.status === "pending" ? "bg-amber-500/10 text-amber-600" :
                    "bg-muted text-muted-foreground"
                  }>
                    {b.scanned_at ? "Scanné ✓" :
                     b.status === "confirmed" ? "Confirmé" :
                     b.status === "active" ? "Actif" :
                     b.status === "pending" ? "En attente" : b.status}
                  </Badge>
                  <p className="text-xs font-bold mt-1">{b.total_price?.toLocaleString()} {b.currency}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "profile" && (
        <div className="p-4 space-y-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-transport-mobility/10 flex items-center justify-center mx-auto mb-2">
                  <Bus className="w-8 h-8 text-transport-mobility" />
                </div>
                <h2 className="font-bold text-lg">{profile?.business_name}</h2>
                <p className="text-sm text-muted-foreground">{profile?.base_city}, {profile?.country_code}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                <div className="text-center">
                  <p className="text-xl font-bold">{profile?.total_trips || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Trajets</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{profile?.rating?.toFixed(1) || "—"}</p>
                  <p className="text-[10px] text-muted-foreground">Note</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-2">
            {[
              { label: "Mon portefeuille", icon: Wallet, route: "/mobility/wallet" },
              { label: "Mes véhicules", icon: Car, route: "/mobility/vehicules" },
              { label: "Notifications", icon: Bell, route: "#" },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => item.route !== "#" && navigate(item.route)}
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
        </div>
      )}

      {/* Bottom Navigation — Matches GP/Routier pattern */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const isScan = tab.id === "scan";
            return (
              <button
                key={tab.id}
                onClick={() => isScan ? navigate("/mobility/scan-ticket") : setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] font-medium transition-all ${
                  isScan ? "" :
                  isActive ? "text-transport-mobility" : "text-muted-foreground"
                }`}
              >
                {isScan ? (
                  <div className="w-12 h-12 -mt-4 rounded-full bg-transport-mobility text-white flex items-center justify-center shadow-lg">
                    <ScanLine className="w-5 h-5" />
                  </div>
                ) : (
                  <tab.icon className={`w-5 h-5 ${isActive ? "text-transport-mobility" : ""}`} />
                )}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
