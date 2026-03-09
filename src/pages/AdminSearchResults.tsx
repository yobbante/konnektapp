/**
 * AdminSearchResults — Full info page for admin searches
 * Shows comprehensive details for transporters and orders
 */
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Search, ArrowLeft, Truck, Package, User, MapPin, Phone,
  Mail, Calendar, Star, Shield, ExternalLink, Clock, DollarSign,
  FileText, MessageSquare, History, CheckCircle, XCircle, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { PageLoader } from "@/components/ui/PageLoader";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SearchResultGP {
  id: string;
  user_id: string;
  business_name: string;
  gp_type: string;
  status: string;
  city: string;
  phone: string;
  whatsapp?: string;
  rating: number;
  total_deliveries: number;
  total_reviews: number;
  created_at: string;
  verified_at?: string;
  zones_covered?: string[];
  international_destinations?: string[];
  description?: string;
  commission_rate?: number;
  reception_address?: string;
  profile_email?: string;
}

interface SearchResultOrder {
  id: string;
  order_number: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  status: string;
  logistics_status?: string;
  total_price: number;
  commission_amount: number;
  weight: number;
  created_at: string;
  pickup_date?: string;
  delivery_date?: string;
  actual_delivery_date?: string;
  tracking_code?: string;
  description?: string;
  client_id?: string;
  gp_id?: string;
  gp_profile?: { business_name: string; phone?: string; city?: string };
  client_profile?: { full_name?: string; email?: string; phone?: string };
  insurance_fee?: number;
  pickup_fee?: number;
  delivery_fee?: number;
  currency?: string;
}

const GP_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-amber-100 text-amber-800" },
  verified: { label: "Vérifié", color: "bg-green-100 text-green-800" },
  suspended: { label: "Suspendu", color: "bg-red-100 text-red-800" },
  rejected: { label: "Rejeté", color: "bg-destructive/10 text-destructive" },
};

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "En attente", color: "bg-amber-100 text-amber-800", icon: Clock },
  accepted: { label: "Acceptée", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
  collected: { label: "Collectée", color: "bg-indigo-100 text-indigo-800", icon: Package },
  in_transit: { label: "En transit", color: "bg-purple-100 text-purple-800", icon: Truck },
  arrived: { label: "Arrivée", color: "bg-cyan-100 text-cyan-800", icon: MapPin },
  delivered: { label: "Livrée", color: "bg-green-100 text-green-800", icon: CheckCircle },
  cancelled: { label: "Annulée", color: "bg-destructive/10 text-destructive", icon: XCircle },
};

export default function AdminSearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAdmin, isModerator, loading: roleLoading } = useUserRole();
  const q = searchParams.get("q") || "";
  const [query, setQuery] = useState(q);
  const [loading, setLoading] = useState(false);
  const [gps, setGps] = useState<SearchResultGP[]>([]);
  const [orders, setOrders] = useState<SearchResultOrder[]>([]);

  useEffect(() => {
    if (!roleLoading && !isAdmin && !isModerator) {
      navigate("/");
    }
  }, [roleLoading, isAdmin, isModerator]);

  useEffect(() => {
    if (q.length >= 2) {
      performSearch(q);
    }
  }, [q]);

  const performSearch = async (searchTerm: string) => {
    setLoading(true);
    try {
      const [gpsResult, ordersResult] = await Promise.all([
        supabase
          .from("gp_profiles")
          .select("*")
          .or(`business_name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("orders")
          .select(`*, gp_profile:gp_profiles(business_name, phone, city)`)
          .or(`order_number.ilike.%${searchTerm}%,origin_city.ilike.%${searchTerm}%,destination_city.ilike.%${searchTerm}%,tracking_code.ilike.%${searchTerm}%`)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      // Enrich GPs with profile emails
      const gpData = gpsResult.data || [];
      if (gpData.length > 0) {
        const userIds = gpData.map(gp => gp.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email, full_name, phone")
          .in("user_id", userIds);
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        gpData.forEach((gp: any) => {
          const profile = profileMap.get(gp.user_id);
          gp.profile_email = profile?.email || null;
        });
      }

      // Enrich orders with client info
      const orderData = ordersResult.data || [];
      if (orderData.length > 0) {
        const clientIds = [...new Set(orderData.map(o => o.client_id).filter(Boolean))];
        if (clientIds.length > 0) {
          const { data: clientProfiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, email, phone")
            .in("user_id", clientIds);
          const clientMap = new Map((clientProfiles || []).map(p => [p.user_id, p]));
          orderData.forEach((order: any) => {
            order.client_profile = clientMap.get(order.client_id) || null;
          });
        }
      }

      setGps(gpData);
      setOrders(orderData);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.length >= 2) {
      setSearchParams({ q: query });
    }
  };

  const totalResults = gps.length + orders.length;

  if (roleLoading) return <PageLoader message="Vérification des permissions..." />;

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[hsl(var(--admin-header,230_80%_20%))] text-white shadow-md">
        <div className="py-3 px-4" style={{ paddingTop: 'calc(12px + var(--safe-top, 0px))' }}>
          <div className="flex items-center gap-3 max-w-7xl mx-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
              className="bg-white/10 hover:bg-white/20 text-inherit rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Recherche Admin</h1>
              <p className="text-[11px] opacity-70">
                {loading ? "Recherche..." : `${totalResults} résultat${totalResults > 1 ? 's' : ''} pour "${q}"`}
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="px-4 pb-3">
          <div className="relative max-w-7xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <Input
              placeholder="Rechercher transporteurs, commandes..."
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 rounded-xl h-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </form>
      </div>

      {/* Results */}
      <div className="px-4 py-4 max-w-7xl mx-auto space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : totalResults === 0 && q.length >= 2 ? (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Aucun résultat</h3>
            <p className="text-muted-foreground text-sm">Essayez un autre terme de recherche</p>
          </div>
        ) : (
          <Tabs defaultValue={gps.length > 0 ? "transporteurs" : "commandes"}>
            <TabsList className="grid grid-cols-2 w-full max-w-md">
              <TabsTrigger value="transporteurs" className="gap-2">
                <Truck className="w-4 h-4" />
                Transporteurs ({gps.length})
              </TabsTrigger>
              <TabsTrigger value="commandes" className="gap-2">
                <Package className="w-4 h-4" />
                Commandes ({orders.length})
              </TabsTrigger>
            </TabsList>

            {/* TRANSPORTERS RESULTS */}
            <TabsContent value="transporteurs" className="space-y-4 mt-4">
              {gps.map(gp => {
                const statusConf = GP_STATUS_CONFIG[gp.status] || { label: gp.status, color: "bg-muted" };
                return (
                  <Card key={gp.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Truck className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-bold text-base">{gp.business_name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge className={`text-xs ${statusConf.color}`}>{statusConf.label}</Badge>
                              <span className="text-xs text-muted-foreground capitalize">
                                {gp.gp_type === "bagages_international" ? "GP via Bagages" : gp.gp_type}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/gp/${gp.id}`)}
                          className="gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Détails
                        </Button>
                      </div>

                      <Separator />

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <InfoRow icon={MapPin} label="Ville" value={gp.city || "—"} />
                        <InfoRow icon={Phone} label="Téléphone" value={gp.phone || "—"} />
                        <InfoRow icon={Mail} label="Email" value={gp.profile_email || "—"} />
                        <InfoRow icon={Star} label="Note" value={gp.rating > 0 ? `${gp.rating.toFixed(1)}/5 (${gp.total_reviews} avis)` : "Pas encore noté"} />
                        <InfoRow icon={Package} label="Livraisons" value={`${gp.total_deliveries} effectuées`} />
                        <InfoRow icon={Calendar} label="Inscrit le" value={gp.created_at ? format(new Date(gp.created_at), "d MMM yyyy", { locale: fr }) : "—"} />
                        {gp.verified_at && (
                          <InfoRow icon={Shield} label="Vérifié le" value={format(new Date(gp.verified_at), "d MMM yyyy", { locale: fr })} />
                        )}
                        {gp.commission_rate != null && (
                          <InfoRow icon={DollarSign} label="Commission" value={`${gp.commission_rate}%`} />
                        )}
                      </div>

                      {/* Zones */}
                      {gp.zones_covered && gp.zones_covered.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Zones couvertes</p>
                          <div className="flex flex-wrap gap-1">
                            {gp.zones_covered.map(z => (
                              <Badge key={z} variant="outline" className="text-xs">{z}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {gp.international_destinations && gp.international_destinations.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Destinations internationales</p>
                          <div className="flex flex-wrap gap-1">
                            {gp.international_destinations.map(d => (
                              <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {gp.reception_address && (
                        <InfoRow icon={MapPin} label="Adresse de réception" value={gp.reception_address} />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            {/* ORDERS RESULTS */}
            <TabsContent value="commandes" className="space-y-4 mt-4">
              {orders.map(order => {
                const statusConf = ORDER_STATUS_CONFIG[order.status] || { label: order.status, color: "bg-muted", icon: Clock };
                const StatusIcon = statusConf.icon;
                return (
                  <Card key={order.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-base">{order.order_number}</span>
                            <Badge className={`text-xs gap-1 ${statusConf.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConf.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {order.origin_city}, {order.origin_country} → {order.destination_city}, {order.destination_country}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/order/${order.id}`)}
                          className="gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Détails
                        </Button>
                      </div>

                      <Separator />

                      {/* Financial Info */}
                      <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="font-bold text-sm">{order.total_price?.toLocaleString()} {order.currency || "FCFA"}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Commission</p>
                          <p className="font-bold text-sm text-primary">{order.commission_amount?.toLocaleString()} {order.currency || "FCFA"}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Poids</p>
                          <p className="font-bold text-sm">{order.weight} kg</p>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <InfoRow icon={Calendar} label="Créée le" value={order.created_at ? format(new Date(order.created_at), "d MMM yyyy HH:mm", { locale: fr }) : "—"} />
                        {order.pickup_date && (
                          <InfoRow icon={Calendar} label="Enlèvement" value={format(new Date(order.pickup_date), "d MMM yyyy", { locale: fr })} />
                        )}
                        {order.tracking_code && (
                          <InfoRow icon={FileText} label="Code suivi" value={order.tracking_code} />
                        )}
                        {order.actual_delivery_date && (
                          <InfoRow icon={CheckCircle} label="Livré le" value={format(new Date(order.actual_delivery_date), "d MMM yyyy HH:mm", { locale: fr })} />
                        )}
                      </div>

                      {/* GP Info */}
                      {order.gp_profile && (
                        <div className="p-3 bg-primary/5 rounded-lg">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Transporteur</p>
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-primary" />
                            <span className="font-medium text-sm">{order.gp_profile.business_name}</span>
                            {order.gp_profile.phone && (
                              <span className="text-xs text-muted-foreground">• {order.gp_profile.phone}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Client Info */}
                      {order.client_profile && (
                        <div className="p-3 bg-secondary/5 rounded-lg">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Client</p>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-secondary-foreground" />
                            <span className="font-medium text-sm">{order.client_profile.full_name || "Client"}</span>
                            {order.client_profile.email && (
                              <span className="text-xs text-muted-foreground">• {order.client_profile.email}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Logistics fees */}
                      {(order.insurance_fee || order.pickup_fee || order.delivery_fee) && (
                        <div className="flex flex-wrap gap-2 text-xs">
                          {order.insurance_fee ? (
                            <Badge variant="outline">Assurance: {order.insurance_fee.toLocaleString()} FCFA</Badge>
                          ) : null}
                          {order.pickup_fee ? (
                            <Badge variant="outline">Enlèvement: {order.pickup_fee.toLocaleString()} FCFA</Badge>
                          ) : null}
                          {order.delivery_fee ? (
                            <Badge variant="outline">Livraison: {order.delivery_fee.toLocaleString()} FCFA</Badge>
                          ) : null}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
