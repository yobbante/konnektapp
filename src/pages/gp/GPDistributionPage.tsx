/**
 * GPDistributionPage — "Distribution" tab
 * 
 * V1 TERRAIN: Used at arrival destination
 * - Alphabetical client list
 * - Checkbox "colis remis"  
 * - Validation by scan QR or tap + confirm
 * - Each validation: updates status, notifies client, locks action
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, ScanLine, User, Package,
  Search, RefreshCw, AlertTriangle, Lock, Scale
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GPDashboardLayout } from "@/components/layout/GPDashboardLayout";
import { PageLoader } from "@/components/ui/PageLoader";
import { useGPProfile } from "@/hooks/useGPProfile";
import { useToast } from "@/hooks/use-toast";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { cn } from "@/lib/utils";
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

interface DeliveryItem {
  id: string;
  order_number: string;
  client_id: string;
  client_name: string;
  destination_city: string;
  weight: number;
  status: string;
  total_price: number;
  currency: string;
  has_logistics: boolean;
}

export default function GPDistributionPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { gpProfile, loading: profileLoading, pendingCount, activeCount } = useGPProfile();
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [delivering, setDelivering] = useState(false);

  useEffect(() => {
    if (gpProfile) loadDeliveries();
  }, [gpProfile]);

  const loadDeliveries = async () => {
    if (!gpProfile) return;
    try {
      // Get orders that are "arrived" (ready for handover)
      // Get orders that are active (collected, in_transit, delivered pending handover)
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, order_number, client_id, destination_city, weight, status, total_price, currency")
        .eq("gp_id", gpProfile.id)
        .in("status", ["in_transit", "collected"])
        .order("destination_city", { ascending: true });

      if (error) throw error;

      // Get client names from profiles
      const clientIds = [...new Set((orders || []).map(o => o.client_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", clientIds);

      const nameMap: Record<string, string> = {};
      (profiles || []).forEach(p => { nameMap[p.user_id] = p.full_name || "Client"; });

      // Check logistics options
      const orderIds = (orders || []).map(o => o.id);
      const { data: logistics } = await supabase
        .from("order_logistics_options")
        .select("order_id, delivery_enabled")
        .in("order_id", orderIds);

      const logisticsMap: Record<string, boolean> = {};
      (logistics || []).forEach(l => { logisticsMap[l.order_id] = l.delivery_enabled; });

      const deliveryItems: DeliveryItem[] = (orders || []).map(o => ({
        ...o,
        client_name: nameMap[o.client_id] || "Client",
        has_logistics: logisticsMap[o.id] || false,
      }));

      // Sort alphabetically by client name
      deliveryItems.sort((a, b) => a.client_name.localeCompare(b.client_name));

      setItems(deliveryItems);
    } catch (error) {
      console.error("Error loading deliveries:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async (item: DeliveryItem) => {
    setDelivering(true);
    try {
      // Check if logistics delivery is active (GP shouldn't deliver directly)
      if (item.has_logistics) {
        toast({
          title: "Livraison gérée par Konnekt",
          description: "Ce colis sera livré par un livreur Konnekt. Vous ne pouvez pas confirmer la remise.",
          variant: "destructive",
        });
        setConfirmingId(null);
        setDelivering(false);
        return;
      }

      const { error } = await supabase
        .from("orders")
        .update({ status: "delivered" })
        .eq("id", item.id);

      if (error) throw error;

      // Log the delivery
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("scan_logs").insert({
          order_id: item.id,
          user_id: user.id,
          user_role: "gp",
          action: "delivery_confirm",
          scan_type: "manual",
          previous_status: item.status,
          new_status: "delivered",
        });
      }

      toast({
        title: "Colis remis",
        description: `Commande #${item.order_number.slice(-6)} confirmée`,
      });

      setConfirmingId(null);
      loadDeliveries();
    } catch (error) {
      console.error("Error confirming delivery:", error);
      toast({
        title: "Erreur",
        description: "Impossible de confirmer la remise",
        variant: "destructive",
      });
    } finally {
      setDelivering(false);
    }
  };

  if (profileLoading || loading) return <PageLoader message="Chargement distribution..." />;
  if (!gpProfile) return null;

  const arrivedItems = items.filter(i => (i.status as string) === "arrived");
  const inTransitItems = items.filter(i => ["collected", "in_transit"].includes(i.status as string));
  const searchFiltered = items.filter(i => {
    const q = searchQuery.toLowerCase();
    return !q || i.client_name.toLowerCase().includes(q) || i.order_number.toLowerCase().includes(q);
  });

  const confirmItem = items.find(i => i.id === confirmingId);

  return (
    <GPDashboardLayout
      gpProfile={gpProfile}
      pendingCount={pendingCount}
      activeOrdersCount={activeCount}
      activeTab="distribution"
    >
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Distribution</h2>
            <p className="text-xs text-muted-foreground">
              {arrivedItems.length} colis à remettre · {inTransitItems.length} en transit
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => navigate("/gp/scan")}>
              <ScanLine className="w-3.5 h-3.5" />
              Scanner
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadDeliveries}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl"
          />
        </div>

        {/* Ready to deliver */}
        {arrivedItems.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-green-600 uppercase tracking-wide flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              Prêts à remettre ({arrivedItems.length})
            </h3>
            <AnimatePresence>
              {(searchQuery ? searchFiltered.filter(i => i.status === "arrived") : arrivedItems).map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <DeliveryCard
                    item={item}
                    onConfirm={() => setConfirmingId(item.id)}
                    onScan={() => navigate("/gp/scan")}
                    onViewDetails={() => navigate(`/gp/order/${item.id}`)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Still in transit */}
        {inTransitItems.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              En transit ({inTransitItems.length})
            </h3>
            {(searchQuery ? searchFiltered.filter(i => ["collected", "in_transit"].includes(i.status)) : inTransitItems).map((item) => (
              <Card key={item.id} className="opacity-60">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      #{item.order_number.slice(-6)} · {item.weight} kg
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600">En transit</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Aucun colis à distribuer</p>
              <p className="text-xs mt-1">Les colis arrivés apparaîtront ici</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmingId} onOpenChange={() => setConfirmingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la remise ?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmItem && (
                <>
                  Colis #{confirmItem.order_number.slice(-6)} pour <strong>{confirmItem.client_name}</strong>
                  <br />
                  Poids: {confirmItem.weight} kg · Prix: {confirmItem.total_price.toLocaleString()} {getCurrencySymbol(confirmItem.currency)}
                  <br /><br />
                  Cette action est irréversible et sera enregistrée.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={delivering}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmItem && handleConfirmDelivery(confirmItem)}
              disabled={delivering}
              className="bg-green-600 hover:bg-green-700"
            >
              {delivering ? "Confirmation..." : "Confirmer remise"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GPDashboardLayout>
  );
}

/* ─── Delivery Card ─── */
function DeliveryCard({ item, onConfirm, onScan, onViewDetails }: {
  item: DeliveryItem;
  onConfirm: () => void;
  onScan: () => void;
  onViewDetails: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-3 flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-green-600" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0" onClick={onViewDetails}>
            <p className="text-sm font-semibold truncate">{item.client_name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground font-mono">#{item.order_number.slice(-6)}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Scale className="w-3 h-3" /> {item.weight} kg
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {item.has_logistics ? (
              <Badge variant="outline" className="text-[10px] border-purple-300 text-purple-600 gap-0.5">
                <Lock className="w-2.5 h-2.5" />
                Konnekt
              </Badge>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 bg-primary/10 hover:bg-primary/20"
                  onClick={onScan}
                >
                  <ScanLine className="w-4 h-4 text-primary" />
                </Button>
                <Button
                  size="sm"
                  className="h-9 bg-green-600 hover:bg-green-700 text-xs font-bold gap-1"
                  onClick={onConfirm}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Remis
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
