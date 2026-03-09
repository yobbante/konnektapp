/**
 * RoutierMissionDetailTransporteurPage — Compact corporate design
 * With advanced negotiation system, photo display, and professional layout
 */
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Package, Scale, Clock, Shield, Loader2, 
  MessageCircle, CheckCircle2, DollarSign, MapPin,
  Calendar, Info, Send, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { RoutierDashboardLayout } from "@/components/layout/RoutierDashboardLayout";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-amber-100 text-amber-800" },
  open: { label: "Disponible", color: "bg-emerald-100 text-emerald-800" },
  negotiating: { label: "En négo", color: "bg-blue-100 text-blue-800" },
  accepted: { label: "Acceptée", color: "bg-green-100 text-green-800" },
  collected: { label: "Collectée", color: "bg-indigo-100 text-indigo-800" },
  in_transit: { label: "En transit", color: "bg-purple-100 text-purple-800" },
  delivered: { label: "Livrée", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Annulée", color: "bg-red-100 text-red-800" },
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
  const [negotiation, setNegotiation] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Negotiation form
  const [showNegotiateForm, setShowNegotiateForm] = useState(false);
  const [counterPrice, setCounterPrice] = useState("");
  const [counterMessage, setCounterMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState("");

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }
    
    const { data: gp } = await supabase
      .from("gp_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setGpProfile(gp);

    if (!id) { setLoading(false); return; }

    // Load mission
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
        photo_url: mission.photo_url,
        has_insurance: mission.insurance_required,
        _source: "mission",
      });

      // Load existing negotiation for this GP
      if (gp) {
        const { data: neg } = await supabase
          .from("mission_negotiations")
          .select("*")
          .eq("mission_id", id)
          .eq("gp_id", gp.id)
          .maybeSingle();
        setNegotiation(neg);
      }
    }
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  // Timer for negotiation deadline
  useEffect(() => {
    if (!negotiation?.deadline_at) return;
    const interval = setInterval(() => {
      const deadline = new Date(negotiation.deadline_at).getTime();
      const diff = deadline - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expiré");
        clearInterval(interval);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [negotiation?.deadline_at]);

  const handleAcceptDirect = async () => {
    if (!order || !gpProfile) return;
    setActionLoading(true);
    try {
      // Create negotiation with direct acceptance
      const { data: neg, error } = await supabase.from("mission_negotiations").insert({
        mission_id: order.id,
        gp_id: gpProfile.id,
        initial_client_price: order.total_price,
        agreed_price: order.total_price,
        status: "accepted",
        gp_responded_at: new Date().toISOString(),
      }).select().single();
      if (error) throw error;

      // Update mission
      await supabase.from("routier_missions").update({
        status: "accepted",
        matched_gp_id: gpProfile.id,
        accepted_negotiation_id: neg.id,
      } as any).eq("id", order.id);

      // Try to create order
      try {
        await supabase.rpc("convert_mission_to_order", {
          p_mission_id: order.id,
          p_gp_id: gpProfile.id,
          p_agreed_price: order.total_price,
        });
      } catch (e) { console.warn("Conversion:", e); }

      toast({ title: "✅ Mission acceptée au prix client" });
      navigate("/routier/demandes");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleCounterPropose = async () => {
    if (!order || !gpProfile || !counterPrice) return;
    setActionLoading(true);
    try {
      const price = parseFloat(counterPrice);
      const { error } = await supabase.from("mission_negotiations").insert({
        mission_id: order.id,
        gp_id: gpProfile.id,
        initial_client_price: order.total_price,
        gp_counter_price: price,
        gp_message: counterMessage || null,
        status: "counter_proposed",
        gp_responded_at: new Date().toISOString(),
        deadline_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });
      if (error) throw error;

      await supabase.from("routier_missions").update({ status: "negotiating" } as any).eq("id", order.id);

      toast({ title: "📤 Contre-proposition envoyée" });
      setShowNegotiateForm(false);
      loadData();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleAcceptClientCounter = async () => {
    if (!negotiation || !gpProfile) return;
    setActionLoading(true);
    try {
      const agreedPrice = negotiation.client_final_price;
      await supabase.from("mission_negotiations").update({
        status: "accepted",
        agreed_price: agreedPrice,
        gp_responded_at: new Date().toISOString(),
      }).eq("id", negotiation.id);

      await supabase.from("routier_missions").update({
        status: "accepted",
        matched_gp_id: gpProfile.id,
        accepted_negotiation_id: negotiation.id,
      } as any).eq("id", order.id);

      try {
        await supabase.rpc("convert_mission_to_order", {
          p_mission_id: order.id,
          p_gp_id: gpProfile.id,
          p_agreed_price: agreedPrice,
        });
      } catch (e) { console.warn("Conversion:", e); }

      toast({ title: "✅ Accord conclu !" });
      navigate("/routier/demandes");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const defaultGp = gpProfile || { id: "", business_name: "Routier", gp_type: "routier", status: "pending" };

  if (loading) {
    return <RoutierDashboardLayout gpProfile={defaultGp}><TransportPageLoader /></RoutierDashboardLayout>;
  }
  if (!order) {
    return <RoutierDashboardLayout gpProfile={defaultGp}>
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Mission introuvable</div>
    </RoutierDashboardLayout>;
  }

  const status = STATUS_MAP[order.status] || STATUS_MAP.pending;
  const isPending = order.status === "pending" || order.status === "open";
  const isNegotiating = order.status === "negotiating";
  const weightLabel = order.weight ? getWeightLabel(order.weight) : null;
  const needsGPResponse = negotiation?.status === "counter_proposed" && negotiation?.client_final_price && !negotiation?.agreed_price;
  const isExpired = timeLeft === "Expiré";

  return (
    <RoutierDashboardLayout gpProfile={defaultGp}>
      <div className="max-w-lg mx-auto px-3 pb-24 pt-2">
        
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Réf. {order.order_number}</p>
          </div>
          <Badge className={cn("text-[10px] h-5", status.color)}>{status.label}</Badge>
        </div>

        {/* Photo + Route compact */}
        <div className="flex gap-3 mb-3">
          {/* Photo */}
          <div className="w-20 h-20 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 overflow-hidden border">
            {order.photo_url ? (
              <img src={order.photo_url} alt="Colis" className="w-full h-full object-cover" />
            ) : (
              <Package className="w-8 h-8 text-muted-foreground/30" />
            )}
          </div>
          
          {/* Route */}
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm font-semibold truncate">{order.origin_city}</span>
            </div>
            <div className="flex items-center gap-1.5 pl-0.5">
              <div className="w-0.5 h-4 bg-border ml-[3px]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full border-2 border-primary bg-background" />
              <span className="text-sm font-semibold truncate">{order.destination_city}</span>
            </div>
          </div>
        </div>

        {/* Pricing Card */}
        <Card className="mb-2">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Budget client</p>
                <p className="text-xl font-bold text-foreground">
                  {Math.round(order.total_price).toLocaleString()} <span className="text-sm font-medium">CFA</span>
                </p>
              </div>
              <div className="text-right">
                {order.pickup_date && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(order.pickup_date), "d MMM", { locale: fr })}
                  </div>
                )}
                <div className="flex items-center gap-1 mt-0.5">
                  {order.weight && <Badge variant="outline" className="text-[9px] h-4">{order.weight} kg</Badge>}
                  {weightLabel && <Badge variant="secondary" className="text-[9px] h-4">{weightLabel}</Badge>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Negotiation Status */}
        {negotiation && (
          <Card className="mb-2 border-primary/30">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-primary" />
                  Négociation en cours
                </p>
                {negotiation.deadline_at && !isExpired && (
                  <Badge variant="outline" className="text-[9px] h-4 bg-amber-50 text-amber-700 border-amber-200">
                    <Clock className="w-2.5 h-2.5 mr-0.5" /> {timeLeft}
                  </Badge>
                )}
              </div>
              
              {/* Timeline */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">Budget initial</span>
                  <span className="font-medium">{negotiation.initial_client_price?.toLocaleString()} CFA</span>
                </div>
                
                {negotiation.gp_counter_price && (
                  <div className="flex items-center justify-between text-xs p-2 rounded bg-primary/5 border border-primary/20">
                    <span className="text-primary">Votre offre</span>
                    <span className="font-bold text-primary">{negotiation.gp_counter_price?.toLocaleString()} CFA</span>
                  </div>
                )}
                
                {negotiation.client_final_price && (
                  <div className="flex items-center justify-between text-xs p-2 rounded bg-blue-50 border border-blue-200">
                    <span className="text-blue-700">Réponse client</span>
                    <span className="font-bold text-blue-700">{negotiation.client_final_price?.toLocaleString()} CFA</span>
                  </div>
                )}
                
                {negotiation.agreed_price && (
                  <div className="flex items-center justify-between text-xs p-2 rounded bg-green-50 border-2 border-green-300">
                    <span className="text-green-700 font-medium">Prix convenu</span>
                    <span className="font-bold text-green-700">{negotiation.agreed_price?.toLocaleString()} CFA</span>
                  </div>
                )}
              </div>

              {/* GP needs to respond to client counter */}
              {needsGPResponse && !isExpired && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleAcceptClientCounter} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                    Accepter {negotiation.client_final_price?.toLocaleString()}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions - Only for pending/open */}
        {isPending && !negotiation && (
          <Card className="mb-2">
            <CardContent className="p-3 space-y-2">
              {!showNegotiateForm ? (
                <div className="flex gap-2">
                  <Button className="flex-1 h-9" onClick={handleAcceptDirect} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                    Accepter
                  </Button>
                  <Button variant="outline" className="flex-1 h-9" onClick={() => setShowNegotiateForm(true)}>
                    <DollarSign className="w-4 h-4 mr-1" /> Négocier
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">Votre contre-proposition</p>
                    <button onClick={() => setShowNegotiateForm(false)} className="text-xs text-muted-foreground hover:text-foreground">
                      Annuler
                    </button>
                  </div>
                  <div className="relative">
                    <Input 
                      type="number" 
                      placeholder={`${Math.round(order.total_price * 1.1).toLocaleString()}`}
                      value={counterPrice}
                      onChange={e => setCounterPrice(e.target.value)}
                      className="h-9 pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">CFA</span>
                  </div>
                  <Textarea 
                    placeholder="Justification (optionnel)" 
                    value={counterMessage}
                    onChange={e => setCounterMessage(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <Button className="w-full h-9" onClick={handleCounterPropose} disabled={actionLoading || !counterPrice}>
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                    Envoyer ma proposition
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          {order.weight && (
            <Card>
              <CardContent className="p-2.5 flex items-center gap-2">
                <Scale className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-[9px] text-muted-foreground">Poids</p>
                  <p className="text-sm font-semibold">{order.weight} kg</p>
                </div>
              </CardContent>
            </Card>
          )}
          {order.dimensions && (
            <Card>
              <CardContent className="p-2.5 flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-[9px] text-muted-foreground">Dimensions</p>
                  <p className="text-sm font-semibold">{order.dimensions}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {order.has_insurance && (
            <Card className="col-span-2">
              <CardContent className="p-2.5 flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-600" />
                <p className="text-xs font-medium text-green-700">Assurance incluse</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Description */}
        {order.description && (
          <Card className="mb-2">
            <CardContent className="p-2.5">
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{order.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground mt-3">
          Créée {formatDistanceToNow(new Date(order.created_at), { locale: fr, addSuffix: true })}
        </p>
      </div>
    </RoutierDashboardLayout>
  );
}
