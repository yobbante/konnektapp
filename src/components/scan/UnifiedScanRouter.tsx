/**
 * UnifiedScanRouter — Smart QR scan result router (V2 ENGINE-DRIVEN)
 * 
 * Resolution logic is now handled by the backend scan-engine.
 * This component only handles USER QR scans (konnekt://user/{userId}).
 * All operational actions delegate to useScanEngine.executeAction().
 * 
 * No direct DB mutations for order status changes.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User, Package, Truck, Star, MapPin, ArrowRight,
  CheckCircle, QrCode, UserPlus, Eye, ShieldCheck,
  Calendar, AlertTriangle, ScanLine, UserCheck, Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MiniLoader } from "@/components/ui/MiniLoader";
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
import { cn } from "@/lib/utils";

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
  gpId?: string;
  gpType?: string;
  rating?: number | null;
  totalDeliveries?: number | null;
  verified?: boolean;
  ktpLevel?: string;
  city?: string;
  restrictions?: string[] | null;
  currency?: string | null;
  depositAddress?: string | null;
  receptionAddress?: string | null;
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
  flat_rate_items?: any[] | null;
  content_nature?: string[] | null;
}

export function UnifiedScanRouter({ scannedUserId, onComplete }: UnifiedScanRouterProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { scanRole, permissions, userId: scannerId, gpId: scannerGpId, logScan, loading: roleLoading } = useScanRole();
  const [loading, setLoading] = useState(true);
  const [scannedUser, setScannedUser] = useState<ScannedUserInfo | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ActiveOrder | null>(null);

  useEffect(() => {
    if (!roleLoading) {
      if (!scanRole || !scannerId) {
        console.warn("[UnifiedScanRouter] No scanRole or scannerId detected, role:", scanRole, "scannerId:", scannerId);
        redirectToPublicPage();
        return;
      }
      console.log("[UnifiedScanRouter] Resolving scanned user:", scannedUserId, "as role:", scanRole, "gpId:", scannerGpId);
      resolveScannedUser();
    }
  }, [scannedUserId, scannerId, scannerGpId, roleLoading]);

  const redirectToPublicPage = async () => {
    try {
      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id")
        .eq("user_id", scannedUserId)
        .eq("status", "verified")
        .maybeSingle();

      if (gpProfile) {
        navigate(`/client/transporteurs/${gpProfile.id}`);
      } else {
        navigate(`/track/user/${scannedUserId}`);
      }
    } catch {
      navigate(`/track/user/${scannedUserId}`);
    }
  };

  const resolveScannedUser = async () => {
    setLoading(true);
    try {
      console.log("[UnifiedScanRouter] Looking up profile for:", scannedUserId);
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, city")
        .eq("user_id", scannedUserId)
        .maybeSingle();

      if (profileError) {
        console.error("[UnifiedScanRouter] Profile lookup error:", profileError);
      }

      if (!profile) {
        console.warn("[UnifiedScanRouter] No profile found for user:", scannedUserId);
        setScannedUser(null);
        setLoading(false);
        return;
      }

      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id, business_name, gp_type, rating, total_deliveries, verified_at, status, city, explicit_restrictions, default_currency, deposit_address, reception_address")
        .eq("user_id", scannedUserId)
        .maybeSingle();

      let ktpLevel = "basic";
      if (gpProfile) {
        const { data: ktp } = await supabase
          .from("ktp_status")
          .select("ktp_level")
          .eq("gp_id", gpProfile.id)
          .maybeSingle();
        ktpLevel = ktp?.ktp_level || "basic";
      }

      let activeOrders: ActiveOrder[] = [];
      const nonTerminalStatuses = ["pending", "accepted", "paid_held", "checked_in", "collected", "weight_pending_payment", "scheduled_departure", "in_transit", "arrived_destination", "delivery_pending", "delivery_confirmed", "delivered"] as const;

      if (scanRole === "gp" && scannerGpId) {
        const { data: orders } = await supabase
          .from("orders")
          .select("id, order_number, status, weight, total_price, currency, price_per_kg, origin_city, destination_city, origin_country, destination_country, description, client_id, gp_id, delivery_date, delivery_code, recipient_name, recipient_phone, recipient_user_id, flat_rate_items, content_nature")
          .eq("gp_id", scannerGpId)
          .eq("client_id", scannedUserId)
          .in("status", nonTerminalStatuses);
        activeOrders = (orders || []) as ActiveOrder[];
        
        if (activeOrders.length === 0) {
          const { data: recipientOrders } = await supabase
            .from("orders")
            .select("id, order_number, status, weight, total_price, currency, price_per_kg, origin_city, destination_city, origin_country, destination_country, description, client_id, gp_id, delivery_date, delivery_code, recipient_name, recipient_phone, recipient_user_id, flat_rate_items, content_nature")
            .eq("gp_id", scannerGpId)
            .eq("recipient_user_id", scannedUserId)
            .in("status", nonTerminalStatuses);
          activeOrders = (recipientOrders || []) as ActiveOrder[];
        }
      } else if (scanRole === "client" && scannerId && gpProfile) {
        const { data: orders } = await supabase
          .from("orders")
          .select("id, order_number, status, weight, total_price, currency, price_per_kg, origin_city, destination_city, origin_country, destination_country, description, client_id, gp_id, delivery_date, delivery_code, recipient_name, recipient_phone, recipient_user_id, flat_rate_items, content_nature")
          .eq("client_id", scannerId)
          .eq("gp_id", gpProfile.id)
          .in("status", nonTerminalStatuses);
        activeOrders = (orders || []) as ActiveOrder[];
      } else if (scanRole === "client" && scannerId && !gpProfile) {
        const { data: orders } = await supabase
          .from("orders")
          .select("id, order_number, status, weight, total_price, currency, price_per_kg, origin_city, destination_city, origin_country, destination_country, description, client_id, gp_id, delivery_date, delivery_code, recipient_name, recipient_phone, recipient_user_id, flat_rate_items, content_nature")
          .eq("client_id", scannerId)
          .eq("recipient_user_id", scannedUserId)
          .in("status", nonTerminalStatuses);
        activeOrders = (orders || []) as ActiveOrder[];
      } else if ((scanRole === "admin" || scanRole === "agent_logistique")) {
        const gpIdFilter = gpProfile?.id;
        if (gpIdFilter) {
          const { data: orders } = await supabase
            .from("orders")
            .select("id, order_number, status, weight, total_price, currency, price_per_kg, origin_city, destination_city, origin_country, destination_country, description, client_id, gp_id, delivery_date, delivery_code, recipient_name, recipient_phone, recipient_user_id, flat_rate_items, content_nature")
            .eq("gp_id", gpIdFilter)
            .in("status", nonTerminalStatuses)
            .limit(20);
          activeOrders = (orders || []) as ActiveOrder[];
        } else {
          const { data: orders } = await supabase
            .from("orders")
            .select("id, order_number, status, weight, total_price, currency, price_per_kg, origin_city, destination_city, origin_country, destination_country, description, client_id, gp_id, delivery_date, delivery_code, recipient_name, recipient_phone, recipient_user_id, flat_rate_items, content_nature")
            .eq("client_id", scannedUserId)
            .in("status", nonTerminalStatuses)
            .limit(20);
          activeOrders = (orders || []) as ActiveOrder[];
        }
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
        city: gpProfile?.city || profile.city || undefined,
        restrictions: gpProfile?.explicit_restrictions,
        currency: gpProfile?.default_currency,
        depositAddress: gpProfile?.deposit_address || undefined,
        receptionAddress: gpProfile?.reception_address || undefined,
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
        <MiniLoader size="md" showText text="Résolution du QR..." />
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
        <Button variant="outline" onClick={() => navigate("/offres")} className="gap-2">
          <Package className="w-4 h-4" />
          Voir les offres
        </Button>
      </div>
    );
  }

  // ─── ORDER SELECTED → Delegate to role-specific scan result ───
  if (selectedOrder) {
    const backButton = (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setSelectedOrder(null)}
        className="gap-1.5 h-8 px-3 rounded-xl text-xs font-medium mb-3"
      >
        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
        Retour aux colis
      </Button>
    );

    if (scanRole === "gp" && scannerGpId) {
      return (
        <div>
          {backButton}
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
        </div>
      );
    }
    if (scanRole === "client") {
      return (
        <div>
          {backButton}
          <ScanResultClient
            order={{
              ...selectedOrder,
              gp_name: scannedUser.name,
              scan_history: [],
            }}
          />
        </div>
      );
    }
    if (scanRole === "admin" || scanRole === "agent_logistique") {
      return (
        <div>
          {backButton}
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
        </div>
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
      {/* Scanned User Identity Card */}
      <Card className="overflow-hidden">
        <div className={cn(
          "h-1 bg-gradient-to-r",
          scannedUser.type === "gp"
            ? "from-primary via-accent to-primary"
            : "from-secondary via-primary to-secondary"
        )} />
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center",
              scannedUser.type === "gp" ? "bg-primary/10" : "bg-secondary/10"
            )}>
              {scannedUser.type === "gp" ? (
                <Truck className="w-7 h-7 text-primary" />
              ) : (
                <User className="w-7 h-7 text-secondary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base truncate">{scannedUser.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px]">
                  {scannedUser.type === "gp" ? "Transporteur" : "Client"} Konnekt
                </Badge>
                {scannedUser.verified && (
                  <Badge className="bg-success/20 text-success text-[10px] gap-0.5 border-none">
                    <ShieldCheck className="w-2.5 h-2.5" /> Vérifié
                  </Badge>
                )}
              </div>
              {scannedUser.city && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{scannedUser.city}</span>
                </div>
              )}
            </div>
          </div>

          {/* GP Stats */}
          {scannedUser.type === "gp" && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {scannedUser.rating !== null && scannedUser.rating !== undefined && (
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-3 h-3 text-warning fill-warning" />
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

              {scanRole === "client" && (
                <>
                  {scannedUser.restrictions && scannedUser.restrictions.length > 0 && (
                    <div className="p-2 bg-muted/30 rounded-lg">
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1">Restrictions</p>
                      <div className="flex flex-wrap gap-1">
                        {scannedUser.restrictions.map((r, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{r}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {scannedUser.currency && (
                    <p className="text-[10px] text-muted-foreground">
                      Devise: <span className="font-medium">{scannedUser.currency}</span>
                    </p>
                  )}
                </>
              )}

              {scanRole === "gp" && scannedUser.depositAddress && (
                <div className="p-2 bg-muted/30 rounded-lg text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3 inline mr-1" />
                  Dépôt: {scannedUser.depositAddress}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Orders */}
      {scannedUser.activeOrders.length > 0 && (
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-sm">
                {scannedUser.activeOrders.length === 1
                  ? "Colis actif"
                  : `${scannedUser.activeOrders.length} colis actifs`
                }
              </h4>
            </div>

            <div className="p-2.5 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              {scanRole === "gp" && "Confirmer dépôt, modifier poids, confirmer livraison"}
              {scanRole === "client" && "👁️ Consultation: statut, trajet, historique"}
              {scanRole === "agent_logistique" && "Collecte, distribution, validation stock"}
              {scanRole === "admin" && "Accès complet: statuts, transitions, audit"}
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

                  {scanRole === "gp" && (
                    <div className="mt-2 flex gap-1.5">
                      {(order.status === "accepted" || order.status === "pending") && (
                        <Badge className="bg-secondary/20 text-secondary text-[9px] border-none gap-0.5">
                          <Package className="w-2.5 h-2.5" /> Dépôt possible
                        </Badge>
                      )}
                      {order.status === "in_transit" && (
                        <Badge className="bg-success/20 text-success text-[9px] border-none gap-0.5">
                          <CheckCircle className="w-2.5 h-2.5" /> Livraison possible
                        </Badge>
                      )}
                      {order.status === "collected" && (
                        <Badge className="bg-primary/20 text-primary text-[9px] border-none gap-0.5">
                          <Truck className="w-2.5 h-2.5" /> En transit
                        </Badge>
                      )}
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No active orders */}
      {scannedUser.activeOrders.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
              <Eye className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">Aucun colis actif</p>
              <p className="text-xs text-muted-foreground mt-1">
                {scanRole === "client" && scannedUser.type === "gp" && "Réservez un envoi avec ce transporteur."}
                {scanRole === "client" && scannedUser.type === "client" && "Aucun colis en commun avec cet utilisateur."}
                {scanRole === "gp" && scannedUser.type === "client" && "Ce client n'a pas de colis en cours avec vous."}
                {scanRole === "gp" && scannedUser.type === "gp" && "Vous avez scanné un autre transporteur."}
                {scanRole === "agent_logistique" && "Aucune mission active pour cet utilisateur."}
                {scanRole === "admin" && "Aucune commande active trouvée."}
              </p>
            </div>

            {scanRole === "client" && scannedUser.type === "gp" && scannedUser.gpId && (
              <Button
                onClick={() => { onComplete(); navigate(`/client/transporteurs/${scannedUser.gpId}`); }}
                className="w-full gap-2"
              >
                <Package className="w-4 h-4" />
                Réserver avec ce GP
              </Button>
            )}

            {scanRole === "client" && scannedUser.type === "client" && (
              <Button
                variant="outline"
                onClick={() => { toast({ title: "Destinataire noté", description: `${scannedUser.name} peut être ajouté lors d'un envoi.` }); }}
                className="w-full gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Ajouter comme destinataire
              </Button>
            )}

            {scanRole === "gp" && scannedUser.type === "gp" && scannedUser.gpId && (
              <Button
                variant="outline"
                onClick={() => { onComplete(); navigate(`/client/transporteurs/${scannedUser.gpId}`); }}
                className="w-full gap-2"
              >
                <Eye className="w-4 h-4" />
                Voir le profil public
              </Button>
            )}

            {scanRole === "gp" && scannedUser.type === "client" && (
              <div className="p-2.5 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                Aucune action en attente pour ce client.
              </div>
            )}

            {(scanRole === "admin" || scanRole === "agent_logistique") && (
              <Button
                variant="outline"
                onClick={() => {
                  onComplete();
                  navigate(scannedUser.type === "gp" && scannedUser.gpId
                    ? `/admin/gp/${scannedUser.gpId}`
                    : `/admin/search?q=${scannedUser.name}`);
                }}
                className="w-full gap-2"
              >
                <Eye className="w-4 h-4" />
                Voir dans l'admin
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scanner role footer */}
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
