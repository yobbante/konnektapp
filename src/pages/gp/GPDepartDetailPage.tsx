/**
 * GPDepartDetailPage — Internal departure detail view for GPs
 * Shows voyage info, bookings, capacity, and quick actions
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plane, Edit, Trash2, Share2, Package, Users, Scale, Clock, MapPin, ChevronRight, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { PageLoader } from "@/components/ui/PageLoader";
import { EditVoyageDialog } from "@/components/gp/EditVoyageDialog";
import { ShareOfferButton } from "@/components/share/ShareOfferButton";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { useGPProfile } from "@/hooks/useGPProfile";
import { format, isFuture, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";

interface Voyage {
  id: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  departure_date: string;
  arrival_date: string | null;
  available_capacity: number;
  total_capacity: number;
  price_per_kg: number;
  currency: string;
  status: string;
  flight_number: string | null;
  airline: string | null;
  baggage_types_accepted: string[] | null;
  baggage_restrictions: string | null;
  transport_type: string;
  description: string | null;
  conditions: string | null;
  bookings_count: number | null;
  views_count: number | null;
}

interface Booking {
  id: string;
  order_number: string;
  sender_name: string | null;
  recipient_name: string | null;
  weight: number;
  total_price: number;
  currency: string;
  status: string;
  created_at: string;
}

const countryFlags: Record<string, string> = {
  France: "🇫🇷", Sénégal: "🇸🇳", "Côte d'Ivoire": "🇨🇮", Mali: "🇲🇱",
  Cameroun: "🇨🇲", Guinée: "🇬🇳", Belgique: "🇧🇪", Allemagne: "🇩🇪",
  Espagne: "🇪🇸", Italie: "🇮🇹", "États-Unis": "🇺🇸", Canada: "🇨🇦",
  Maroc: "🇲🇦", Tunisie: "🇹🇳", Algérie: "🇩🇿", Togo: "🇹🇬",
  Bénin: "🇧🇯", Burkina: "🇧🇫", Gabon: "🇬🇦", Congo: "🇨🇬",
};

const getFlag = (country: string) => countryFlags[country] || "🌍";

export default function GPDepartDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { gpProfile } = useGPProfile();
  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    if (id && gpProfile) loadData();
  }, [id, gpProfile]);

  const loadData = async () => {
    if (!id || !gpProfile) return;
    try {
      const { data: voyageData, error } = await supabase
        .from("gp_offers")
        .select("*")
        .eq("id", id)
        .eq("gp_id", gpProfile.id)
        .maybeSingle();

      if (error || !voyageData) {
        navigate("/gp/calendrier", { replace: true });
        return;
      }
      setVoyage(voyageData);

      // Load bookings for this offer
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, order_number, recipient_name, weight, total_price, currency, status, created_at")
        .eq("offer_id", id)
        .order("created_at", { ascending: false });

      setBookings(ordersData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!voyage) return;
    if (bookings.length > 0) {
      toast({ title: "Impossible", description: "Des réservations sont liées à ce départ", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from("gp_offers").delete().eq("id", voyage.id);
      if (error) throw error;
      toast({ title: "Voyage supprimé" });
      navigate("/gp/calendrier", { replace: true });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  if (loading) return <PageLoader message="Chargement..." />;
  if (!voyage) return null;

  const isFutureVoyage = isFuture(new Date(voyage.departure_date));
  const daysUntil = differenceInDays(new Date(voyage.departure_date), new Date());
  const usedCapacity = voyage.total_capacity - voyage.available_capacity;
  const capacityPercent = voyage.total_capacity > 0 ? (usedCapacity / voyage.total_capacity) * 100 : 0;
  const totalBookingsWeight = bookings.reduce((sum, b) => sum + (b.weight || 0), 0);

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "En attente", variant: "outline" },
    accepted: { label: "Accepté", variant: "default" },
    confirmed: { label: "Confirmé", variant: "default" },
    in_transit: { label: "En transit", variant: "secondary" },
    delivered: { label: "Livré", variant: "default" },
    cancelled: { label: "Annulé", variant: "destructive" },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-sm">Détail du départ</h1>
          <div className="w-5" />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-4 space-y-4 pb-32"
      >
        {/* Route card */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Plane className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">
                      {getFlag(voyage.origin_country)} {voyage.origin_city}
                      <span className="text-muted-foreground mx-2">→</span>
                      {getFlag(voyage.destination_country)} {voyage.destination_city}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(voyage.departure_date), "EEEE d MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                </div>
                <Badge variant={voyage.status === "active" && isFutureVoyage ? "default" : "secondary"}>
                  {voyage.status === "active" && isFutureVoyage ? "Actif" : "Terminé"}
                </Badge>
              </div>

              {isFutureVoyage && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/60 rounded-lg px-3 py-1.5 w-fit">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Dans <strong className="text-foreground">{daysUntil} jour{daysUntil > 1 ? "s" : ""}</strong></span>
                </div>
              )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 divide-x border-t">
              <div className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prix/kg</p>
                <p className="text-sm font-bold mt-0.5">{voyage.price_per_kg} {getCurrencySymbol(voyage.currency)}</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Vol</p>
                <p className="text-sm font-bold mt-0.5">{voyage.flight_number || "—"}</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Compagnie</p>
                <p className="text-sm font-bold mt-0.5">{voyage.airline || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Capacity */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Capacité</p>
              </div>
              <p className="text-sm">
                <span className="font-bold">{usedCapacity}</span>
                <span className="text-muted-foreground"> / {voyage.total_capacity} kg</span>
              </p>
            </div>
            <Progress value={capacityPercent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{voyage.available_capacity} kg disponible</span>
              <span>{Math.round(capacityPercent)}% rempli</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick metrics */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <Package className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold">{bookings.length}</p>
              <p className="text-[10px] text-muted-foreground">Réservation{bookings.length > 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Scale className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold">{totalBookingsWeight}</p>
              <p className="text-[10px] text-muted-foreground">kg réservés</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Eye className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold">{voyage.views_count || 0}</p>
              <p className="text-[10px] text-muted-foreground">Vues</p>
            </CardContent>
          </Card>
        </div>

        {/* Bookings list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              <Users className="w-4 h-4" /> Réservations
            </h3>
          </div>

          {bookings.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-6 text-center text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucune réservation pour ce départ</p>
              </CardContent>
            </Card>
          ) : (
            bookings.map((b) => {
              const sc = statusConfig[b.status] || { label: b.status, variant: "outline" as const };
              return (
                <Card key={b.id} className="cursor-pointer active:scale-[0.98] transition-all" onClick={() => navigate(`/gp/en-cours`)}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {b.recipient_name || b.order_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {b.weight} kg · {b.total_price} {getCurrencySymbol(b.currency)}
                      </p>
                    </div>
                    <Badge variant={sc.variant} className="text-[10px] shrink-0">{sc.label}</Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Additional info */}
        {(voyage.baggage_restrictions || voyage.conditions || voyage.description) && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold">Informations complémentaires</p>
              {voyage.description && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Description</p>
                  <p className="text-sm">{voyage.description}</p>
                </div>
              )}
              {voyage.conditions && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Conditions</p>
                  <p className="text-sm">{voyage.conditions}</p>
                </div>
              )}
              {voyage.baggage_restrictions && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Restrictions bagage</p>
                  <p className="text-sm">{voyage.baggage_restrictions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Actions */}
        <div className="space-y-2">
          {isFutureVoyage && (
            <>
              <Button className="w-full" onClick={() => setShowEdit(true)}>
                <Edit className="w-4 h-4 mr-2" /> Modifier ce départ
              </Button>
              <ShareOfferButton
                offerId={voyage.id}
                originCity={voyage.origin_city}
                destinationCity={voyage.destination_city}
                departureDate={voyage.departure_date}
                pricePerKg={voyage.price_per_kg}
                currency={voyage.currency}
                variant="button"
                className="w-full"
              />
            </>
          )}
          {bookings.length === 0 && (
            <Button variant="destructive" className="w-full" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" /> Supprimer ce départ
            </Button>
          )}
        </div>
      </motion.div>

      {/* Edit dialog */}
      {voyage && showEdit && (
        <EditVoyageDialog
          open={showEdit}
          onClose={() => setShowEdit(false)}
          voyage={voyage}
          onSuccess={() => { setShowEdit(false); loadData(); }}
        />
      )}
    </div>
  );
}
