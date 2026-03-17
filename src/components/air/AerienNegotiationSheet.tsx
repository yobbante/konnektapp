/**
 * AerienNegotiationSheet - Proposal sheet for air freight requests
 * GP proposes price, transit days, and included services
 */
import { useState } from "react";
import {
  Plane, Check, MessageCircle, DollarSign, Clock, Loader2, ArrowRight,
  Shield, Package
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AerienNegotiationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: any | null;
  proposal: any | null;
  gpId: string;
  onSuccess?: () => void;
}

export function AerienNegotiationSheet({
  open, onOpenChange, request, proposal, gpId, onSuccess
}: AerienNegotiationSheetProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState("");
  const [transitDays, setTransitDays] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [routing, setRouting] = useState("");
  const [message, setMessage] = useState("");
  const [includesCustoms, setIncludesCustoms] = useState(false);
  const [includesInsurance, setIncludesInsurance] = useState(false);
  const [includesLastMile, setIncludesLastMile] = useState(false);

  if (!request) return null;

  const hasExistingProposal = !!proposal;

  const handleSubmit = async () => {
    if (!price) {
      toast({ title: "Prix requis", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      if (hasExistingProposal) {
        const { error } = await supabase.from("freight_proposals").update({
          price_proposed: parseFloat(price),
          estimated_transit_days: transitDays ? parseInt(transitDays) : null,
          available_pickup_date: pickupDate || null,
          routing_description: routing || null,
          message: message || null,
          includes_customs: includesCustoms,
          includes_insurance: includesInsurance,
          includes_last_mile: includesLastMile,
          status: "pending",
        }).eq("id", proposal.id);

        if (error) throw error;
        toast({ title: "Proposition mise a jour" });
      } else {
        const { error } = await supabase.from("freight_proposals").insert({
          request_id: request.id,
          provider_gp_id: gpId,
          price_proposed: parseFloat(price),
          estimated_transit_days: transitDays ? parseInt(transitDays) : null,
          available_pickup_date: pickupDate || null,
          routing_description: routing || null,
          message: message || null,
          includes_customs: includesCustoms,
          includes_insurance: includesInsurance,
          includes_last_mile: includesLastMile,
          currency: request.currency || "XOF",
          status: "pending",
        });

        if (error) throw error;
        toast({ title: "Proposition envoyee" });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto pb-safe">
        <SheetHeader className="pb-3">
          <SheetTitle className="text-left flex items-center gap-2">
            <Plane className="w-5 h-5 text-primary" />
            {hasExistingProposal ? "Modifier la proposition" : "Proposer un prix"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Request summary */}
          <div className="bg-muted/50 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span>{request.origin_port_or_airport || request.origin_city}</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{request.destination_port_or_airport || request.destination_city}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {request.weight_kg && <Badge variant="outline" className="text-[10px]">{request.weight_kg} kg</Badge>}
              {request.dimensions_cm && <Badge variant="outline" className="text-[10px]">{request.dimensions_cm}</Badge>}
              {request.merchandise_type && <Badge variant="secondary" className="text-[10px]">{request.merchandise_type}</Badge>}
            </div>
            {request.declared_value > 0 && (
              <p className="text-xs text-muted-foreground">
                Budget client : <strong>{request.declared_value?.toLocaleString()} {request.currency || "XOF"}</strong>
              </p>
            )}
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Votre prix total ({request.currency || "XOF"}) *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="number" placeholder="120000" value={price} onChange={e => setPrice(e.target.value)} className="pl-9 h-11 text-base font-semibold" />
            </div>
          </div>

          {/* Transit + Pickup */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">Transit (jours)</Label>
              <Input type="number" placeholder="3" value={transitDays} onChange={e => setTransitDays(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">Date d'enlèvement</Label>
              <Input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} className="h-9 text-xs" />
            </div>
          </div>

          {/* Routing */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground">Routing / Itinéraire</Label>
            <Input placeholder="CDG → DSS direct" value={routing} onChange={e => setRouting(e.target.value)} className="h-9 text-xs" />
          </div>

          {/* Included services */}
          <div className="space-y-2">
            <Label className="text-xs font-bold">Services inclus</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-primary" /><span className="text-xs">Dédouanement</span></div>
                <Switch checked={includesCustoms} onCheckedChange={setIncludesCustoms} />
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-primary" /><span className="text-xs">Assurance cargo</span></div>
                <Switch checked={includesInsurance} onCheckedChange={setIncludesInsurance} />
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2"><Package className="w-3.5 h-3.5 text-primary" /><span className="text-xs">Livraison finale</span></div>
                <Switch checked={includesLastMile} onCheckedChange={setIncludesLastMile} />
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground">Message au client</Label>
            <Textarea placeholder="Conditions, délais, compagnie aérienne..." value={message} onChange={e => setMessage(e.target.value)} rows={3} className="text-xs" />
          </div>

          {/* Submit */}
          <Button className="w-full h-12" onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            {hasExistingProposal ? "Mettre à jour" : "Envoyer la proposition"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}