import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, MapPin, Scale, Clock, Truck, Shield, ChevronRight, Loader2, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { AppHeader } from "@/components/layout/AppHeader";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "En attente", color: "text-amber-700", bg: "bg-amber-100" },
  accepted: { label: "Acceptée", color: "text-blue-700", bg: "bg-blue-100" },
  collected: { label: "Collectée", color: "text-indigo-700", bg: "bg-indigo-100" },
  in_transit: { label: "En transit", color: "text-purple-700", bg: "bg-purple-100" },
  delivered: { label: "Livrée", color: "text-green-700", bg: "bg-green-100" },
  cancelled: { label: "Annulée", color: "text-red-700", bg: "bg-red-100" },
};

function getWeightLabel(w: number): string {
  if (w <= 5) return "S";
  if (w <= 15) return "M";
  if (w <= 30) return "L";
  if (w <= 70) return "XL";
  return "XXL";
}

export default function RoutierMissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        toast({ title: "Mission introuvable", variant: "destructive" });
        navigate(-1);
        return;
      }
      setOrder(data);
      setLoading(false);
    })();
  }, [id]);

  const handleAccept = async () => {
    if (!order) return;
    setAccepting(true);
    const { error } = await supabase.from("orders").update({ status: "accepted" as const }).eq("id", order.id);
    if (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } else {
      toast({ title: "✅ Mission acceptée !" });
      setOrder({ ...order, status: "accepted" });
    }
    setAccepting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) return null;

  const status = STATUS_MAP[order.status] || STATUS_MAP.pending;
  const isPending = order.status === "pending";
  const weightLabel = getWeightLabel(order.weight);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="max-w-2xl mx-auto px-4 pb-8 pt-4">
        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-primary text-sm font-medium mb-4 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {/* Title */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-foreground">
            {order.description || `Colis ${order.order_number}`}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="outline" className={`${status.bg} ${status.color} border-0 text-xs`}>
              ● {status.label}
            </Badge>
            <span className="text-xs text-muted-foreground">Réf. {order.order_number}</span>
          </div>
        </div>

        {/* Proposition + Date */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-8">
                <div>
                  <p className="text-xs font-medium text-primary">Proposition</p>
                  <p className="text-2xl font-bold text-foreground">
                    {Math.round(order.total_price).toLocaleString()} {order.currency === "XOF" ? "CFA" : order.currency}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-primary">Date d'enlèvement</p>
                  <p className="text-lg font-bold text-foreground">
                    {order.pickup_date
                      ? format(new Date(order.pickup_date), "d MMMM yyyy", { locale: fr })
                      : "Flexible"}
                  </p>
                </div>
              </div>
              {isPending && (
                <div className="flex flex-col gap-2">
                  <Button onClick={handleAccept} disabled={accepting} className="rounded-full px-6">
                    {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Me proposer"}
                  </Button>
                  <Button variant="outline" className="rounded-full px-6" onClick={() => navigate(`/routier/messages`)}>
                    Discuter
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Colis details */}
        <Card className="mb-4">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">
                {order.description || "Colis"}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-primary">Poids</p>
                <p className="text-sm font-semibold text-foreground">{order.weight} kg</p>
              </div>
              <div>
                <p className="text-xs font-medium text-primary">Format</p>
                <p className="text-sm font-semibold text-foreground">{weightLabel}</p>
              </div>
              {order.dimensions && (
                <div>
                  <p className="text-xs font-medium text-primary">Dimensions</p>
                  <p className="text-sm font-semibold text-foreground">{order.dimensions}</p>
                </div>
              )}
              {order.declared_value && (
                <div>
                  <p className="text-xs font-medium text-primary">Valeur déclarée</p>
                  <p className="text-sm font-semibold text-foreground">
                    {order.declared_value.toLocaleString()} {order.currency === "XOF" ? "CFA" : order.currency}
                  </p>
                </div>
              )}
            </div>
            {order.has_insurance && (
              <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-1.5">
                <Shield className="w-3.5 h-3.5" /> Assuré
                {order.insurance_amount ? ` · ${order.insurance_amount.toLocaleString()} CFA` : ""}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trajet */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Origin */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="w-3 h-3 rounded-full bg-primary" />
                  <span className="w-0.5 flex-1 bg-border my-1" />
                </div>
                <div>
                  <p className="text-xs font-medium text-primary">Départ</p>
                  <p className="text-base font-bold text-foreground">{order.origin_city}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.origin_country || "Collecte au point de dépôt"}
                  </p>
                </div>
              </div>
              {/* Destination */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="w-3 h-3 rounded-full border-2 border-primary bg-background" />
                </div>
                <div>
                  <p className="text-xs font-medium text-primary">Arrivée</p>
                  <p className="text-base font-bold text-foreground">{order.destination_city}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.destination_country || "Livraison au destinataire"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-1.5"
                onClick={() => navigate(-1)}
              >
                <Map className="w-3.5 h-3.5" /> Afficher le trajet
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recipient info */}
        {(order.recipient_name || order.recipient_phone) && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Destinataire</h3>
              {order.recipient_name && (
                <p className="text-sm text-foreground">{order.recipient_name}</p>
              )}
              {order.recipient_phone && (
                <p className="text-xs text-muted-foreground">{order.recipient_phone}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Created date */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-6">
          <Clock className="w-3.5 h-3.5" />
          Créée le {format(new Date(order.created_at), "d MMMM yyyy à HH:mm", { locale: fr })}
        </div>
      </div>
    </div>
  );
}
