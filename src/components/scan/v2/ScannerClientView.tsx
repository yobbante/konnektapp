/**
 * ScannerClientView V2 — Backend-driven Client scan result
 * 
 * RULES:
 * - Read-mostly: client sees state, timeline, ETA
 * - One possible action: pay supplement (if weight_pending_payment)
 * - Zero business logic — state is always from engine response
 * - No DB calls. Payment redirect only.
 */
import { motion } from "framer-motion";
import {
  CheckCircle, Clock, Truck, MapPin, Package, Shield,
  AlertTriangle, Zap, ChevronRight, Star, CreditCard, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { ScanEngineResponse } from "@/lib/scanEngine";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// ─── Timeline config ──────────────────────────────────────────────────────────

const TIMELINE_STEPS = [
  { state: "paid_held",              label: "Paiement confirmé",     icon: Shield },
  { state: "checked_in",             label: "Colis enregistré",      icon: Package },
  { state: "in_transit",             label: "En transit",            icon: Truck },
  { state: "arrived_destination",    label: "Arrivé à destination",  icon: MapPin },
  { state: "delivery_confirmed",     label: "Livré",                 icon: CheckCircle },
  { state: "released",               label: "Terminé",               icon: Zap },
];

const STATE_ORDER: Record<string, number> = {
  pending: -1, accepted: 0, paid_held: 1, checked_in: 2,
  weight_pending_payment: 2.5, scheduled_departure: 2.8,
  in_transit: 3, arrived_destination: 4,
  delivery_pending: 4.5, delivery_confirmed: 5, delivered: 5,
  released: 6, cancelled: -99, disputed: -98,
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function resolveClientPayload(response: ScanEngineResponse) {
  const d = response.data;
  if (!d?.order) return null;
  const order = d.order;
  return {
    order_id: order.id,
    order_number: order.order_number,
    current_state: order.status,
    display_payload: {
      origin_city: order.origin_city,
      destination_city: order.destination_city,
      origin_country: order.origin_country,
      destination_country: order.destination_country,
      weight: order.weight,
      gp_name: order.gp_name,
      eta: order.delivery_date,
      supplement_amount: d.supplement_amount,
      currency: order.currency || "XOF",
      premium: d.premium_status,
      geo_status: d.geo_status,
      is_disputed: order.status === "disputed",
      is_cancelled: order.status === "cancelled",
    },
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ClientTimeline({ currentState, darkMode }: { currentState: string; darkMode?: boolean }) {
  const currentIndex = STATE_ORDER[currentState] ?? 0;
  const textSub = darkMode ? "text-white/40" : "text-muted-foreground";

  return (
    <div className="relative">
      {TIMELINE_STEPS.map((step, i) => {
        const stepIndex = STATE_ORDER[step.state] ?? i;
        const isDone = currentIndex >= stepIndex;
        const isCurrent = currentState === step.state ||
          (currentIndex > stepIndex - 0.5 && currentIndex < stepIndex + 0.5);
        const Icon = step.icon;

        return (
          <div key={step.state} className="flex items-start gap-3 mb-4 last:mb-0">
            {/* Icon */}
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                isDone
                  ? "bg-emerald-500/20 border-emerald-400/60"
                  : darkMode
                    ? "bg-white/[0.04] border-white/[0.10]"
                    : "bg-muted/40 border-border/40"
              )}>
                <Icon className={cn("w-3.5 h-3.5", isDone ? "text-emerald-400" : textSub)} />
              </div>
              {i < TIMELINE_STEPS.length - 1 && (
                <div className={cn(
                  "w-0.5 h-6 mt-1",
                  isDone ? "bg-emerald-400/40" : darkMode ? "bg-white/[0.07]" : "bg-border/40"
                )} />
              )}
            </div>

            {/* Label */}
            <div className="pt-1.5">
              <p className={cn(
                "text-xs font-semibold",
                isDone
                  ? (darkMode ? "text-white/90" : "text-foreground")
                  : textSub
              )}>
                {step.label}
              </p>
              {isCurrent && !isDone && (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-medium mt-0.5">
                  <Clock className="w-2.5 h-2.5" /> En cours
                </span>
              )}
              {isDone && i === TIMELINE_STEPS.findIndex(s => STATE_ORDER[s.state] === Math.floor(currentIndex)) && (
                <span className={cn("text-[10px] mt-0.5", darkMode ? "text-emerald-400/70" : "text-emerald-600")}>
                  ✓
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SupplementBlock({ orderId, amount, currency, darkMode }: {
  orderId: string; amount: number; currency: string; darkMode?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl border-2 border-red-400/40 bg-red-500/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-red-400">Supplément de poids requis</p>
          <p className="text-[11px] text-red-300/70">
            Votre colis est plus lourd que déclaré. Payez pour continuer.
          </p>
        </div>
      </div>
      <div className="bg-red-500/15 rounded-xl p-3 text-center">
        <p className="text-[10px] text-red-300/70 uppercase tracking-wider">À payer</p>
        <p className="text-2xl font-bold text-red-400 mt-0.5">
          {amount.toLocaleString()} {currency}
        </p>
      </div>
      <Button
        className="w-full h-11 bg-red-500 hover:bg-red-600 text-white font-semibold"
        onClick={() => navigate(`/pay-supplement?orderId=${orderId}`)}
      >
        <CreditCard className="w-4 h-4 mr-2" />
        Payer le supplément
      </Button>
    </div>
  );
}

function FinalBlock({ state, darkMode }: { state: string; darkMode?: boolean }) {
  const textSub = darkMode ? "text-white/40" : "text-muted-foreground";

  if (state === "released" || state === "delivery_confirmed") return (
    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5 text-center space-y-2">
      <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
        <CheckCircle className="w-6 h-6 text-emerald-400" />
      </div>
      <p className="font-bold text-emerald-400">Livraison confirmée</p>
      <p className={cn("text-xs", textSub)}>
        {state === "released"
          ? "Le paiement a été libéré au transporteur."
          : "Livraison enregistrée. Paiement en cours de traitement."}
      </p>
    </div>
  );

  if (state === "disputed") return (
    <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-red-400" />
        <p className="font-bold text-red-400 text-sm">Litige en cours</p>
      </div>
      <p className={cn("text-xs", textSub)}>
        Un litige a été ouvert sur cette commande. Nos équipes examinent la situation.
      </p>
    </div>
  );

  if (state === "cancelled") return (
    <div className={cn("rounded-2xl border p-4 text-center space-y-2",
      darkMode ? "border-white/10 bg-white/[0.03]" : "border-border/50 bg-muted/30")}>
      <AlertTriangle className={cn("w-8 h-8 mx-auto", textSub)} />
      <p className={cn("font-bold text-sm", textSub)}>Commande annulée</p>
    </div>
  );

  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ScannerClientViewProps {
  engineResponse: ScanEngineResponse;
  darkMode?: boolean;
}

export function ScannerClientView({ engineResponse, darkMode = true }: ScannerClientViewProps) {
  const payload = resolveClientPayload(engineResponse);

  const textPrimary = darkMode ? "text-white/90" : "text-foreground";
  const textSub = darkMode ? "text-white/40" : "text-muted-foreground";
  const cardBg = darkMode ? "bg-white/[0.04] border-white/[0.07]" : "bg-card border-border/50";

  if (!payload) {
    return (
      <div className={cn("text-center py-10 space-y-2", textSub)}>
        <Package className="w-10 h-10 mx-auto opacity-30" />
        <p className="text-sm">{engineResponse.message || "Scan non reconnu."}</p>
      </div>
    );
  }

  const { current_state, display_payload: dp, order_id, order_number } = payload;
  const isTerminal = ["released", "delivery_confirmed", "disputed", "cancelled"].includes(current_state);
  const isSupplementBlocked = current_state === "weight_pending_payment";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Read-only badge */}
      <div className="flex items-center gap-2">
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border",
          darkMode
            ? "text-emerald-400 bg-emerald-500/10 border-emerald-400/20"
            : "text-primary bg-primary/10 border-primary/20"
        )}>
          <Eye className="w-3 h-3" />
          Suivi en temps réel
        </span>
        {dp.premium && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-400/30">
            <Star className="w-2.5 h-2.5" /> Premium
          </span>
        )}
      </div>

      {/* Order card */}
      <div className={cn("rounded-2xl border p-4 space-y-4", cardBg)}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className={cn("font-mono font-bold text-sm", textPrimary)}>{order_number}</p>
            <div className={cn("flex items-center gap-1.5 text-xs mt-0.5", textSub)}>
              <span>{dp.origin_city}</span>
              <ChevronRight className="w-3 h-3" />
              <span>{dp.destination_city}</span>
            </div>
          </div>
          {dp.gp_name && (
            <div className="text-right">
              <p className={cn("text-[10px] uppercase tracking-wider", textSub)}>Transporteur</p>
              <p className={cn("text-xs font-semibold", textPrimary)}>{dp.gp_name}</p>
            </div>
          )}
        </div>

        {/* ETA */}
        {dp.eta && !isTerminal && (
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs",
            darkMode ? "bg-white/[0.03]" : "bg-muted/40"
          )}>
            <Clock className={cn("w-3.5 h-3.5", darkMode ? "text-emerald-400" : "text-primary")} />
            <span className={textSub}>Livraison estimée :</span>
            <span className={cn("font-semibold", textPrimary)}>
              {format(new Date(dp.eta), "d MMMM yyyy", { locale: fr })}
            </span>
          </div>
        )}

        {/* Timeline */}
        {!dp.is_cancelled && !dp.is_disputed && (
          <div className={cn("pt-2 border-t", darkMode ? "border-white/[0.05]" : "border-border/30")}>
            <p className={cn("text-[10px] uppercase tracking-wider font-medium mb-3", textSub)}>
              Progression
            </p>
            <ClientTimeline currentState={current_state} darkMode={darkMode} />
          </div>
        )}
      </div>

      {/* Supplement block */}
      {isSupplementBlocked && dp.supplement_amount != null && (
        <SupplementBlock
          orderId={order_id}
          amount={dp.supplement_amount}
          currency={dp.currency}
          darkMode={darkMode}
        />
      )}

      {/* Terminal / final blocks */}
      {isTerminal && <FinalBlock state={current_state} darkMode={darkMode} />}

      {/* Delivery pending info for client */}
      {current_state === "delivery_pending" && (
        <div className={cn("rounded-2xl border p-4 space-y-2", cardBg)}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className={cn("text-sm font-semibold", textPrimary)}>Livraison initiée</p>
          </div>
          <p className={cn("text-xs", textSub)}>
            Votre transporteur est prêt à remettre le colis. Un code de livraison vous a été envoyé par SMS.
            Communiquez-le au transporteur lors de la remise.
          </p>
        </div>
      )}
    </motion.div>
  );
}
