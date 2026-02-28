/**
 * MissionNegotiationSheet - Bidirectional negotiation between client and routier GP
 * Supports: accept, counter-propose, reject with timer
 */
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  X, Check, MessageCircle, DollarSign, Clock, Truck, Loader2, ArrowRight
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Negotiation {
  id: string;
  mission_id: string;
  gp_id: string;
  initial_client_price: number;
  gp_counter_price: number | null;
  client_final_price: number | null;
  agreed_price: number | null;
  status: string;
  gp_message: string | null;
  client_message: string | null;
  deadline_at: string | null;
  created_at: string;
  gp_responded_at: string | null;
  client_responded_at: string | null;
}

interface Mission {
  id: string;
  mission_number: string;
  origin_city: string;
  destination_city: string;
  freight_type: string;
  weight_kg: number;
  client_budget: number;
  currency: string;
}

interface MissionNegotiationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mission: Mission | null;
  negotiation: Negotiation | null;
  role: "client" | "gp";
  gpId?: string;
  onSuccess?: () => void;
}

export function MissionNegotiationSheet({
  open, onOpenChange, mission, negotiation, role, gpId, onSuccess
}: MissionNegotiationSheetProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [counterPrice, setCounterPrice] = useState("");
  const [message, setMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState("");

  // Timer countdown
  useEffect(() => {
    if (!negotiation?.deadline_at) return;
    const interval = setInterval(() => {
      const deadline = new Date(negotiation.deadline_at!).getTime();
      const now = Date.now();
      const diff = deadline - now;
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

  // GP: Create counter-proposal or accept
  const handleGPAction = async (action: "accept" | "counter") => {
    if (!mission || !gpId) return;
    setLoading(true);
    try {
      if (!negotiation) {
        // First response from GP — create negotiation record
        const insertData: any = {
          mission_id: mission.id,
          gp_id: gpId,
          initial_client_price: mission.client_budget,
          status: action === "accept" ? "accepted" : "counter_proposed",
          gp_responded_at: new Date().toISOString(),
          deadline_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        };
        if (action === "counter") {
          insertData.gp_counter_price = parseFloat(counterPrice);
          insertData.gp_message = message || null;
        } else {
          insertData.agreed_price = mission.client_budget;
        }

        const { data, error } = await supabase.from("mission_negotiations").insert(insertData).select().single();
        if (error) throw error;

        if (action === "accept") {
          await supabase.from("routier_missions").update({
            status: "accepted",
            matched_gp_id: gpId,
            accepted_negotiation_id: data.id,
          } as any).eq("id", mission.id);
        } else {
          await supabase.from("routier_missions").update({ status: "negotiating" } as any).eq("id", mission.id);
        }
      } else {
        // Update existing negotiation
        const updateData: any = {
          status: action === "accept" ? "accepted" : "counter_proposed",
          gp_responded_at: new Date().toISOString(),
        };
        if (action === "counter") {
          updateData.gp_counter_price = parseFloat(counterPrice);
          updateData.gp_message = message || null;
        } else {
          updateData.agreed_price = negotiation.client_final_price || negotiation.initial_client_price;
        }

        const { error } = await supabase.from("mission_negotiations").update(updateData).eq("id", negotiation.id);
        if (error) throw error;

        if (action === "accept") {
          await supabase.from("routier_missions").update({
            status: "accepted",
            matched_gp_id: gpId,
            accepted_negotiation_id: negotiation.id,
          } as any).eq("id", mission.id);
        }
      }

      toast({ title: action === "accept" ? "✅ Mission acceptée !" : "💬 Contre-proposition envoyée" });

      // If accepted, convert mission to order + escrow
      if (action === "accept") {
        try {
          const agreedPrice = negotiation
            ? (negotiation.client_final_price || negotiation.initial_client_price)
            : mission.client_budget;

          const missionId = mission.id;
          const { data: orderId, error: convErr } = await supabase.rpc("convert_mission_to_order", {
            p_mission_id: missionId,
            p_gp_id: gpId,
            p_agreed_price: agreedPrice,
          });
          if (convErr) console.warn("[Routier] Mission conversion warning:", convErr.message);
          else console.log("[Routier] Order created:", orderId);
        } catch (convErr) {
          console.warn("[Routier] Conversion non-blocking error:", convErr);
        }
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Client: Accept counter or respond
  const handleClientAction = async (action: "accept" | "counter" | "reject") => {
    if (!negotiation) return;
    setLoading(true);
    try {
      const updateData: any = {
        client_responded_at: new Date().toISOString(),
      };

      if (action === "accept") {
        updateData.status = "accepted";
        updateData.agreed_price = negotiation.gp_counter_price;
        updateData.client_message = message || null;
      } else if (action === "counter") {
        updateData.status = "counter_proposed";
        updateData.client_final_price = parseFloat(counterPrice);
        updateData.client_message = message || null;
        updateData.deadline_at = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      } else {
        updateData.status = "rejected";
      }

      const { error } = await supabase.from("mission_negotiations").update(updateData).eq("id", negotiation.id);
      if (error) throw error;

      if (action === "accept") {
        await supabase.from("routier_missions").update({
          status: "accepted",
          matched_gp_id: negotiation.gp_id,
          accepted_negotiation_id: negotiation.id,
        } as any).eq("id", negotiation.mission_id);
      }

      toast({
        title: action === "accept" ? "✅ Offre acceptée !" : action === "counter" ? "💬 Réponse envoyée" : "Offre refusée",
      });

      // If client accepts, convert mission to order + escrow
      if (action === "accept" && negotiation) {
        try {
          const { data: orderId, error: convErr } = await supabase.rpc("convert_mission_to_order", {
            p_mission_id: negotiation.mission_id,
            p_gp_id: negotiation.gp_id,
            p_agreed_price: negotiation.gp_counter_price,
          });
          if (convErr) console.warn("[Routier] Mission conversion warning:", convErr.message);
          else console.log("[Routier] Order created from client accept:", orderId);
        } catch (convErr) {
          console.warn("[Routier] Conversion non-blocking error:", convErr);
        }
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!mission) return null;

  const isExpired = timeLeft === "Expiré";
  const needsGPResponse = role === "gp" && (!negotiation || (negotiation.status === "counter_proposed" && negotiation.client_final_price));
  const needsClientResponse = role === "client" && negotiation?.status === "counter_proposed" && negotiation?.gp_counter_price && !negotiation?.client_responded_at;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Négociation — {mission.mission_number}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4 overflow-y-auto max-h-[65vh]">
          {/* Mission summary */}
          <div className="p-3 rounded-xl bg-muted/50 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="font-medium">{mission.origin_city}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="font-medium">{mission.destination_city}</span>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>{mission.freight_type}</span>
              <span>{mission.weight_kg} kg</span>
            </div>
          </div>

          {/* Timer */}
          {negotiation && negotiation.deadline_at && (
            <div className={`flex items-center gap-2 p-2 rounded-lg text-sm ${isExpired ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700"}`}>
              <Clock className="w-4 h-4" />
              <span className="font-medium">{isExpired ? "Négociation expirée" : `Temps restant: ${timeLeft}`}</span>
            </div>
          )}

          {/* Price timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-xs text-muted-foreground">Budget client</p>
                <p className="font-bold">{mission.client_budget?.toLocaleString()} {mission.currency}</p>
              </div>
              <Badge variant="secondary">Initial</Badge>
            </div>

            {negotiation?.gp_counter_price && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5">
                <div>
                  <p className="text-xs text-muted-foreground">Contre-proposition transporteur</p>
                  <p className="font-bold text-primary">{negotiation.gp_counter_price.toLocaleString()} {mission.currency}</p>
                  {negotiation.gp_message && <p className="text-xs text-muted-foreground mt-1">"{negotiation.gp_message}"</p>}
                </div>
                <Badge>Contre-offre</Badge>
              </div>
            )}

            {negotiation?.client_final_price && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-blue-500/30 bg-blue-500/5">
                <div>
                  <p className="text-xs text-muted-foreground">Réponse client</p>
                  <p className="font-bold text-blue-600">{negotiation.client_final_price.toLocaleString()} {mission.currency}</p>
                  {negotiation.client_message && <p className="text-xs text-muted-foreground mt-1">"{negotiation.client_message}"</p>}
                </div>
                <Badge variant="secondary">Réponse</Badge>
              </div>
            )}

            {negotiation?.agreed_price && (
              <div className="flex items-center justify-between p-3 rounded-lg border-2 border-green-500 bg-green-500/10">
                <div>
                  <p className="text-xs text-green-700">Prix convenu ✓</p>
                  <p className="font-bold text-green-700 text-lg">{negotiation.agreed_price.toLocaleString()} {mission.currency}</p>
                </div>
                <Badge className="bg-green-500">Accord</Badge>
              </div>
            )}
          </div>

          {/* Action area */}
          {!isExpired && negotiation?.status !== "accepted" && negotiation?.status !== "rejected" && (
            <div className="space-y-3 pt-2">
              {(needsGPResponse || needsClientResponse || !negotiation) && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Votre prix (FCFA)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="number" placeholder="Montant" value={counterPrice}
                        onChange={e => setCounterPrice(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Message (optionnel)</label>
                    <Textarea placeholder="Justifiez votre proposition..." value={message}
                      onChange={e => setMessage(e.target.value)} rows={2} />
                  </div>
                </>
              )}

              <div className="flex gap-2">
                {role === "gp" && (
                  <>
                    <Button variant="outline" className="flex-1" disabled={loading}
                      onClick={() => handleGPAction("accept")}>
                      <Check className="w-4 h-4 mr-1" /> Accepter
                    </Button>
                    <Button className="flex-1" disabled={loading || !counterPrice}
                      onClick={() => handleGPAction("counter")}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-1" />}
                      Contre-proposer
                    </Button>
                  </>
                )}
                {role === "client" && needsClientResponse && (
                  <>
                    <Button variant="outline" size="sm" className="text-destructive" disabled={loading}
                      onClick={() => handleClientAction("reject")}>
                      <X className="w-4 h-4 mr-1" /> Refuser
                    </Button>
                    <Button variant="outline" className="flex-1" disabled={loading}
                      onClick={() => handleClientAction("accept")}>
                      <Check className="w-4 h-4 mr-1" /> Accepter {negotiation?.gp_counter_price?.toLocaleString()}
                    </Button>
                    <Button className="flex-1" disabled={loading || !counterPrice}
                      onClick={() => handleClientAction("counter")}>
                      Contre-proposer
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
