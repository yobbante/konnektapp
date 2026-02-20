/**
 * ScannerGPView V2 — Backend-driven GP scan result
 * 
 * RULES:
 * - Renders ONLY what the engine returns via allowed_actions[]
 * - Zero business logic: no status decisions, no escrow math
 * - All mutations via POST to scan-engine → executeAction()
 * - Button disabled immediately on press → loader → re-fetch
 * - No optimistic local state updates
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Truck, CheckCircle, AlertTriangle, KeyRound,
  Send, Scale, Clock, Plane, MapPin, Shield, Zap,
  Loader2, ChevronRight, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useScanEngine } from "@/hooks/useScanEngine";
import type { ScanEngineResponse } from "@/lib/scanEngine";

// ─── Types ───────────────────────────────────────────────────────────────────

export type GPAllowedAction =
  | "deposit_confirm"
  | "weight_modify"
  | "mark_transit"
  | "prepare_delivery"
  | "confirm_delivery"
  | "view"
  | string;

export interface ScannerGPPayload {
  order_id: string;
  order_number: string;
  current_state: string;
  financial_status: string;
  allowed_actions: GPAllowedAction[];
  display_payload: {
    origin_city: string;
    destination_city: string;
    weight: number;
    declared_weight?: number;
    price_per_kg: number;
    currency: string;
    client_name?: string;
    description?: string;
    departure_date?: string;
    eta?: string;
    supplement_amount?: number;
    geo_status?: string;
    premium?: boolean;
    transport_type?: string;
  };
}

interface ScannerGPViewProps {
  /** Raw engine response — source of truth */
  engineResponse: ScanEngineResponse;
  /** Called when an action completes successfully — parent re-fetches */
  onActionComplete: () => void;
  /** Dark mode flag inherited from parent sheet */
  darkMode?: boolean;
}

// ─── State config ─────────────────────────────────────────────────────────────

const STATE_CONFIG: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
}> = {
  pending:                  { label: "En attente",              icon: Clock,       color: "text-amber-400",  bg: "bg-amber-500/10",   border: "border-amber-400/30" },
  accepted:                 { label: "Acceptée",                icon: CheckCircle, color: "text-primary",    bg: "bg-primary/10",     border: "border-primary/30" },
  paid_held:                { label: "Paiement reçu",           icon: Shield,      color: "text-emerald-400",bg: "bg-emerald-500/10", border: "border-emerald-400/30" },
  checked_in:               { label: "Colis enregistré",        icon: Package,     color: "text-primary",    bg: "bg-primary/10",     border: "border-primary/30" },
  weight_pending_payment:   { label: "Supplément requis",       icon: AlertTriangle,color:"text-red-400",   bg: "bg-red-500/10",     border: "border-red-400/50" },
  scheduled_departure:      { label: "Départ programmé",        icon: Plane,       color: "text-sky-400",   bg: "bg-sky-500/10",     border: "border-sky-400/30" },
  in_transit:               { label: "En transit",              icon: Truck,       color: "text-sky-400",   bg: "bg-sky-500/10",     border: "border-sky-400/30" },
  arrived_destination:      { label: "Arrivé à destination",    icon: MapPin,      color: "text-emerald-400",bg: "bg-emerald-500/10", border: "border-emerald-400/30" },
  delivery_pending:         { label: "Livraison à initier",     icon: Send,        color: "text-amber-400", bg: "bg-amber-500/10",   border: "border-amber-400/30" },
  delivery_confirmed:       { label: "Livraison confirmée",     icon: CheckCircle, color: "text-emerald-400",bg: "bg-emerald-500/10", border: "border-emerald-400/30" },
  released:                 { label: "Terminée — Payé",         icon: Zap,         color: "text-emerald-400",bg: "bg-emerald-500/10", border: "border-emerald-400/30" },
  cancelled:                { label: "Annulée",                 icon: AlertTriangle,color:"text-red-400",   bg: "bg-red-500/10",     border: "border-red-400/30" },
  disputed:                 { label: "En litige",               icon: Shield,      color: "text-red-400",   bg: "bg-red-500/10",     border: "border-red-400/50" },
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function resolvePayload(response: ScanEngineResponse): ScannerGPPayload | null {
  const d = response.data;
  if (!d?.order) return null;

  const order = d.order;
  const allowed = d.allowed_actions || d.engine?.allowed_actions || [];

  return {
    order_id: order.id,
    order_number: order.order_number,
    current_state: order.status,
    financial_status: order.financial_status || "unknown",
    allowed_actions: allowed,
    display_payload: {
      origin_city: order.origin_city,
      destination_city: order.destination_city,
      weight: order.weight,
      declared_weight: order.declared_weight,
      price_per_kg: order.price_per_kg,
      currency: order.currency || "XOF",
      client_name: order.client_name,
      description: order.description,
      departure_date: order.departure_date,
      eta: order.delivery_date,
      supplement_amount: d.supplement_amount,
      geo_status: d.geo_status,
      premium: d.premium_status,
      transport_type: order.transport_type,
    },
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StateBadge({ state, darkMode }: { state: string; darkMode?: boolean }) {
  const cfg = STATE_CONFIG[state] || {
    label: state, icon: Clock, color: "text-muted-foreground",
    bg: "bg-muted/30", border: "border-border/30",
  };
  const Icon = cfg.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border",
      cfg.color, cfg.bg, cfg.border,
    )}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function OrderHeader({ payload, darkMode }: { payload: ScannerGPPayload; darkMode?: boolean }) {
  const dp = payload.display_payload;
  const textPrimary = darkMode ? "text-white/90" : "text-foreground";
  const textSub = darkMode ? "text-white/40" : "text-muted-foreground";
  const cardBg = darkMode ? "bg-white/[0.04] border-white/[0.07]" : "bg-card border-border/50";

  return (
    <div className={cn("rounded-2xl border p-4 space-y-3", cardBg)}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={cn("font-mono font-bold text-sm", textPrimary)}>{payload.order_number}</p>
          <div className={cn("flex items-center gap-1.5 text-xs mt-0.5", textSub)}>
            <span>{dp.origin_city}</span>
            <ChevronRight className="w-3 h-3" />
            <span>{dp.destination_city}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StateBadge state={payload.current_state} darkMode={darkMode} />
          {dp.premium && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-400/30">
              <Star className="w-2.5 h-2.5" /> Premium
            </span>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Poids", value: `${dp.weight} kg` },
          { label: "Prix/kg", value: `${dp.price_per_kg} ${dp.currency}` },
          { label: "Client", value: dp.client_name || "—" },
        ].map(({ label, value }) => (
          <div key={label} className={cn("rounded-xl p-2.5", darkMode ? "bg-white/[0.03]" : "bg-muted/40")}>
            <p className={cn("text-[9px] uppercase tracking-wider font-medium", textSub)}>{label}</p>
            <p className={cn("text-xs font-semibold mt-0.5 truncate", textPrimary)}>{value}</p>
          </div>
        ))}
      </div>

      {/* ETA */}
      {dp.eta && (
        <div className={cn("flex items-center gap-2 text-xs px-3 py-2 rounded-xl", darkMode ? "bg-white/[0.03]" : "bg-muted/40")}>
          <MapPin className={cn("w-3.5 h-3.5", darkMode ? "text-amber-400" : "text-primary")} />
          <span className={textSub}>Livraison estimée :</span>
          <span className={cn("font-semibold", textPrimary)}>
            {new Date(dp.eta).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
          </span>
        </div>
      )}

      {/* Description */}
      {dp.description && (
        <p className={cn("text-xs px-3 py-2 rounded-xl", darkMode ? "bg-white/[0.03] text-white/40" : "bg-muted/40 text-muted-foreground")}>
          📦 {dp.description}
        </p>
      )}
    </div>
  );
}

// ─── Action Blocks ────────────────────────────────────────────────────────────

function ActionDepositConfirm({ orderId, payload, executing, execute, darkMode }: {
  orderId: string; payload: ScannerGPPayload;
  executing: boolean; execute: (action: string, data?: Record<string, any>) => Promise<void>;
  darkMode?: boolean;
}) {
  const [weight, setWeight] = useState(payload.display_payload.weight.toString());
  const actual = parseFloat(weight) || payload.display_payload.weight;
  const diff = actual - payload.display_payload.weight;
  const priceDiff = Math.round(diff * payload.display_payload.price_per_kg);
  const hasChange = Math.abs(diff) > 0.05;
  const textSub = darkMode ? "text-white/50" : "text-muted-foreground";
  const cardBg = darkMode ? "bg-white/[0.04] border-white/[0.07]" : "bg-card border-border/50";
  const inputBg = darkMode ? "bg-white/[0.06] border-white/[0.10] text-white" : "";

  return (
    <div className={cn("rounded-2xl border p-4 space-y-4", cardBg)}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center">
          <Scale className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <p className={cn("text-sm font-semibold", darkMode ? "text-white/90" : "text-foreground")}>
            Vérification du poids
          </p>
          <p className={cn("text-[11px]", textSub)}>Poids déclaré : {payload.display_payload.weight} kg</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={cn("rounded-xl p-3", darkMode ? "bg-white/[0.03]" : "bg-muted/40")}>
          <p className={cn("text-[9px] uppercase tracking-wider mb-1", textSub)}>Déclaré</p>
          <p className={cn("text-xl font-bold", darkMode ? "text-white/90" : "text-foreground")}>
            {payload.display_payload.weight}<span className="text-sm font-normal ml-1">kg</span>
          </p>
        </div>
        <div className={cn("rounded-xl p-3 border-2", darkMode ? "bg-amber-500/5 border-amber-400/30" : "bg-primary/5 border-primary/30")}>
          <p className={cn("text-[9px] uppercase tracking-wider mb-1 text-amber-400")}>Réel (balancé)</p>
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={cn(
              "w-full text-xl font-bold bg-transparent border-0 outline-none p-0",
              darkMode ? "text-white" : "text-foreground"
            )}
          />
        </div>
      </div>

      <AnimatePresence>
        {hasChange && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={cn("rounded-xl p-3 border", diff > 0
              ? "bg-red-500/10 border-red-400/30"
              : "bg-emerald-500/10 border-emerald-400/30"
            )}
          >
            <p className={cn("text-xs font-semibold mb-1", diff > 0 ? "text-red-400" : "text-emerald-400")}>
              {diff > 0 ? "⚠️ Excédent de poids" : "✓ Poids inférieur"}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className={textSub}>Différence</p>
                <p className={cn("font-bold", diff > 0 ? "text-red-400" : "text-emerald-400")}>
                  {diff > 0 ? "+" : ""}{diff.toFixed(1)} kg
                </p>
              </div>
              <div>
                <p className={textSub}>Supplément</p>
                <p className={cn("font-bold", diff > 0 ? "text-red-400" : "text-emerald-400")}>
                  {priceDiff > 0 ? "+" : ""}{priceDiff.toLocaleString()} {payload.display_payload.currency}
                </p>
              </div>
            </div>
            {diff > 0 && (
              <p className={cn("text-[10px] mt-2", textSub)}>
                Le client devra payer le supplément avant le départ
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        className="w-full h-11 font-semibold"
        disabled={executing}
        onClick={() => execute(hasChange ? "weight_modify" : "deposit_confirm", {
          actual_weight: actual,
          declared_weight: payload.display_payload.weight,
          price_diff: priceDiff,
        })}
      >
        {executing ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Package className="w-4 h-4 mr-2" />
        )}
        {hasChange ? "Soumettre modification" : "Confirmer le dépôt"}
      </Button>
    </div>
  );
}

function ActionWeightPending({ orderId, payload, executing, execute, darkMode }: {
  orderId: string; payload: ScannerGPPayload;
  executing: boolean; execute: (action: string, data?: Record<string, any>) => Promise<void>;
  darkMode?: boolean;
}) {
  return (
    <div className="rounded-2xl border-2 border-red-400/40 bg-red-500/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <div>
          <p className="text-sm font-bold text-red-400">Supplément requis</p>
          <p className="text-[11px] text-red-300/70">Transport bloqué jusqu'au paiement client</p>
        </div>
      </div>
      {payload.display_payload.supplement_amount != null && (
        <div className="bg-red-500/15 rounded-xl p-3 text-center">
          <p className="text-[10px] text-red-300/70 uppercase tracking-wider">Montant dû</p>
          <p className="text-2xl font-bold text-red-400 mt-0.5">
            {payload.display_payload.supplement_amount.toLocaleString()} {payload.display_payload.currency}
          </p>
        </div>
      )}
      <p className="text-[11px] text-red-300/60 text-center">
        Le client a été notifié. Aucune action GP possible jusqu'au paiement.
      </p>
    </div>
  );
}

function ActionDelivery({ orderId, payload, executing, execute, darkMode }: {
  orderId: string; payload: ScannerGPPayload;
  executing: boolean; execute: (action: string, data?: Record<string, any>) => Promise<void>;
  darkMode?: boolean;
}) {
  const [phase, setPhase] = useState<"init" | "code">("init");
  const [code, setCode] = useState("");
  const textSub = darkMode ? "text-white/50" : "text-muted-foreground";
  const cardBg = darkMode ? "bg-white/[0.04] border-white/[0.07]" : "bg-card border-border/50";

  return (
    <div className={cn("rounded-2xl border p-4 space-y-4", cardBg)}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
          <Truck className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <p className={cn("text-sm font-semibold", darkMode ? "text-white/90" : "text-foreground")}>
            Confirmer la livraison
          </p>
          <p className={cn("text-[11px]", textSub)}>
            {payload.display_payload.client_name || "Client"} · {payload.display_payload.destination_city}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "init" ? (
          <motion.div
            key="init"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className={cn("rounded-xl p-3 text-xs space-y-1.5", darkMode ? "bg-white/[0.03]" : "bg-muted/40")}>
              <p className={cn("font-medium", darkMode ? "text-white/70" : "text-foreground")}>
                📱 Processus de livraison sécurisé :
              </p>
              <ol className={cn("space-y-1 pl-3 list-decimal", textSub)}>
                <li>Un code 6 chiffres est envoyé au client/destinataire</li>
                <li>Vous saisissez le code qu'il vous communique</li>
                <li>Paiement libéré automatiquement</li>
              </ol>
            </div>
            <Button
              className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
              onClick={() => setPhase("code")}
              disabled={executing}
            >
              <Send className="w-4 h-4 mr-2" />
              Initier la livraison
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="code"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-3"
          >
            <div className="rounded-xl border-2 border-emerald-400/30 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-400">Code de livraison</p>
              </div>
              <p className={cn("text-xs", textSub)}>
                Demandez le code à {payload.display_payload.client_name || "le client"} :
              </p>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex: A3F29B"
                className="font-mono text-center text-xl tracking-[0.4em] h-14 border-2 border-emerald-400/30 bg-emerald-500/5"
                maxLength={6}
                autoFocus
              />
              <p className={cn("text-[10px] text-center", textSub)}>
                Max 3 tentatives · Expiration automatique
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-11"
                onClick={() => { setCode(""); setPhase("init"); }}
                disabled={executing}
              >
                Retour
              </Button>
              <Button
                className="h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                onClick={() => execute("confirm_delivery", { delivery_code: code })}
                disabled={executing || code.length < 4}
              >
                {executing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Valider
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionPrepareDelivery({ orderId, executing, execute, darkMode }: {
  orderId: string; executing: boolean;
  execute: (action: string, data?: Record<string, any>) => Promise<void>;
  darkMode?: boolean;
}) {
  const cardBg = darkMode ? "bg-white/[0.04] border-white/[0.07]" : "bg-card border-border/50";
  const textSub = darkMode ? "text-white/50" : "text-muted-foreground";
  return (
    <div className={cn("rounded-2xl border p-4 space-y-3", cardBg)}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-sky-500/15 flex items-center justify-center">
          <MapPin className="w-4 h-4 text-sky-400" />
        </div>
        <p className={cn("text-sm font-semibold", darkMode ? "text-white/90" : "text-foreground")}>
          Arrivé à destination
        </p>
      </div>
      <p className={cn("text-xs", textSub)}>
        Préparez la livraison au destinataire. Le code sera demandé lors de la remise.
      </p>
      <Button
        className="w-full h-11 font-semibold"
        onClick={() => execute("prepare_delivery")}
        disabled={executing}
      >
        {executing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
        Préparer la livraison
      </Button>
    </div>
  );
}

function TerminalBlock({ state, darkMode }: { state: string; darkMode?: boolean }) {
  const isReleased = state === "released";
  const isDisputed = state === "disputed";
  const isCancelled = state === "cancelled";
  const textSub = darkMode ? "text-white/40" : "text-muted-foreground";

  if (isReleased) return (
    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5 text-center space-y-2">
      <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
        <Zap className="w-6 h-6 text-emerald-400" />
      </div>
      <p className="font-bold text-emerald-400">Mission accomplie</p>
      <p className={cn("text-xs", textSub)}>Les fonds ont été libérés. Cette commande est clôturée.</p>
    </div>
  );

  if (isDisputed) return (
    <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-5 text-center space-y-2">
      <Shield className="w-8 h-8 text-red-400 mx-auto" />
      <p className="font-bold text-red-400">Litige en cours</p>
      <p className={cn("text-xs", textSub)}>Toutes les actions sont bloquées. Contactez le support.</p>
    </div>
  );

  if (isCancelled) return (
    <div className={cn("rounded-2xl border p-5 text-center space-y-2",
      darkMode ? "border-white/10 bg-white/[0.03]" : "border-border/50 bg-muted/30")}>
      <AlertTriangle className={cn("w-8 h-8 mx-auto", textSub)} />
      <p className={cn("font-bold", textSub)}>Commande annulée</p>
    </div>
  );

  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ScannerGPView({ engineResponse, onActionComplete, darkMode = true }: ScannerGPViewProps) {
  const { executeAction, executing } = useScanEngine({ autoNavigate: false });

  const payload = resolvePayload(engineResponse);

  const execute = useCallback(async (action: string, data?: Record<string, any>) => {
    if (!payload) return;
    const result = await executeAction(action as any, payload.order_id, data);
    if (result?.status === "executed") {
      onActionComplete();
    }
  }, [payload, executeAction, onActionComplete]);

  // ── No payload ──
  if (!payload) {
    const textSub = darkMode ? "text-white/40" : "text-muted-foreground";
    return (
      <div className={cn("text-center py-10 space-y-2", textSub)}>
        <Package className="w-10 h-10 mx-auto opacity-30" />
        <p className="text-sm">{engineResponse.message || "Impossible de résoudre ce scan."}</p>
      </div>
    );
  }

  const { current_state, allowed_actions } = payload;
  const isTerminal = ["released", "cancelled", "disputed"].includes(current_state);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Order header — always visible */}
      <OrderHeader payload={payload} darkMode={darkMode} />

      {/* Terminal states — no actions */}
      {isTerminal && <TerminalBlock state={current_state} darkMode={darkMode} />}

      {/* Action blocks — driven by allowed_actions[] from engine */}
      {!isTerminal && (
        <>
          {/* weight_pending_payment — red alert block, no GP action */}
          {current_state === "weight_pending_payment" && (
            <ActionWeightPending
              orderId={payload.order_id}
              payload={payload}
              executing={executing}
              execute={execute}
              darkMode={darkMode}
            />
          )}

          {/* deposit_confirm OR weight_modify */}
          {(allowed_actions.includes("deposit_confirm") || allowed_actions.includes("weight_modify")) &&
            current_state !== "weight_pending_payment" && (
            <ActionDepositConfirm
              orderId={payload.order_id}
              payload={payload}
              executing={executing}
              execute={execute}
              darkMode={darkMode}
            />
          )}

          {/* confirm_delivery */}
          {allowed_actions.includes("confirm_delivery") && (
            <ActionDelivery
              orderId={payload.order_id}
              payload={payload}
              executing={executing}
              execute={execute}
              darkMode={darkMode}
            />
          )}

          {/* prepare_delivery */}
          {allowed_actions.includes("prepare_delivery") && !allowed_actions.includes("confirm_delivery") && (
            <ActionPrepareDelivery
              orderId={payload.order_id}
              executing={executing}
              execute={execute}
              darkMode={darkMode}
            />
          )}

          {/* View-only states */}
          {allowed_actions.length === 0 || (allowed_actions.length === 1 && allowed_actions[0] === "view") ? (
            (() => {
              const textSub = darkMode ? "text-white/40" : "text-muted-foreground";
              const cardBg = darkMode ? "bg-white/[0.03] border-white/[0.06]" : "bg-muted/30 border-border/40";
              return (
                <div className={cn("rounded-2xl border p-4 text-center space-y-1.5", cardBg)}>
                  <p className={cn("text-xs font-medium", textSub)}>
                    Aucune action disponible pour cet état
                  </p>
                  <StateBadge state={current_state} darkMode={darkMode} />
                </div>
              );
            })()
          ) : null}
        </>
      )}
    </motion.div>
  );
}
