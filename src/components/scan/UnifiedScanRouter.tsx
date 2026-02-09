/**
 * UnifiedScanRouter — Smart QR scan result router
 * 
 * RULE: "Le QR ne dit jamais qui tu es, il dit ce que tu peux faire maintenant"
 * 
 * 1 user = 1 QR, payload = konnekt://user/{userId} or URL
 * The router resolves:
 *   - Scanned user's role (client / GP)
 *   - Active orders between scanner & scanned user
 *   - Available actions based on scanner's role + permissions
 * 
 * Cases:
 *   CLIENT QR scanned by GP → active orders with actions (deposit/delivery)
 *   CLIENT QR scanned by GP → no active orders → "Ajouter comme destinataire"
 *   GP QR scanned by CLIENT → GP public profile + book CTA
 *   GP QR scanned by ADMIN → operational panel
 *   Any QR scanned externally → public tracking / marketing page
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Package, Truck, Star, MapPin, ArrowRight,
  CheckCircle, QrCode, UserPlus, Eye, ShieldCheck,
  Calendar, AlertTriangle, ScanLine
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useScanRole } from "@/hooks/useScanRole";
import { ScanStatusBadge } from "./ScanStatusBadge";
import { ScanResultGP } from "./ScanResultGP";
import { ScanResultClient } from "./ScanResultClient";
import { ScanResultAgent } from "./ScanResultAgent";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface UnifiedScanRouterProps {
  scannedUserId: string;
  onComplete: () => void;
}

type ScannedUserType = "client" | "gp" | "unknown";

interface ScannedUserInfo {
  type: ScannedUserType;
  userId: string;
  name: string;
  avatar?: string | null;
  // GP-specific
  gpId?: string;
  gpType?: string;
  rating?: number | null;
  totalDeliveries?: number | null;
  verified?: boolean;
  ktpLevel?: string;
  // Active orders between scanner & scanned user
  activeOrders: ActiveOrder[];
}

interface ActiveOrder {
  id: string;
  order_number: string;
  status: string;
  weight: number;
  total_price: number;
  currency: string;
  price_per_kg: number;
  origin_city: string;
  destination_city: string;
  origin_country: string;
  destination_country: string;
  description: string | null;
  client_id: string;
  gp_id: string;
  delivery_date: string | null;
  delivery_code?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  recipient_user_id?: string | null;
}

export function UnifiedScanRouter({ scannedUserId, onComplete }: UnifiedScanRouterProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { scanRole, permissions, userId: scannerId, gpId: scannerGpId, logScan } = useScanRole();
  const [loading, setLoading] = useState(true);
  const [scannedUser, setScannedUser] = useState<ScannedUserInfo | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ActiveOrder | null>(null);

  useEffect(() => {
    resolveScannedUser();
  }, [scannedUserId, scannerId, scannerGpId]);

  const resolveScannedUser = async () => {
    setLoading(true);
    try {
      // 1. Get scanned user's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .eq("user_id", scannedUserId)
        .maybeSingle();

      if (!profile) {
        setScannedUser(null);
        setLoading(false);
        return;
      }

      // 2. Check if scanned user is a GP
      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id, business_name, gp_type, rating, total_deliveries, verified_at, status")
        .eq("user_id", scannedUserId)
        .maybeSingle();

      // 3. Optionally get KTP level
      let ktpLevel = "basic";
      if (gpProfile) {
        const { data: ktp } = await supabase
          .from("ktp_status")
          .select("ktp_level")
          .eq("gp_id", gpProfile.id)
          .maybeSingle();
        ktpLevel = ktp?.ktp_level || "basic";
      }

      // 4. Find active orders between scanner and scanned user
      let activeOrders: ActiveOrder[] = [];
      const nonTerminalStatuses: Array<"pending" | "accepted" | "collected" | "in_transit"> = ["pending", "accepted", "collected", "in_transit"];

      if (scanRole === "gp" && scannerGpId) {
        // GP scanning a client → find orders where this GP is assigned and client is the scanned user
        const { data: orders } = await supabase
          .from("orders")
          .select("id, order_number, status, weight, total_price, currency, price_per_kg, origin_city, destination_city, origin_country, destination_country, description, client_id, gp_id, delivery_date, delivery_code, recipient_name, recipient_phone, recipient_user_id")
          .eq("gp_id", scannerGpId)
          .eq("client_id", scannedUserId)
          .in("status", nonTerminalStatuses);
        activeOrders = (orders || []) as ActiveOrder[];
        
        // Also check if scanned user is a recipient
        if (activeOrders.length === 0) {
          const { data: recipientOrders } = await supabase
            .from("orders")
            .select("id, order_number, status, weight, total_price, currency, price_per_kg, origin_city, destination_city, origin_country, destination_country, description, client_id, gp_id, delivery_date, delivery_code, recipient_name, recipient_phone, recipient_user_id")
            .eq("gp_id", scannerGpId)
            .eq("recipient_user_id", scannedUserId)
            .in("status", nonTerminalStatuses);
          activeOrders = (recipientOrders || []) as ActiveOrder[];
        }
      } else if (scanRole === "client" && scannerId && gpProfile) {
        // Client scanning a GP → find orders for this client with this GP
        const { data: orders } = await supabase
          .from("orders")
          .select("id, order_number, status, weight, total_price, currency, price_per_kg, origin_city, destination_city, origin_country, destination_country, description, client_id, gp_id, delivery_date, delivery_code, recipient_name, recipient_phone, recipient_user_id")
          .eq("client_id", scannerId)
          .eq("gp_id", gpProfile.id)
          .in("status", nonTerminalStatuses);
        activeOrders = (orders || []) as ActiveOrder[];
      } else if ((scanRole === "admin" || scanRole === "agent_logistique") && gpProfile) {
        // Admin/Agent scanning GP → show all active orders for this GP
        const { data: orders } = await supabase
          .from("orders")
          .select("id, order_number, status, weight, total_price, currency, price_per_kg, origin_city, destination_city, origin_country, destination_country, description, client_id, gp_id, delivery_date, delivery_code, recipient_name, recipient_phone, recipient_user_id")
          .eq("gp_id", gpProfile.id)
          .in("status", nonTerminalStatuses)
          .limit(20);
        activeOrders = (orders || []) as ActiveOrder[];
      }

      setScannedUser({
        type: gpProfile ? "gp" : "client",
        userId: scannedUserId,
        name: gpProfile?.business_name || profile.full_name || "Utilisateur",
        avatar: profile.avatar_url,
        gpId: gpProfile?.id,
        gpType: gpProfile?.gp_type,
        rating: gpProfile?.rating,
        totalDeliveries: gpProfile?.total_deliveries,
        verified: !!gpProfile?.verified_at,
        ktpLevel,
        activeOrders,
      });
    } catch (err) {
      console.error("Scan resolve error:", err);
      toast({ title: "Erreur de résolution", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ─── LOADING ───
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <ScanLine className="w-8 h-8 text-primary" />
          </motion.div>
          <p className="text-sm text-muted-foreground">Résolution du QR...</p>
        </div>
      </div>
    );
  }

  // ─── NOT FOUND ───
  if (!scannedUser) {
    return (
      <div className="text-center py-12 space-y-3">
        <User className="w-12 h-12 text-muted-foreground mx-auto" />
        <h3 className="font-bold">Utilisateur non trouvé</h3>
        <p className="text-sm text-muted-foreground">Ce QR code ne correspond à aucun compte Konnekt.</p>
      </div>
    );
  }

  // ─── ORDER SELECTED → Delegate to role-specific scan result ───
  if (selectedOrder) {
    if (scanRole === "gp" && scannerGpId) {
      return (
        <ScanResultGP
          order={{
            ...selectedOrder,
            client_name: scannedUser.name,
            scan_history: [],
          }}
          gpId={scannerGpId}
          logScan={logScan}
          onComplete={onComplete}
        />
      );
    }
    if (scanRole === "client") {
      return (
        <ScanResultClient
          order={{
            ...selectedOrder,
            gp_name: scannedUser.name,
            scan_history: [],
          }}
        />
      );
    }
    if (scanRole === "admin" || scanRole === "agent_logistique") {
      return (
        <ScanResultAgent
          order={{
            ...selectedOrder,
            gp_name: scannedUser.type === "gp" ? scannedUser.name : undefined,
            scan_history: [],
          }}
          logScan={logScan}
          onComplete={onComplete}
          isAdmin={scanRole === "admin"}
        />
      );
    }
  }

  // ─── MAIN SCAN RESULT VIEW ───
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-4 space-y-4"
    >
      {/* Scanned User Identity */}
      <Card className="overflow-hidden">
        <div className={`h-1 bg-gradient-to-r ${
          scannedUser.type === "gp" 
            ? "from-primary via-accent to-primary" 
            : "from-blue-500 via-primary to-blue-500"
        }`} />
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              scannedUser.type === "gp" ? "bg-primary/10" : "bg-blue-500/10"
            }`}>
              {scannedUser.type === "gp" ? (
                <Truck className="w-7 h-7 text-primary" />
              ) : (
                <User className="w-7 h-7 text-blue-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base truncate">{scannedUser.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px]">
                  {scannedUser.type === "gp" ? "Transporteur" : "Client"} Konnekt
                </Badge>
                {scannedUser.verified && (
                  <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 text-[10px] gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" /> Vérifié
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* GP-specific info */}
          {scannedUser.type === "gp" && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {scannedUser.rating !== null && scannedUser.rating !== undefined && (
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="font-bold text-sm">{scannedUser.rating.toFixed(1)}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Note</span>
                </div>
              )}
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <span className="font-bold text-sm">{scannedUser.totalDeliveries || 0}</span>
                <br />
                <span className="text-[10px] text-muted-foreground">Livraisons</span>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <Badge variant="outline" className="text-[10px]">
                  {scannedUser.ktpLevel?.toUpperCase()}
                </Badge>
                <br />
                <span className="text-[10px] text-muted-foreground">KTP</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Orders — Actions disponibles */}
      {scannedUser.activeOrders.length > 0 && (
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-sm">
                {scannedUser.activeOrders.length === 1
                  ? "Action colis active"
                  : `${scannedUser.activeOrders.length} colis actifs`
                }
              </h4>
            </div>

            <div className="space-y-2">
              {scannedUser.activeOrders.map((order) => (
                <motion.button
                  key={order.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedOrder(order)}
                  className="w-full text-left p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold">{order.order_number}</span>
                    <ScanStatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{order.origin_city}</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                    <span>{order.destination_city}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs">
                    <span className="text-muted-foreground">{order.weight} kg</span>
                    <span className="font-semibold text-primary">
                      {order.total_price.toLocaleString()} {order.currency}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No active orders — Contextual CTA */}
      {scannedUser.activeOrders.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
              <Eye className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">Aucune action en cours</p>
              <p className="text-xs text-muted-foreground mt-1">
                {scannedUser.type === "gp"
                  ? "Ce transporteur n'a aucun colis actif avec vous"
                  : "Aucun colis en attente pour ce client"
                }
              </p>
            </div>

            {/* GP: "Envoyer un colis avec ce GP" */}
            {scannedUser.type === "gp" && scanRole === "client" && scannedUser.gpId && (
              <Button
                onClick={() => {
                  onComplete();
                  navigate(`/client/transporteurs/${scannedUser.gpId}`);
                }}
                className="w-full gap-2"
              >
                <Truck className="w-4 h-4" />
                Envoyer un colis avec ce GP
              </Button>
            )}

            {/* Client: "Ajouter comme destinataire" */}
            {scannedUser.type === "client" && scanRole === "gp" && (
              <div className="space-y-2">
                <Badge variant="secondary" className="gap-1">
                  <UserPlus className="w-3 h-3" />
                  Contact enregistré
                </Badge>
                <p className="text-[11px] text-muted-foreground">
                  Ce client pourra être sélectionné comme destinataire lors de vos prochains envois
                </p>
              </div>
            )}

            {/* GP profile button for all roles */}
            {scannedUser.type === "gp" && scannedUser.gpId && (
              <Button
                variant="outline"
                onClick={() => {
                  onComplete();
                  navigate(`/client/transporteurs/${scannedUser.gpId}`);
                }}
                className="w-full gap-2"
              >
                <User className="w-4 h-4" />
                Voir le profil complet
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scanner role info */}
      <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
        <QrCode className="w-3 h-3" />
        <span>Scanné en tant que {
          scanRole === "gp" ? "Transporteur" :
          scanRole === "admin" ? "Admin" :
          scanRole === "agent_logistique" ? "Agent" : "Client"
        }</span>
      </div>
    </motion.div>
  );
}