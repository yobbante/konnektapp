/**
 * Client booking flow for a mobility trip
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Car, ChevronLeft, MapPin, Calendar, Clock, Users, CreditCard, Check, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type BookingStep = "summary" | "passengers" | "payment" | "confirmation";

export default function MobilityBookingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tripId = params.get("trip");

  const [step, setStep] = useState<BookingStep>("summary");
  const [trip, setTrip] = useState<any>(null);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [passengerCount, setPassengerCount] = useState(1);
  const [passengerNames, setPassengerNames] = useState<string[]>([""]);
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    if (!tripId) { navigate("/"); return; }
    loadTrip();
  }, [tripId]);

  const loadTrip = async () => {
    const { data: t } = await supabase
      .from("mobility_offers")
      .select("*, mobility_profiles(business_name, rating, total_trips, base_city)")
      .eq("id", tripId)
      .single();

    if (!t) { toast({ title: "Trajet introuvable", variant: "destructive" }); navigate("/"); return; }
    setTrip(t);
    setGpProfile(t.mobility_profiles);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase.from("profiles").select("phone").eq("user_id", user.id).maybeSingle();
      if (prof?.phone) setPhone(prof.phone);
    }
    setLoading(false);
  };

  const handleBook = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    if (passengerCount > (trip?.available_seats || 0)) {
      toast({ title: "Places insuffisantes", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const totalPriceCalc = passengerCount * (trip?.price_per_seat || 0);
      const commission = totalPriceCalc * 0.08;
      const bookingNum = "MOB-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      const boardingCode = Math.random().toString(36).slice(2, 8).toUpperCase();

      // Generate a temporary ID for QR data (will be replaced by actual ID after insert)
      const tempId = crypto.randomUUID();

      const { data: bk, error } = await supabase.from("mobility_bookings").insert({
        id: tempId,
        booking_number: bookingNum,
        offer_id: tripId,
        client_id: user.id,
        mobility_profile_id: trip.mobility_profile_id,
        vehicle_id: trip.vehicle_id,
        origin_city: trip.origin_city,
        destination_city: trip.destination_city,
        departure_date: trip.departure_date,
        departure_time: trip.departure_time,
        passenger_count: passengerCount,
        passenger_names: passengerNames.filter(n => n),
        total_price: totalPriceCalc,
        currency: trip.currency || "XOF",
        commission_amount: commission,
        qr_code_data: `KONNEKT-MOB-${tempId}`,
        boarding_code: boardingCode,
        status: "active" as any,
        payment_status: "pending",
      }).select().single();

      if (error) throw error;
      setBooking(bk);
      setStep("confirmation");
      toast({ title: "Réservation créée !" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><MiniLoader /></div>;
  if (!trip) return null;

  const totalPrice = passengerCount * (trip.price_per_seat || 0);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <button onClick={() => step === "summary" ? navigate(-1) : setStep("summary")} className="p-2">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold">{step === "confirmation" ? "Confirmation" : "Réserver"}</h1>
          <p className="text-xs text-muted-foreground">{trip.origin_city} → {trip.destination_city}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {step === "confirmation" && booking ? (
          <div className="text-center space-y-4 py-8">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">Réservation confirmée !</h2>
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">N° Réservation</span>
                  <span className="font-mono font-bold">{booking.booking_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Trajet</span>
                  <span className="font-medium">{trip.origin_city} → {trip.destination_city}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Date</span>
                  <span>{format(new Date(trip.departure_date), "dd MMM yyyy", { locale: fr })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Heure</span>
                  <span>{trip.departure_time?.slice(0, 5)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Passagers</span>
                  <span>{passengerCount}</span>
                </div>
                <div className="border-t pt-2 flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-lg font-bold text-transport-mobility">{totalPrice.toLocaleString()} {trip.currency}</span>
                </div>
              </CardContent>
            </Card>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Ticket className="w-4 h-4" /> Code d'embarquement : <span className="font-mono font-bold">{booking.boarding_code || "—"}</span>
            </div>
            <Button className="w-full bg-transport-mobility" onClick={() => navigate(`/mobility/ticket?id=${booking.id}`)}>
              <QrCode className="w-4 h-4 mr-2" /> Voir mon ticket QR
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate("/reservations")}>
              Voir mes réservations
            </Button>
          </div>
        ) : (
          <>
            {/* Trip Summary */}
            <Card className="border-transport-mobility/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-transport-mobility/10 flex items-center justify-center shrink-0">
                    <Car className="w-6 h-6 text-transport-mobility" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{trip.origin_city} → {trip.destination_city}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(trip.departure_date), "dd MMM", { locale: fr })}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {trip.departure_time?.slice(0, 5)}</span>
                      <Badge variant="outline" className="text-[10px]">{trip.available_seats} places</Badge>
                    </div>
                    {gpProfile && <p className="text-xs mt-2 text-muted-foreground">Par {gpProfile.business_name}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-transport-mobility">{trip.price_per_seat?.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{trip.currency}/siège</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Passengers */}
            {step === "summary" && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-transport-mobility" /> Passagers
                  </h3>
                  <div>
                    <Label>Nombre de passagers</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <Button variant="outline" size="sm" onClick={() => setPassengerCount(Math.max(1, passengerCount - 1))}>-</Button>
                      <span className="text-xl font-bold w-8 text-center">{passengerCount}</span>
                      <Button variant="outline" size="sm" onClick={() => setPassengerCount(Math.min(trip.available_seats, passengerCount + 1))}>+</Button>
                    </div>
                  </div>
                  {Array.from({ length: passengerCount }).map((_, i) => (
                    <div key={i}>
                      <Label>Passager {i + 1}</Label>
                      <Input
                        value={passengerNames[i] || ""}
                        onChange={e => {
                          const names = [...passengerNames];
                          names[i] = e.target.value;
                          setPassengerNames(names);
                        }}
                        placeholder="Nom complet"
                      />
                    </div>
                  ))}
                  <div><Label>Téléphone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+221..." /></div>
                </CardContent>
              </Card>
            )}

            {/* Price Summary */}
            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{passengerCount} × {trip.price_per_seat?.toLocaleString()} {trip.currency}</span>
                  <span className="font-bold">{totalPrice.toLocaleString()} {trip.currency}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Frais de service</span>
                  <span>0 {trip.currency}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-bold">Total</span>
                  <span className="text-lg font-bold text-transport-mobility">{totalPrice.toLocaleString()} {trip.currency}</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Footer */}
      {step !== "confirmation" && (
        <div className="p-4 border-t border-border pb-safe">
          <Button
            className="w-full bg-transport-mobility hover:bg-transport-mobility/90"
            disabled={submitting || passengerCount < 1}
            onClick={handleBook}
          >
            {submitting ? <MiniLoader /> : <><CreditCard className="w-4 h-4 mr-2" /> Confirmer la réservation</>}
          </Button>
        </div>
      )}
    </div>
  );
}
