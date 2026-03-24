/**
 * Terrain Scan Tab — The heart of the terrain dashboard.
 * Scanner + contextual actions based on scanned entity.
 */
import { useState } from "react";
import { ScanLine, Package, Truck, User, AlertTriangle, ExternalLink, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { TerrainOrder } from "@/pages/AdminTerrainDashboard";

interface Props {
  orders: TerrainOrder[];
  onRefresh: () => void;
}

interface ScanResult {
  type: "order" | "gp" | "client" | "unknown";
  data: any;
}

export function TerrainScanTab({ orders, onRefresh }: Props) {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showScanner, setShowScanner] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleScanComplete = async (code: string) => {
    setShowScanner(false);
    
    // Try to identify what was scanned
    // 1. Check if it's an order (by order_number or UUID)
    const orderMatch = orders.find(o => 
      o.order_number === code.toUpperCase() || o.id === code
    );
    
    if (orderMatch) {
      setScanResult({ type: "order", data: orderMatch });
      return;
    }

    // 2. Check if it's a user URL pattern
    const userMatch = code.match(/\/track\/user\/([a-f0-9-]{36})/i);
    if (userMatch) {
      const userId = userMatch[1];
      // Check if GP
      const { data: gp } = await supabase
        .from("gp_profiles")
        .select("id, business_name, city, status, gp_type, rating")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (gp) {
        // Get active orders for this GP
        const gpOrders = orders.filter(o => o.gp_id === gp.id);
        setScanResult({ type: "gp", data: { ...gp, orders: gpOrders } });
        return;
      }

      // Check if client
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, city")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (profile) {
        const clientOrders = orders.filter(o => o.client_id === userId);
        setScanResult({ type: "client", data: { ...profile, orders: clientOrders } });
        return;
      }
    }

    // 3. Try direct order lookup by code
    const { data: orderDb } = await supabase
      .from("orders")
      .select("id, order_number, status, origin_city, destination_city, weight, gp_id, client_id")
      .or(`order_number.eq.${code.toUpperCase()},id.eq.${code}`)
      .maybeSingle();

    if (orderDb) {
      setScanResult({ type: "order", data: orderDb });
      return;
    }

    setScanResult({ type: "unknown", data: { code } });
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus as any })
        .eq("id", orderId);
      
      if (error) throw error;
      
      // Log scan
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("scan_logs").insert({
          order_id: orderId,
          user_id: user.id,
          user_role: "admin",
          action: `status_change_to_${newStatus}`,
          scan_type: "qr",
          new_status: newStatus,
        });
      }

      toast({ title: "Statut mis à jour", description: `→ ${newStatus}` });
      onRefresh();
      setScanResult(null);
      setShowScanner(true);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setShowScanner(true);
  };

  return (
    <div className="space-y-4">
      {/* Scanner */}
      <AnimatePresence mode="wait">
        {showScanner ? (
          <motion.div
            key="scanner"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="text-center mb-4">
              <ScanLine className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold">Scannez un QR</p>
              <p className="text-xs text-muted-foreground">Colis · GP · Client</p>
            </div>
            <ManualCodeEntry onSubmit={handleScanComplete} />
          </motion.div>
        ) : scanResult ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* ORDER SCAN RESULT */}
            {scanResult.type === "order" && (
              <div className="space-y-3">
                <Card className="border-2 border-primary/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary" />
                        <span className="font-mono font-bold">{scanResult.data.order_number}</span>
                      </div>
                      <Badge variant="outline">{scanResult.data.status}</Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      <p>{scanResult.data.origin_city} → {scanResult.data.destination_city}</p>
                      {scanResult.data.gp_name && <p className="text-muted-foreground">GP: {scanResult.data.gp_name}</p>}
                      {scanResult.data.weight && <p className="text-muted-foreground">Poids: {scanResult.data.weight} kg</p>}
                    </div>
                  </CardContent>
                </Card>

                {/* Actions based on status */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Actions disponibles</p>
                  {scanResult.data.status === "accepted" && (
                    <ActionButton label="Marquer collecté" onClick={() => updateOrderStatus(scanResult.data.id, "collected")} loading={updating} />
                  )}
                  {scanResult.data.status === "collected" && (
                    <ActionButton label="Marquer en transit" onClick={() => updateOrderStatus(scanResult.data.id, "in_transit")} loading={updating} />
                  )}
                  {scanResult.data.status === "in_transit" && (
                    <ActionButton label="Marquer arrivé" onClick={() => updateOrderStatus(scanResult.data.id, "arrived")} loading={updating} />
                  )}
                  {(scanResult.data.status === "arrived") && (
                    <ActionButton label="Déclencher livraison dernier km" onClick={() => updateOrderStatus(scanResult.data.id, "delivered")} loading={updating} />
                  )}
                  <Button variant="outline" className="w-full" onClick={() => navigate(`/admin/order/${scanResult.data.id}`)}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Voir fiche complète
                  </Button>
                </div>
              </div>
            )}

            {/* GP SCAN RESULT */}
            {scanResult.type === "gp" && (
              <div className="space-y-3">
                <Card className="border-2 border-emerald-500/30">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-emerald-600" />
                      <span className="font-bold">{scanResult.data.business_name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Ville: {scanResult.data.city}</p>
                      <p>Statut: {scanResult.data.status}</p>
                      <p>Note: {scanResult.data.rating || "N/A"}</p>
                      <p>Colis associés: {scanResult.data.orders?.length || 0}</p>
                    </div>
                  </CardContent>
                </Card>
                {scanResult.data.orders?.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">Colis de ce GP</p>
                    {scanResult.data.orders.slice(0, 5).map((o: any) => (
                      <Card key={o.id} className="cursor-pointer" onClick={() => navigate(`/admin/order/${o.id}`)}>
                        <CardContent className="p-2.5 flex items-center justify-between">
                          <span className="font-mono text-xs">{o.order_number}</span>
                          <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                <Button variant="outline" className="w-full" onClick={() => navigate(`/admin/gp/${scanResult.data.id}`)}>
                  Profil GP complet
                </Button>
              </div>
            )}

            {/* CLIENT SCAN RESULT */}
            {scanResult.type === "client" && (
              <div className="space-y-3">
                <Card className="border-2 border-blue-500/30">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      <span className="font-bold">{scanResult.data.full_name || "Client"}</span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {scanResult.data.phone && <p>Tél: {scanResult.data.phone}</p>}
                      {scanResult.data.city && <p>Ville: {scanResult.data.city}</p>}
                      <p>Commandes actives: {scanResult.data.orders?.length || 0}</p>
                    </div>
                  </CardContent>
                </Card>
                {scanResult.data.orders?.length > 0 && (
                  <div className="space-y-1">
                    {scanResult.data.orders.slice(0, 5).map((o: any) => (
                      <Card key={o.id} className="cursor-pointer" onClick={() => navigate(`/admin/order/${o.id}`)}>
                        <CardContent className="p-2.5 flex items-center justify-between">
                          <span className="font-mono text-xs">{o.order_number}</span>
                          <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* UNKNOWN SCAN */}
            {scanResult.type === "unknown" && (
              <Card className="border-2 border-amber-500/30">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="font-semibold">QR non reconnu</p>
                  <p className="text-xs text-muted-foreground mt-1">Code: {scanResult.data.code}</p>
                </CardContent>
              </Card>
            )}

            <Button variant="ghost" className="w-full mt-3" onClick={resetScan}>
              <ScanLine className="w-4 h-4 mr-2" />
              Nouveau scan
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ActionButton({ label, onClick, loading }: { label: string; onClick: () => void; loading: boolean }) {
  return (
    <Button 
      className="w-full h-14 text-base font-semibold rounded-xl" 
      onClick={onClick} 
      disabled={loading}
    >
      {loading ? "Mise à jour..." : label}
    </Button>
  );
}

function ManualCodeEntry({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [code, setCode] = useState("");
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <p className="text-xs text-muted-foreground font-medium">Entrez un code manuellement</p>
        <div className="flex gap-2">
          <Input
            placeholder="CMD-XXXXX ou ID..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded-xl font-mono"
            onKeyDown={(e) => {
              if (e.key === "Enter" && code.trim()) onSubmit(code.trim());
            }}
          />
          <Button onClick={() => code.trim() && onSubmit(code.trim())} disabled={!code.trim()} className="rounded-xl">
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
