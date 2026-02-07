/**
 * BulkScanner - GP bulk scan management
 * 
 * Allows GP to scan multiple parcels in batch mode:
 * - Sequential scan with running list
 * - Batch confirmation (deposit all / deliver all)
 * - Summary view before confirmation
 * - Individual item removal
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ScanLine, Package, Trash2, CheckCircle, 
  AlertTriangle, ListChecks, X, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { QRCameraScanner } from "@/components/gp/QRCameraScanner";
import { useDuplicateScanCheck } from "@/hooks/useDuplicateScanCheck";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ScannedItem {
  id: string;
  orderNumber: string;
  orderId: string;
  status: string;
  weight: number;
  clientName: string | null;
  originCity: string;
  destinationCity: string;
  error?: string;
}

type BulkAction = "deposit" | "delivery";

interface BulkScannerProps {
  gpId: string;
  onComplete?: () => void;
}

export function BulkScanner({ gpId, onComplete }: BulkScannerProps) {
  const { toast } = useToast();
  const { canPerformAction } = useDuplicateScanCheck();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [bulkAction, setBulkAction] = useState<BulkAction>("deposit");

  const addItem = useCallback(async (code: string) => {
    const normalizedCode = code.trim().toUpperCase();
    
    // Check if already in list
    if (items.some(i => i.orderNumber === normalizedCode)) {
      toast({ title: "Déjà scanné", description: `${normalizedCode} est déjà dans la liste`, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .select(`
          id, order_number, status, weight, 
          origin_city, destination_city, client_id
        `)
        .eq("gp_id", gpId)
        .or(`order_number.eq.${normalizedCode},tracking_code.eq.${normalizedCode}`)
        .single();

      if (error || !order) {
        toast({ title: "Non trouvé", description: `${normalizedCode} introuvable pour votre profil`, variant: "destructive" });
        return;
      }

      // Get client name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", order.client_id)
        .single();

      const newItem: ScannedItem = {
        id: order.id,
        orderNumber: order.order_number,
        orderId: order.id,
        status: order.status,
        weight: order.weight,
        clientName: profile?.full_name || null,
        originCity: order.origin_city,
        destinationCity: order.destination_city,
      };

      // Check if action is valid for this order
      if (bulkAction === "deposit" && !["accepted", "pending"].includes(order.status)) {
        newItem.error = `Statut "${order.status}" — dépôt impossible`;
      }
      if (bulkAction === "delivery" && order.status !== "in_transit") {
        newItem.error = `Statut "${order.status}" — livraison impossible`;
      }

      setItems(prev => [...prev, newItem]);
      
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(50);
      
      toast({ title: `✅ ${order.order_number} ajouté` });
    } catch (err) {
      console.error("Scan error:", err);
      toast({ title: "Erreur de scan", variant: "destructive" });
    } finally {
      setLoading(false);
      setManualCode("");
    }
  }, [gpId, items, bulkAction, toast]);

  const removeItem = (orderNumber: string) => {
    setItems(prev => prev.filter(i => i.orderNumber !== orderNumber));
  };

  const handleCameraScan = (code: string) => {
    setCameraOpen(false);
    addItem(code);
    // Reopen camera for continuous scanning
    setTimeout(() => setCameraOpen(true), 500);
  };

  const validItems = items.filter(i => !i.error);
  const errorItems = items.filter(i => !!i.error);

  const handleBulkConfirm = async () => {
    if (validItems.length === 0) return;
    
    setProcessing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      for (const item of validItems) {
        try {
          const actionType = bulkAction === "deposit" ? "deposit_confirm" : "delivery_confirm";
          const allowed = await canPerformAction(item.orderId, actionType, "gp");
          if (!allowed) {
            failCount++;
            continue;
          }

          if (bulkAction === "deposit") {
            await supabase.from("orders").update({
              status: "collected",
            }).eq("id", item.orderId);

            await supabase.from("order_status_history").insert({
              order_id: item.orderId,
              status: "collected",
              changed_by: user.id,
              changed_by_type: "gp",
              notes: "📦 Dépôt confirmé par scan batch — poids conforme",
            });

            // Log scan
            await supabase.from("scan_logs").insert({
              order_id: item.orderId,
              user_id: user.id,
              user_role: "gp",
              action: "deposit_confirm",
              scan_type: "batch",
              previous_status: item.status,
              new_status: "collected",
              metadata: { batch_size: validItems.length },
            });
          } else {
            await supabase.from("orders").update({
              status: "delivered",
              actual_delivery_date: new Date().toISOString(),
            }).eq("id", item.orderId);

            await supabase.from("order_status_history").insert({
              order_id: item.orderId,
              status: "delivered",
              changed_by: user.id,
              changed_by_type: "gp",
              notes: "🎉 Livraison confirmée par scan batch",
            });

            await supabase.from("scan_logs").insert({
              order_id: item.orderId,
              user_id: user.id,
              user_role: "gp",
              action: "delivery_confirm",
              scan_type: "batch",
              previous_status: item.status,
              new_status: "delivered",
              metadata: { batch_size: validItems.length },
            });
          }

          successCount++;
        } catch (err) {
          console.error(`Error processing ${item.orderNumber}:`, err);
          failCount++;
        }
      }

      toast({
        title: `✅ Batch terminé`,
        description: `${successCount} réussi(s)${failCount > 0 ? `, ${failCount} erreur(s)` : ""}`,
      });

      setItems([]);
      setShowConfirm(false);
      onComplete?.();
    } catch (err) {
      console.error("Bulk process error:", err);
      toast({ title: "Erreur batch", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="flex gap-2">
        <Button
          variant={bulkAction === "deposit" ? "default" : "outline"}
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => { setBulkAction("deposit"); setItems([]); }}
        >
          <Package className="w-3 h-3" />
          Dépôts en lot
        </Button>
        <Button
          variant={bulkAction === "delivery" ? "default" : "outline"}
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => { setBulkAction("delivery"); setItems([]); }}
        >
          <CheckCircle className="w-3 h-3" />
          Livraisons en lot
        </Button>
      </div>

      {/* Scanner Controls */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Button
            variant="outline"
            className="w-full h-16 flex items-center justify-center gap-3 border-2 border-dashed border-primary/50 bg-primary/5"
            onClick={() => setCameraOpen(true)}
          >
            <ScanLine className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">
              Scanner en continu
            </span>
          </Button>

          <QRCameraScanner
            isOpen={cameraOpen}
            onScan={handleCameraScan}
            onClose={() => setCameraOpen(false)}
          />

          <div className="flex gap-2">
            <Input
              placeholder="Code commande..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              className="font-mono"
              onKeyDown={(e) => e.key === "Enter" && addItem(manualCode)}
            />
            <Button 
              size="icon" 
              onClick={() => addItem(manualCode)} 
              disabled={loading || !manualCode.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scanned Items List */}
      {items.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ListChecks className="w-4 h-4" />
                Colis scannés
              </span>
              <Badge variant="secondary">{items.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.div
                  key={item.orderNumber}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                    item.error 
                      ? "border-destructive/30 bg-destructive/5" 
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold">{item.orderNumber}</span>
                      {item.error ? (
                        <AlertTriangle className="w-3 h-3 text-destructive" />
                      ) : (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      )}
                    </div>
                    {item.clientName && (
                      <p className="text-xs text-muted-foreground truncate">{item.clientName}</p>
                    )}
                    {item.error && (
                      <p className="text-[10px] text-destructive">{item.error}</p>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{item.originCity} → {item.destinationCity}</span>
                      <span>•</span>
                      <span>{item.weight} kg</span>
                    </div>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-7 w-7"
                    onClick={() => removeItem(item.orderNumber)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>

            <Separator />

            {/* Summary */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {validItems.length} valide(s)
                {errorItems.length > 0 && `, ${errorItems.length} erreur(s)`}
              </span>
              <span className="font-medium">
                Poids total: {validItems.reduce((sum, i) => sum + i.weight, 0).toFixed(1)} kg
              </span>
            </div>

            {/* Confirm Button */}
            <Button 
              className="w-full gap-2" 
              disabled={validItems.length === 0}
              onClick={() => setShowConfirm(true)}
            >
              {bulkAction === "deposit" ? (
                <>
                  <Package className="w-4 h-4" />
                  Confirmer {validItems.length} dépôt(s)
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Confirmer {validItems.length} livraison(s)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-primary" />
              Confirmer le batch
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Vous allez confirmer <strong>{validItems.length}</strong>{" "}
                  {bulkAction === "deposit" ? "dépôt(s)" : "livraison(s)"} en une seule action.
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1 p-2 bg-muted rounded-lg">
                  {validItems.map(item => (
                    <div key={item.orderNumber} className="flex justify-between text-xs">
                      <span className="font-mono">{item.orderNumber}</span>
                      <span className="text-muted-foreground">{item.weight} kg</span>
                    </div>
                  ))}
                </div>
                {errorItems.length > 0 && (
                  <p className="text-xs text-destructive">
                    ⚠️ {errorItems.length} colis ignoré(s) (statut incompatible)
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkConfirm} disabled={processing}>
              {processing ? "Traitement..." : `Confirmer ${validItems.length} colis`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
