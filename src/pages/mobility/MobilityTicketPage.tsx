/**
 * Mobility QR Ticket — Displays the boarding ticket with QR code
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, MapPin, Calendar, Clock, Users, Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MiniLoader } from "@/components/ui/MiniLoader";
import QRCode from "react-qr-code";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function MobilityTicketPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const bookingId = params.get("id");
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) { navigate("/reservations"); return; }
    loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    const { data } = await supabase
      .from("mobility_bookings")
      .select("*, mobility_profiles:mobility_profile_id(business_name)")
      .eq("id", bookingId)
      .single();

    if (!data) { navigate("/reservations"); return; }
    setBooking(data);
    setLoading(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><MiniLoader /></div>;
  if (!booking) return null;

  const qrData = booking.qr_code_data || `KONNEKT-MOB-${booking.id}`;
  const isScanned = !!booking.scanned_at;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold">Mon Ticket</h1>
          <p className="text-xs text-muted-foreground">{booking.booking_number}</p>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* Ticket Card */}
        <Card className="border-transport-mobility/30 overflow-hidden">
          {/* Top band */}
          <div className="bg-transport-mobility text-white p-4 text-center">
            <p className="text-xs opacity-80 uppercase tracking-wider">Konnekt Mobility</p>
            <p className="text-lg font-bold mt-1">
              {booking.origin_city} → {booking.destination_city}
            </p>
            <p className="text-sm opacity-80 mt-0.5">
              {booking.mobility_profiles?.business_name || "Transporteur"}
            </p>
          </div>

          <CardContent className="p-4 space-y-4">
            {/* Trip details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Date</p>
                  <p className="font-semibold">{booking.departure_date ? format(new Date(booking.departure_date), "dd MMM yyyy", { locale: fr }) : "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Heure</p>
                  <p className="font-semibold">{booking.departure_time?.slice(0, 5) || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Passagers</p>
                  <p className="font-semibold">{booking.passenger_count}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="font-bold text-transport-mobility">{booking.total_price?.toLocaleString()} {booking.currency}</p>
              </div>
            </div>

            {/* Boarding code */}
            <div className="text-center py-2 border-y border-dashed border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Code d'embarquement</p>
              <p className="text-2xl font-mono font-bold tracking-[0.3em] mt-1">{booking.boarding_code || "—"}</p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center py-4">
              <div className={`bg-white p-4 rounded-xl ${isScanned ? "opacity-40" : ""}`}>
                <QRCode value={qrData} size={180} level="H" />
              </div>
            </div>

            {isScanned ? (
              <Badge className="w-full justify-center py-2 bg-green-500/10 text-green-600 border-green-500/20">
                ✓ Ticket scanné — {format(new Date(booking.scanned_at), "dd MMM à HH:mm", { locale: fr })}
              </Badge>
            ) : (
              <Badge className="w-full justify-center py-2 bg-amber-500/10 text-amber-600 border-amber-500/20">
                Présentez ce QR au chauffeur lors de l'embarquement
              </Badge>
            )}

            {/* Status */}
            <div className="text-center">
              <Badge variant="outline" className={
                booking.status === "confirmed" ? "border-green-500/30 text-green-600" :
                booking.status === "active" ? "border-blue-500/30 text-blue-600" :
                booking.status === "completed" ? "border-muted text-muted-foreground" :
                "border-red-500/30 text-red-600"
              }>
                {booking.status === "confirmed" ? "Confirmé" :
                 booking.status === "active" ? "Actif" :
                 booking.status === "completed" ? "Terminé" :
                 booking.status === "cancelled" ? "Annulé" : booking.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full" onClick={() => navigate("/reservations")}>
          Retour aux réservations
        </Button>
      </div>
    </div>
  );
}
