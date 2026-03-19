/**
 * ScanResultGP - GP scan result with deposit/delivery actions
 * 
 * ALL actions go through KonnektScanEngine.executeAction().
 * No direct DB calls. The backend handles:
 * - Status transitions
 * - Notifications
 * - Escrow/commission triggers
 * - Scan logging
 * - Duplicate prevention
 * 
 * Uses ScanStatusBadge for consistent theming.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Package, Truck, Scale, CheckCircle, AlertTriangle,
  User, History, ArrowRight, ShieldAlert, Smartphone,
  KeyRound, Send, Smartphone as PhoneIcon, Laptop, Gem, Gamepad2, FileText, Wine, Car, Tablet, Box
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { ScanStatusBadge } from "./ScanStatusBadge";
import { ExternalHandoverCard } from "@/components/gp/ExternalHandoverCard";
import { useScanEngine } from "@/hooks/useScanEngine";

interface FlatRateOrderItem {
  name: string;
  label: string;
  quantity: number;
  price: number;
}

interface ScanResultGPProps {
  order: {
    id: string;
    order_number: string;
    status: string;
    weight: number;
    total_price: number;
    currency: string;
    price_per_kg: number;
    origin_city: string;
    destination_city: string;
    client_name?: string | null;
    client_id: string;
    description: string | null;
    scan_history?: Array<{ action: string; user_role: string; created_at: string }>;
    delivery_code?: string | null;
    recipient_name?: string | null;
    recipient_phone?: string | null;
    recipient_user_id?: string | null;
    flat_rate_items?: FlatRateOrderItem[] | null;
    content_nature?: string[] | null;
  };
  gpId: string;
  logScan: (orderId: string, action: string, scanType?: string, prevStatus?: string, newStatus?: string, meta?: Record<string, any>) => Promise<void>;
  onComplete: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  view: "Consulté",
  deposit_confirm: "Dépôt confirmé",
  delivery_confirm: "Livraison confirmée",
  weight_modify: "Poids modifié",
};

export function ScanResultGP({ order, gpId, logScan, onComplete }: ScanResultGPProps) {
  const { toast } = useToast();
  const { executeAction, executing } = useScanEngine();
  const [actualWeight, setActualWeight] = useState(order.weight.toString());
  const [weightDiff, setWeightDiff] = useState(0);
  const [priceDiff, setPriceDiff] = useState(0);
  const [showDeliveryCode, setShowDeliveryCode] = useState(false);
  const [deliveryCodeInput, setDeliveryCodeInput] = useState("");
  const [modifiedFlatRateItems, setModifiedFlatRateItems] = useState<FlatRateOrderItem[] | null>(null);
  const [modifiedTotal, setModifiedTotal] = useState<number | null>(null);

  const isDepositMode = ["accepted", "pending", "paid_held"].includes(order.status);
  const isTransitMode = false; // Transit is now automatic via geolocation
  const isDeliveryMode = ["checked_in", "collected", "scheduled_departure", "in_transit", "arrived_destination", "delivery_pending"].includes(order.status);
  const alreadyProcessed = ["delivered", "cancelled", "released", "delivery_confirmed"].includes(order.status);

  useEffect(() => {
    const actual = parseFloat(actualWeight) || 0;
    const diff = actual - order.weight;
    setWeightDiff(diff);
    setPriceDiff(Math.round(diff * order.price_per_kg));
  }, [actualWeight, order.weight, order.price_per_kg]);

  const confirmDeposit = async () => {
    const actual = parseFloat(actualWeight) || order.weight;
    const hasWeightChange = Math.abs(weightDiff) > 0.01;

    if (hasWeightChange) {
      // Weight modification → engine handles PRV freeze + notifications
      const result = await executeAction("weight_modify", order.id, {
        declared_weight: order.weight,
        actual_weight: actual,
        price_diff: priceDiff,
      });
      if (result?.status === "executed") onComplete();
    } else {
      // Standard deposit → engine updates status + notifications
      const result = await executeAction("deposit_confirm", order.id, {
        weight: actual,
      });
      if (result?.status === "executed") onComplete();
    }
  };

  const confirmTransit = async () => {
    const result = await executeAction("mark_transit", order.id);
    if (result?.status === "executed") onComplete();
  };

  const initiateDelivery = async () => {
    // Call prepare_delivery to generate code and notify client+recipient
    const result = await executeAction("prepare_delivery", order.id);
    if (result?.status === "executed") {
      setShowDeliveryCode(true);
      toast({
        title: "📱 Code envoyé",
        description: `Le code de livraison a été envoyé à ${order.recipient_name || order.client_name || "le client"}. Demandez-lui le code.`,
      });
    }
  };

  const confirmDelivery = async () => {
    if (!deliveryCodeInput.trim()) {
      toast({ title: "Entrez le code de livraison", variant: "destructive" });
      return;
    }
    const result = await executeAction("confirm_delivery", order.id, {
      delivery_code: deliveryCodeInput.trim(),
    });
    if (result?.status === "executed") onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-4 space-y-4"
    >
      {/* Order Summary */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-secondary to-primary" />
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-sm">{order.order_number}</span>
            <ScanStatusBadge status={order.status} />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{order.origin_city}</span>
            <ArrowRight className="w-3 h-3" />
            <span>{order.destination_city}</span>
          </div>
          {order.client_name && (
            <div className="flex items-center gap-2 text-sm">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{order.client_name}</span>
            </div>
          )}
          {order.description && (
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
              📦 {order.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Inventory List — Deposit overview (editable in deposit mode) */}
      {isDepositMode && (
        <DepositInventoryCard 
          order={order} 
          editable 
          onItemsChange={(items, newTotal) => {
            setModifiedFlatRateItems(items);
            setModifiedTotal(newTotal);
          }}
        />
      )}
      {!isDepositMode && (order.flat_rate_items as FlatRateOrderItem[] || []).length > 0 && (
        <DepositInventoryCard order={order} />
      )}

      {/* Already processed warning */}
      {alreadyProcessed && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <div>
              <p className="font-medium text-sm">Scan non autorisé</p>
              <p className="text-xs text-muted-foreground">
                Commande déjà « {order.status} ». Aucune action disponible.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deposit Mode */}
      {isDepositMode && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              Vérification du poids — Dépôt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Déclaré</Label>
                <p className="text-xl font-bold mt-1">{order.weight} <span className="text-sm font-normal">kg</span></p>
              </div>
              <div className="p-3 rounded-lg border-2 border-primary/20 bg-primary/5">
                <Label className="text-[10px] text-primary uppercase tracking-wider">Réel</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={actualWeight}
                  onChange={(e) => setActualWeight(e.target.value)}
                  className="font-bold text-lg h-8 mt-1 border-0 bg-transparent p-0 focus-visible:ring-0"
                />
              </div>
            </div>

            {weightDiff !== 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className={`p-3 rounded-lg border ${
                  weightDiff > 0 
                    ? "bg-warning/5 border-warning/30" 
                    : "bg-success/5 border-success/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={`w-4 h-4 ${weightDiff > 0 ? "text-warning" : "text-success"}`} />
                  <span className="font-medium text-sm">
                    {weightDiff > 0 ? "Excédent détecté" : "Poids inférieur"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                  <div>
                    <span className="text-muted-foreground text-xs">Différence</span>
                    <p className="font-bold">{weightDiff > 0 ? "+" : ""}{weightDiff.toFixed(1)} kg</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Impact prix</span>
                    <p className="font-bold">{priceDiff > 0 ? "+" : ""}{priceDiff.toLocaleString()} {getCurrencySymbol(order.currency)}</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  ⚠️ Le client devra valider cette modification avant traitement
                </p>
              </motion.div>
            )}

            <Button className="w-full h-12" onClick={confirmDeposit} disabled={executing}>
              {executing ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Package className="w-4 h-4 mr-2" />
                  {weightDiff !== 0 ? "Soumettre modification" : "Confirmer le dépôt"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Transit Mode — Colis reçu, marquer en transit */}
      {isTransitMode && (
        <Card className="border-secondary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-secondary" />
              Colis reçu — Marquer en transit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ce colis a été collecté. Confirmez le départ en transit vers la destination.
            </p>
            <Button 
              className="w-full h-12" 
              variant="secondary"
              onClick={confirmTransit}
              disabled={executing}
            >
              {executing ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Truck className="w-4 h-4 mr-2" />
                  Confirmer départ en transit
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delivery Mode — Interactive code verification */}
      {isDeliveryMode && (
        <Card className="border-success/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-success" />
              Confirmer la livraison
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!showDeliveryCode ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Un code de livraison sera envoyé au client/destinataire. Demandez-lui le code pour finaliser.
                </p>
                <Button
                  className="w-full h-12 bg-success hover:bg-success/90 text-success-foreground"
                  onClick={initiateDelivery}
                  disabled={executing}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer le code au client
                </Button>
              </>
            ) : (
              <>
                <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                  <div className="flex items-center gap-2 mb-2">
                    <KeyRound className="w-4 h-4 text-success" />
                    <span className="font-medium text-sm">Entrez le code de livraison</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Demandez le code à {order.recipient_name || order.client_name || "le client"}.
                    {order.delivery_code && (
                      <span className="block mt-1 text-[10px] text-muted-foreground/60">
                        Code: <span className="font-mono font-bold">{order.delivery_code}</span>
                      </span>
                    )}
                  </p>
                  <Input
                    value={deliveryCodeInput}
                    onChange={(e) => setDeliveryCodeInput(e.target.value.toUpperCase())}
                    placeholder="Ex: A3F29B"
                    className="font-mono text-center text-lg tracking-widest h-12"
                    maxLength={6}
                    autoFocus
                  />
                </div>
                <Button
                  className="w-full h-12 bg-success hover:bg-success/90 text-success-foreground"
                  onClick={confirmDelivery}
                  disabled={executing || deliveryCodeInput.length < 4}
                >
                  {executing ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Valider et confirmer livraison
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scan History */}
      {order.scan_history && order.scan_history.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">Historique scans</h4>
              <Badge variant="outline" className="text-[10px] ml-auto">{order.scan_history.length}</Badge>
            </div>
            <div className="space-y-1.5">
              {order.scan_history.slice(0, 5).map((scan, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                    <span className="font-medium">{ACTION_LABELS[scan.action] || scan.action}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(scan.created_at).toLocaleString("fr-FR", { 
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" 
                    })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

// Icon mapping for flat-rate items
const FLAT_RATE_ICONS: Record<string, any> = {
  telephone: Smartphone,
  ordinateur: Laptop,
  bijoux: Gem,
  console: Gamepad2,
  document: FileText,
  parfum: Wine,
  piece_auto: Car,
  tablette: Tablet,
};

const NATURE_LABELS: Record<string, string> = {
  alimentaire: "Alimentaire",
  vestimentaire: "Vestimentaire",
  cosmetique: "Cosmétique",
  electronique: "Électronique",
  medicament: "Médicament",
  document: "Document",
  autres: "Autres",
};

function DepositInventoryCard({ order, editable = false, onItemsChange }: { 
  order: ScanResultGPProps["order"];
  editable?: boolean;
  onItemsChange?: (items: FlatRateOrderItem[], newTotal: number) => void;
}) {
  const [editableItems, setEditableItems] = useState<FlatRateOrderItem[]>(
    () => (order.flat_rate_items || []) as FlatRateOrderItem[]
  );
  const contentNature = order.content_nature || [];
  const hasKilo = order.weight > 0;
  const hasFlatRate = editableItems.length > 0;

  if (!hasKilo && !hasFlatRate) return null;

  const handleQuantityChange = (index: number, delta: number) => {
    const updated = editableItems.map((item, i) => {
      if (i !== index) return item;
      const newQty = Math.max(0, item.quantity + delta);
      return { ...item, quantity: newQty };
    });
    setEditableItems(updated);
    
    // Calculate new total: kilo price + flat rate totals
    const kiloTotal = order.weight * order.price_per_kg;
    const flatTotal = updated.reduce((sum, it) => sum + it.price * it.quantity, 0);
    onItemsChange?.(updated, kiloTotal + flatTotal);
  };

  const displayItems = editable ? editableItems : (order.flat_rate_items || []) as FlatRateOrderItem[];

  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-accent-foreground" />
          <h4 className="text-sm font-semibold">Inventaire du colis</h4>
          {editable && (
            <Badge className="ml-auto text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
              Modifiable
            </Badge>
          )}
          {!editable && (
            <Badge variant="outline" className="ml-auto text-[10px]">
              {(hasKilo ? 1 : 0) + displayItems.length} article{((hasKilo ? 1 : 0) + displayItems.length) > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="space-y-1.5">
          {/* Kilo items */}
          {hasKilo && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-border">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Scale className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Colis au kilo</p>
                <p className="text-xs text-muted-foreground">
                  {contentNature.length > 0
                    ? contentNature.map(n => NATURE_LABELS[n] || n).join(", ")
                    : "Contenu déclaré"}
                </p>
              </div>
              <span className="text-sm font-bold text-primary">{order.weight} kg</span>
            </div>
          )}

          {/* Flat rate items */}
          {displayItems.map((item, i) => {
            const Icon = FLAT_RATE_ICONS[item.name] || Package;
            const qty = editable ? editableItems[i]?.quantity ?? item.quantity : item.quantity;
            return (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-background border border-accent/30">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <Badge variant="secondary" className="text-[10px] mt-0.5">Forfaitaire</Badge>
                </div>
                {editable ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleQuantityChange(i, -1)}
                      className="w-7 h-7 rounded-lg border border-border bg-muted flex items-center justify-center text-sm font-bold hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      −
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{qty}</span>
                    <button
                      onClick={() => handleQuantityChange(i, 1)}
                      className="w-7 h-7 rounded-lg border border-border bg-muted flex items-center justify-center text-sm font-bold hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      +
                    </button>
                    <p className="text-[10px] text-muted-foreground w-16 text-right">
                      {(item.price * qty).toLocaleString()} {getCurrencySymbol(order.currency)}
                    </p>
                  </div>
                ) : (
                  <div className="text-right">
                    <span className="text-sm font-bold">×{qty}</span>
                    <p className="text-[10px] text-muted-foreground">
                      {(item.price * qty).toLocaleString()} {getCurrencySymbol(order.currency)}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">Total déclaré</span>
          <span className="text-sm font-bold">
            {(editable 
              ? (order.weight * order.price_per_kg + editableItems.reduce((s, it) => s + it.price * it.quantity, 0))
              : order.total_price
            ).toLocaleString()} {getCurrencySymbol(order.currency)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
