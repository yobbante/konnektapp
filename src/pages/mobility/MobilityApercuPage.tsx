/**
 * Mobility Dashboard — Corporate-grade dashboard matching GP/Routier style
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bus, Plus, Calendar, Users, MapPin, Clock, ChevronRight, Wallet,
  ScanLine, Ticket, TrendingUp, Bell, Settings, Star, BarChart3,
  Menu, LogOut, MessageCircle, RefreshCw, X, Shield, HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type DashTab = "home" | "trips" | "scan" | "messages" | "profile";

export default function MobilityApercuPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashTab>("home");
  const [showMenu, setShowMenu] = useState(false);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
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
    { id: "messages", icon: MessageCircle, label: "Messages" },
    { id: "profile", icon: Settings, label: "Profil" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ═══ CORPORATE HEADER ═══ */}
      <div className="bg-transport-mobility text-white">
        <div className="px-4 pt-safe">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Bus className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-[15px] font-bold leading-tight tracking-tight">Konnekt Mobility</h1>
                <p className="text-[11px] opacity-80 leading-tight">{profile?.business_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => navigate("/mobility/wallet")} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center relative">
                <Bell className="w-4 h-4" />
                {pendingBookings > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center">
                    {pendingBookings}
                  </span>
                )}
              </button>
              <button onClick={() => setShowMenu(true)} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Menu className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Status ribbon */}
          <div className="flex items-center gap-2 pb-3">
            <Badge className={`text-[10px] h-5 ${profile?.status === "verified" ? "bg-white/20 text-white border-0" : "bg-amber-400/30 text-amber-100 border-0"}`}>
              {profile?.status === "verified" ? "Compte vérifié" : "En attente de vérification"}
            </Badge>
            <span className="text-[10px] opacity-60">{activeTrips.length} trajet(s) actif(s)</span>
          </div>
        </div>
      </div>

      {/* ═══ SLIDE-OVER MENU ═══ */}
      {showMenu && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-card shadow-xl p-4 pt-safe space-y-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm">Menu</h3>
              <button onClick={() => setShowMenu(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <MenuBtn icon={Bus} label="Accueil" onClick={() => { setShowMenu(false); setActiveTab("home"); }} />
            <MenuBtn icon={Plus} label="Publier un trajet" onClick={() => { setShowMenu(false); navigate("/mobility/publier"); }} />
            <MenuBtn icon={Wallet} label="Portefeuille" onClick={() => { setShowMenu(false); navigate("/mobility/wallet"); }} />
            <MenuBtn icon={ScanLine} label="Scanner ticket" onClick={() => { setShowMenu(false); navigate("/mobility/scan-ticket"); }} />
            <MenuBtn icon={BarChart3} label="Statistiques" onClick={() => { setShowMenu(false); }} />
            <Separator className="my-2" />
            <MenuBtn icon={Shield} label="Vérification" onClick={() => { setShowMenu(false); }} />
            <MenuBtn icon={Settings} label="Paramètres" onClick={() => { setShowMenu(false); navigate("/mobility/parametres"); }} />
            <MenuBtn icon={HelpCircle} label="Aide" onClick={() => { setShowMenu(false); navigate("/aide"); }} />
            <Separator className="my-2" />
            <MenuBtn icon={LogOut} label="Déconnexion" variant="destructive" onClick={() => { setShowMenu(false); handleSignOut(); }} />
          </div>
        </div>
      )}

      {/* ═══ HOME TAB ═══ */}
      {activeTab === "home" && (
        <div className="space-y-4 p-4">
          {/* KPI Strip */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Actifs", value: activeTrips.length, icon: Bus, color: "text-transport-mobility" },
              { label: "Réserv.", value: totalBookings, icon: Ticket, color: "text-blue-500" },
              { label: "Attente", value: pendingBookings, icon: Clock, color: "text-amber-500" },
              { label: "Revenus", value: `${(totalRevenue / 1000).toFixed(0)}k`, icon: TrendingUp, color: "text-emerald-500" },
            ].map(kpi => (
              <Card key={kpi.label} className="border-border">
                <CardContent className="p-2.5 text-center">
                  <kpi.icon className={`w-4 h-4 mx-auto ${kpi.color} mb-0.5`} />
                  <p className="text-lg font-bold leading-tight">{kpi.value}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions — Corporate style */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => navigate("/mobility/publier")}
              className="flex items-center gap-3 p-3 rounded-xl bg-transport-mobility text-white hover:bg-transport-mobility/90 transition-colors active:scale-[0.98]"
            >
              <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <Plus className="w-4.5 h-4.5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold">Nouveau trajet</p>
                <p className="text-[10px] opacity-80">Publier une offre</p>
              </div>
            </button>
            <button
              onClick={() => navigate("/mobility/scan-ticket")}
              className="flex items-center gap-3 p-3 rounded-xl border border-transport-mobility/30 bg-transport-mobility/5 hover:bg-transport-mobility/10 transition-colors active:scale-[0.98]"
            >
              <div className="w-9 h-9 rounded-lg bg-transport-mobility/10 flex items-center justify-center flex-shrink-0">
                <ScanLine className="w-4.5 h-4.5 text-transport-mobility" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold">Scanner</p>
                <p className="text-[10px] text-muted-foreground">Valider un ticket</p>
              </div>
            </button>
          </div>

          {/* Today's trips */}
          {todayTrips.length > 0 && (
            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2 px-1">
                <Star className="w-3.5 h-3.5 text-amber-500" /> Aujourd'hui
              </h2>
              {todayTrips.map(trip => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          )}

          {/* Upcoming Trips */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Prochains trajets
              </h2>
              <button onClick={() => setActiveTab("trips")} className="text-[11px] text-transport-mobility font-semibold flex items-center gap-0.5">
                Tout voir <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {activeTrips.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Bus className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucun trajet publié</p>
                  <Button size="sm" className="mt-3 bg-transport-mobility hover:bg-transport-mobility/90" onClick={() => navigate("/mobility/publier")}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Créer un trajet
                  </Button>
                </CardContent>
              </Card>
            ) : (
              activeTrips.slice(0, 4).map(trip => <TripCard key={trip.id} trip={trip} />)
            )}
          </div>

          {/* Operations Links */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {[
              { label: "Portefeuille", desc: "Solde et retraits", icon: Wallet, route: "/mobility/wallet" },
              { label: "Véhicules", desc: "Ma flotte", icon: Bus, route: "/mobility/vehicules" },
              { label: "Statistiques", desc: "Performances", icon: BarChart3, route: "#" },
              { label: "Paramètres", desc: "Configuration", icon: Settings, route: "/mobility/parametres" },
            ].map((item, i, arr) => (
              <div key={item.label}>
                <button
                  onClick={() => item.route !== "#" && navigate(item.route)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-transport-mobility/10 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-transport-mobility" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                {i < arr.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ TRIPS TAB ═══ */}
      {activeTab === "trips" && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-sm">Mes trajets ({trips.length})</h2>
            <Button size="sm" className="bg-transport-mobility hover:bg-transport-mobility/90 h-8 text-xs" onClick={() => navigate("/mobility/publier")}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Nouveau
            </Button>
          </div>
          {trips.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">Aucun trajet</CardContent></Card>
          ) : trips.map(trip => <TripCard key={trip.id} trip={trip} showDate />)}
        </div>
      )}

      {/* ═══ SCAN TAB ═══ */}
      {activeTab === "scan" && (
        <div className="p-4 space-y-4">
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-2xl bg-transport-mobility/10 flex items-center justify-center mx-auto mb-4">
              <ScanLine className="w-10 h-10 text-transport-mobility" />
            </div>
            <h2 className="text-base font-bold mb-1">Scanner un ticket</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Validez l'embarquement en scannant le QR code du passager
            </p>
            <Button
              className="bg-transport-mobility hover:bg-transport-mobility/90 px-8 py-5 text-sm font-semibold"
              onClick={() => navigate("/mobility/scan-ticket")}
            >
              <ScanLine className="w-5 h-5 mr-2" /> Ouvrir le scanner
            </Button>
          </div>

          {bookings.filter(b => b.scanned_at).length > 0 && (
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1">Derniers scans</h3>
              {bookings.filter(b => b.scanned_at).slice(0, 5).map(b => (
                <Card key={b.id} className="mb-2">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{b.booking_number}</p>
                      <p className="text-[10px] text-muted-foreground">{b.passenger_count} passager(s)</p>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px]">
                      {format(new Date(b.scanned_at), "dd MMM HH:mm", { locale: fr })}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ MESSAGES TAB ═══ */}
      {activeTab === "messages" && (
        <div className="p-4 space-y-3">
          <h2 className="font-bold text-sm mb-2">Messages</h2>
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucun message pour le moment</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ PROFILE TAB ═══ */}
      {activeTab === "profile" && (
        <div className="p-4 space-y-3">
          {/* Profile card */}
          <Card className="border-transport-mobility/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-transport-mobility/10 flex items-center justify-center flex-shrink-0">
                  <Bus className="w-7 h-7 text-transport-mobility" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-base truncate">{profile?.business_name}</h2>
                  <p className="text-xs text-muted-foreground">{profile?.base_city}, {profile?.country_code}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-[9px] h-4 ${profile?.status === "verified" ? "bg-emerald-500/10 text-emerald-600 border-0" : "bg-amber-500/10 text-amber-600 border-0"}`}>
                      {profile?.status === "verified" ? "Vérifié" : "En attente"}
                    </Badge>
                    {profile?.rating && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-500" /> {profile.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold">{profile?.total_trips || 0}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Trajets</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{totalBookings}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Réserv.</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{confirmedBookings}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Confirmés</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile links */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {[
              { label: "Portefeuille", icon: Wallet, route: "/mobility/wallet" },
              { label: "Véhicules", icon: Bus, route: "/mobility/vehicules" },
              { label: "Paramètres", icon: Settings, route: "/mobility/parametres" },
              { label: "Aide", icon: HelpCircle, route: "/aide" },
            ].map((item, i, arr) => (
              <div key={item.label}>
                <button
                  onClick={() => navigate(item.route)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                {i < arr.length - 1 && <Separator />}
              </div>
            ))}
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Se déconnecter</span>
          </button>
        </div>
      )}

      {/* ═══ BOTTOM NAV ═══ */}
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
                  <div className="w-12 h-12 -mt-4 rounded-full bg-transport-mobility text-white flex items-center justify-center shadow-lg shadow-transport-mobility/30">
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

/* ─── Trip Card Component ─── */
function TripCard({ trip, showDate }: { trip: any; showDate?: boolean }) {
  return (
    <Card className="mb-2 hover:border-transport-mobility/30 transition-colors">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="w-3.5 h-3.5 text-transport-mobility flex-shrink-0" />
              <span className="truncate">{trip.origin_city} → {trip.destination_city}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
              <span>{format(new Date(trip.departure_date), showDate ? "dd MMM yyyy" : "dd MMM", { locale: fr })}</span>
              {trip.departure_time && <span>{trip.departure_time.slice(0, 5)}</span>}
              <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                {trip.available_seats}/{trip.total_seats} places
              </Badge>
            </div>
          </div>
          <div className="text-right flex-shrink-0 ml-2">
            <p className="font-bold text-sm">{trip.price_per_seat?.toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground">{trip.currency}/siège</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Menu Button ─── */
function MenuBtn({ icon: Icon, label, onClick, variant }: { icon: any; label: string; onClick: () => void; variant?: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors active:scale-[0.98] ${
        variant === "destructive" ? "hover:bg-destructive/10 text-destructive" : "hover:bg-muted/50"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
