/**
 * RoutierMissionDetailTransporteurPage — Transporter-facing mission detail
 * Wrapped in RoutierDashboardLayout, distinct from client version.
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Scale, Clock, Shield, Loader2, Map, MessageCircle, CheckCircle2, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { TransportPageLoader } from "@/components/ui/TransportLoader";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "En attente", color: "text-amber-700", bg: "bg-amber-100" },
  open: { label: "Disponible", color: "text-emerald-700", bg: "bg-emerald-100" },
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

export default function RoutierMissionDetailTransporteurPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [gpProfile, setGpProfile] = useState<any>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    (async () => {
      // Load GP profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: gp } = await supabase
          .from("gp_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        setGpProfile(gp);
      }

      if (!id) { setLoading(false); return; }

      // Try routier_missions first
      const { data: mission } = await supabase
        .from("routier_missions")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (mission) {
        setOrder({
          ...mission,
          order_number: mission.mission_number,
          description: mission.merchandise_description || mission.freight_type,
          weight: mission.weight_kg,
          total_price: mission.client_budget || mission.estimated_price || 0,
          currency: mission.currency || "XOF",
          origin_city: mission.origin_city,
          origin_country: mission.origin_country,
          destination_city: mission.destination_city,
          destination_country: mission.destination_country,
          pickup_date: mission.pickup_date_start,
          status: mission.status,
          created_at: mission.created_at,
          has_insurance: false,
          _source: "mission",
        });
        setLoading(false);
        return;
      }

      // Fallback to orders
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
      setOrder({ ...data, _source: "order" });
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

  const defaultGp = gpProfile || { id: "", business_name: "Routier", gp_type: "routier", status: "pending" };

  if (loading) {
    return (
      <RoutierDashboardLayout gpProfile={defaultGp}>
        <TransportPageLoader />
      </RoutierDashboardLayout>
    );
  }

  if (!order) {
    return (
      <RoutierDashboardLayout gpProfile={defaultGp}>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Mission introuvable
        </div>
      </RoutierDashboardLayout>
    );
  }

  const status = STATUS_MAP[order.status] || STATUS_MAP.pending;
  const isPending = order.status === "pending" || order.status === "open";
  const weightLabel = order.weight ? getWeightLabel(order.weight) : null;

  return (
    <RoutierDashboardLayout gpProfile={defaultGp}>
      <div className="max-w-2xl mx-auto px-3 pb-24 pt-3">
        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-primary text-sm font-medium mb-3 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {/* Title + Status */}
        <div className="mb-4">
          <h1 className="text-lg font-bold text-foreground">
            {order.description || `Mission ${order.order_number}`}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={`${status.bg} ${status.color} border-0 text-xs`}>
              ● {status.label}
            </Badge>
            <span className="text-xs text-muted-foreground">Réf. {order.order_number}</span>
          </div>
        </div>

        {/* Price + Actions */}
        <Card className="mb-3">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-primary">Budget client</p>
                <p className="text-2xl font-bold text-foreground">
                  {Math.round(order.total_price).toLocaleString()} {order.currency === "XOF" ? "CFA" : order.currency}
                </p>
                {order.pickup_date && (
                  <p className="text-xs text-muted-foreground">
                    Enlèvement : {format(new Date(order.pickup_date), "d MMM yyyy", { locale: fr })}
                  </p>
                )}
              </div>
              {isPending && (
                <div className="flex flex-col gap-2">
                  <Button onClick={handleAccept} disabled={accepting} className="rounded-full px-5">
                    {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <><CheckCircle2 className="w-4 h-4 mr-1" /> Me proposer</>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate("/routier/messages")}>
                    <MessageCircle className="w-3.5 h-3.5 mr-1" /> Discuter
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Colis details */}
        <Card className="mb-3">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground text-sm">Détails marchandise</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {order.weight && (
                <div>
                  <p className="text-xs font-medium text-primary">Poids</p>
                  <p className="text-sm font-semibold text-foreground">{order.weight} kg</p>
                </div>
              )}
              {weightLabel && (
                <div>
                  <p className="text-xs font-medium text-primary">Format</p>
                  <p className="text-sm font-semibold text-foreground">{weightLabel}</p>
                </div>
              )}
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trajet */}
        <Card className="mb-3">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="w-3 h-3 rounded-full bg-primary" />
                  <span className="w-0.5 flex-1 bg-border my-1" />
                </div>
                <div>
                  <p className="text-xs font-medium text-primary">Départ</p>
                  <p className="text-base font-bold text-foreground">{order.origin_city}</p>
                  <p className="text-xs text-muted-foreground">{order.origin_country || ""}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="w-3 h-3 rounded-full border-2 border-primary bg-background" />
                </div>
                <div>
                  <p className="text-xs font-medium text-primary">Arrivée</p>
                  <p className="text-base font-bold text-foreground">{order.destination_city}</p>
                  <p className="text-xs text-muted-foreground">{order.destination_country || ""}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recipient */}
        {(order.recipient_name || order.recipient_phone) && (
          <Card className="mb-3">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Destinataire</h3>
              {order.recipient_name && <p className="text-sm text-foreground">{order.recipient_name}</p>}
              {order.recipient_phone && <p className="text-xs text-muted-foreground">{order.recipient_phone}</p>}
            </CardContent>
          </Card>
        )}

        {/* Created date */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-4">
          <Clock className="w-3.5 h-3.5" />
          Créée le {format(new Date(order.created_at), "d MMMM yyyy à HH:mm", { locale: fr })}
        </div>
      </div>
    </RoutierDashboardLayout>
  );
}
