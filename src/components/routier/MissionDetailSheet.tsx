/**
 * MissionDetailSheet - Full detail view of a routier mission for clients
 * Shows mission info, all negotiations, and action buttons
 */
import { motion } from "framer-motion";
import {
  Truck, Clock, MapPin, Scale, Package, MessageCircle,
  Check, X, ChevronRight, ArrowRight, Zap
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MissionDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mission: any | null;
  negotiations: any[];
  onOpenNegotiation: (neg: any) => void;
  onRefresh: () => void;
}

const negStatusLabel: Record<string, { label: string; color: string }> = {
  accepted: { label: "Accepte", color: "text-green-700 bg-green-500/10" },
  counter_proposed: { label: "Contre-offre", color: "text-primary bg-primary/10" },
  rejected: { label: "Refuse", color: "text-destructive bg-destructive/10" },
  expired: { label: "Expire", color: "text-muted-foreground bg-muted" },
  pending: { label: "En attente", color: "text-amber-700 bg-amber-500/10" },
};

export function MissionDetailSheet({
  open, onOpenChange, mission, negotiations, onOpenNegotiation
}: MissionDetailSheetProps) {
  if (!mission) return null;

  const isExpired = mission.status === "expired" || mission.status === "cancelled";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Truck className="w-4 h-4 text-primary" />
            Mission {mission.mission_number || ""}
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto max-h-[70vh] space-y-4">
          {/* Route summary */}
          <div className={cn(
            "p-3 rounded-lg border",
            isExpired ? "bg-muted/30 border-muted" : "bg-card border-border"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("w-2 h-2 rounded-full", isExpired ? "bg-muted-foreground" : "bg-green-500")} />
              <span className="text-sm font-semibold">{mission.origin_city}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="text-sm font-semibold">{mission.destination_city}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Scale className="w-3 h-3" />
                {mission.weight_kg} kg
              </div>
              <div className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                <span className="capitalize truncate">{mission.freight_type}</span>
              </div>
              {mission.vehicle_type_required && (
                <div className="flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  {mission.vehicle_type_required}
                </div>
              )}
            </div>
          </div>

          {/* Budget */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Budget</p>
              <p className={cn("text-lg font-bold", isExpired ? "text-muted-foreground" : "text-foreground")}>
                {(mission.client_budget || mission.estimated_price)?.toLocaleString()} {mission.currency}
              </p>
            </div>
            <Badge className={cn(
              "text-[10px]",
              isExpired ? "bg-muted text-muted-foreground" : 
              mission.status === "accepted" ? "bg-green-500/10 text-green-700" :
              mission.status === "negotiating" ? "bg-purple-500/10 text-purple-700" :
              "bg-amber-500/10 text-amber-700"
            )} variant="secondary">
              {mission.status === "accepted" ? "Acceptee" :
               mission.status === "negotiating" ? "En negociation" :
               mission.status === "expired" ? "Expiree" :
               mission.status === "cancelled" ? "Annulee" :
               "En recherche"}
            </Badge>
          </div>

          {/* Date info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
            <span>Cree le {format(new Date(mission.created_at), "d MMM yyyy", { locale: fr })}</span>
            {mission.pickup_date && (
              <span>Enlevement: {format(new Date(mission.pickup_date), "d MMM", { locale: fr })}</span>
            )}
          </div>

          <Separator />

          {/* Negotiations */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Propositions ({negotiations.length})
            </h4>

            {negotiations.length === 0 ? (
              <div className="py-6 text-center">
                <Clock className="w-5 h-5 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Aucune proposition reçue</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {negotiations.map(neg => {
                  const isNegExpired = neg.status === "expired" || neg.status === "rejected";
                  const needsResponse = neg.status === "counter_proposed" && neg.gp_counter_price && !neg.client_responded_at;
                  const statusCfg = negStatusLabel[neg.status] || negStatusLabel.pending;

                  return (
                    <motion.button
                      key={neg.id}
                      onClick={() => onOpenNegotiation(neg)}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left transition-all active:scale-[0.98]",
                        isNegExpired && "opacity-50 grayscale",
                        needsResponse && !isNegExpired && "border-primary/40 bg-primary/5",
                        neg.status === "accepted" && "border-green-500/40 bg-green-500/5",
                        !isNegExpired && !needsResponse && neg.status !== "accepted" && "border-border"
                      )}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold">
                          {neg.gp_counter_price?.toLocaleString() || neg.initial_client_price?.toLocaleString()} {mission.currency}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", statusCfg.color)}>
                            {needsResponse ? "A repondre" : statusCfg.label}
                          </Badge>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      </div>
                      {neg.gp_message && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          "{neg.gp_message}"
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(neg.created_at), "d MMM HH:mm", { locale: fr })}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Additional details */}
          {(mission.notes || mission.special_requirements) && (
            <>
              <Separator />
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Details supplementaires
                </h4>
                {mission.notes && <p className="text-xs text-foreground">{mission.notes}</p>}
                {mission.special_requirements && (
                  <p className="text-xs text-muted-foreground mt-1">{mission.special_requirements}</p>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
