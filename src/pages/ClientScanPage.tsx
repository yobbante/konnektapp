/**
 * ClientScanPage — Engine-driven scan page with 3 tabs
 * Scanner | Mon QR | Mes Colis
 * 
 * ALL scan resolution goes through useScanEngine.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ScanLine, QrCode, Package, Camera, MapPin, ArrowRight, ChevronRight, Info, Copy, Share2, Download, CheckCircle, Keyboard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { QRCameraScanner } from "@/components/gp/QRCameraScanner";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useScanEngine } from "@/hooks/useScanEngine";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface OrderItem {
  id: string;
  order_number: string;
  status: string;
  weight: number;
  total_price: number;
  currency: string;
  origin_city: string;
  destination_city: string;
  origin_country: string;
  destination_country: string;
  created_at: string;
  gp_id: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-warning/20 text-warning" },
  accepted: { label: "Accepté", color: "bg-primary/20 text-primary" },
  collected: { label: "Collecté", color: "bg-accent/20 text-accent" },
  in_transit: { label: "En transit", color: "bg-secondary/20 text-secondary" },
  delivered: { label: "Livré", color: "bg-success/20 text-success" },
  cancelled: { label: "Annulé", color: "bg-destructive/20 text-destructive" },
};

export default function ClientScanPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("scanner");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");

  // Mon QR
  const [userId, setUserId] = useState<string | null>(null);
  const [userQrLoaded, setUserQrLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Mes Colis
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

  // Scan Engine — replaces legacy parseQRContent + UnifiedScanRouter
  const { resolve, loading: scanLoading } = useScanEngine({
    autoNavigate: true, // Engine handles all navigation/toasts/sheets
  });

  useEffect(() => {
    loadUserAndOrders();
  }, []);

  const loadUserAndOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase
      .from("orders")
      .select("id, order_number, status, weight, total_price, currency, origin_city, destination_city, origin_country, destination_country, created_at, gp_id")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setOrders((data || []) as OrderItem[]);
    setLoadingOrders(false);
  };

  // Camera scan → resolve through engine
  const handleCameraScan = async (code: string) => {
    setCameraOpen(false);
    await resolve(code, "client");
  };

  // Manual code → resolve through engine
  const handleManualSubmit = async () => {
    if (!manualCode.trim()) return;
    await resolve(manualCode.trim(), "client");
  };

  const handleCopyUserId = () => {
    if (!userId) return;
    navigator.clipboard.writeText(userId);
    setCopied(true);
    toast({ title: "ID copié" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareQR = async () => {
    if (!navigator.share) return handleCopyUserId();
    try {
      await navigator.share({
        title: "Mon QR Konnekt",
        text: `Mon identifiant Konnekt`,
        url: `${window.location.origin}/track/user/${userId}`,
      });
    } catch { handleCopyUserId(); }
  };

  const userQrUrl = userId
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${window.location.origin}/track/user/${userId}`)}&format=png&margin=10`
    : "";

  const orderQrUrl = (orderNumber: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(orderNumber)}&format=png&margin=10`;

  const activeOrders = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const pastOrders = orders.filter(o => ["delivered", "cancelled"].includes(o.status));

  return (
    <div className="min-h-screen bg-background pb-24">
      <MobileHeader title="Scan & QR" />

      <div className="px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="scanner" className="flex items-center gap-1.5 text-xs">
              <ScanLine className="w-4 h-4" />
              Scanner
            </TabsTrigger>
            <TabsTrigger value="monqr" className="flex items-center gap-1.5 text-xs">
              <QrCode className="w-4 h-4" />
              Mon QR
            </TabsTrigger>
            <TabsTrigger value="colis" className="flex items-center gap-1.5 text-xs">
              <Package className="w-4 h-4" />
              Mes Colis
            </TabsTrigger>
          </TabsList>

          {/* ─── ONGLET SCANNER ─── */}
          <TabsContent value="scanner" className="mt-4 space-y-4">
            <Button
              className="w-full h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-primary/40 bg-primary/5"
              variant="outline"
              onClick={() => setCameraOpen(true)}
            >
              <motion.div
                className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Camera className="w-7 h-7 text-primary" />
              </motion.div>
              <span className="text-sm font-medium text-primary">Ouvrir la caméra</span>
            </Button>

            {/* Manual entry */}
            <div className="flex gap-2">
              <Input
                placeholder="CMD-XXXXXXXX ou ID"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                className="font-mono"
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
              />
              <Button onClick={handleManualSubmit} disabled={!manualCode.trim() || scanLoading}>
                {scanLoading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Keyboard className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Explications */}
            <Card className="bg-muted/30 border-border/50">
              <CardContent className="p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <Info className="w-4 h-4 text-primary" />
                  Comment ça marche ?
                </h4>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</span>
                    <span><strong>Scannez le QR d'un transporteur</strong> pour voir son profil, ses offres et vos colis en cours avec lui.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</span>
                    <span><strong>Scannez le QR d'un autre client</strong> pour l'ajouter comme destinataire ou voir vos colis partagés.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">3</span>
                    <span><strong>Entrez un numéro de commande</strong> (CMD-XXXX) pour retrouver un colis manuellement.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── ONGLET MON QR ─── */}
          <TabsContent value="monqr" className="mt-4 space-y-4">
            {userId ? (
              <>
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex justify-center"
                >
                  <div className="p-5 bg-white rounded-2xl shadow-sm border">
                    {!userQrLoaded && (
                      <div className="w-56 h-56 flex items-center justify-center">
                        <MiniLoader size="md" />
                      </div>
                    )}
                    <img
                      src={userQrUrl}
                      alt="Mon QR Code"
                      className={`w-56 h-56 ${userQrLoaded ? "block" : "hidden"}`}
                      onLoad={() => setUserQrLoaded(true)}
                    />
                  </div>
                </motion.div>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Votre identifiant Konnekt</p>
                  <button onClick={handleCopyUserId} className="font-mono text-sm font-semibold text-primary flex items-center gap-1.5 mx-auto">
                    {userId.slice(0, 8)}...
                    {copied ? <CheckCircle className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={handleShareQR}>
                    <Share2 className="w-4 h-4 mr-1.5" />
                    Partager
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const link = document.createElement("a");
                    link.href = userQrUrl;
                    link.download = "mon-qr-konnekt.png";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}>
                    <Download className="w-4 h-4 mr-1.5" />
                    Télécharger
                  </Button>
                </div>

                <Card className="bg-muted/30 border-border/50">
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-medium flex items-center gap-2 text-sm">
                      <Info className="w-4 h-4 text-primary" />
                      À quoi sert mon QR ?
                    </h4>
                    <ul className="text-xs text-muted-foreground space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</span>
                        <span><strong>Remise de colis :</strong> Présentez ce QR au transporteur lors du dépôt pour une confirmation instantanée.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</span>
                        <span><strong>Identité Konnekt :</strong> Un autre client peut vous scanner pour vous ajouter comme destinataire.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">3</span>
                        <span><strong>Partagez-le :</strong> Envoyez votre QR par message pour des remises rapides sans saisie manuelle.</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-12">
                <QrCode className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Connectez-vous pour voir votre QR Code</p>
              </div>
            )}
          </TabsContent>

          {/* ─── ONGLET MES COLIS ─── */}
          <TabsContent value="colis" className="mt-4 space-y-4">
            {loadingOrders ? (
              <div className="flex justify-center py-12">
                <MiniLoader size="md" showText text="Chargement..." />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Aucun colis pour le moment</p>
              </div>
            ) : (
              <>
                {activeOrders.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">En cours ({activeOrders.length})</h3>
                    {activeOrders.map(order => (
                      <OrderCard key={order.id} order={order} onSelect={() => setSelectedOrder(order)} />
                    ))}
                  </div>
                )}
                {pastOrders.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">Historique ({pastOrders.length})</h3>
                    {pastOrders.slice(0, 10).map(order => (
                      <OrderCard key={order.id} order={order} onSelect={() => setSelectedOrder(order)} />
                    ))}
                  </div>
                )}
              </>
            )}

            <Card className="bg-muted/30 border-border/50">
              <CardContent className="p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <Info className="w-4 h-4 text-primary" />
                  Vos colis en un clin d'œil
                </h4>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</span>
                    <span>Appuyez sur un colis pour voir ses <strong>détails et son QR Code</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</span>
                    <span>Présentez le <strong>QR du colis</strong> au transporteur lors du dépôt ou au destinataire pour la réception.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">3</span>
                    <span>Chaque scan met à jour le <strong>statut en temps réel</strong> pour vous et votre destinataire.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Camera Scanner */}
      <QRCameraScanner isOpen={cameraOpen} onScan={handleCameraScan} onClose={() => setCameraOpen(false)} />

      {/* Order Detail Sheet */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl overflow-y-auto">
          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base">{selectedOrder.order_number}</h3>
                <Badge className={STATUS_LABELS[selectedOrder.status]?.color || "bg-muted"}>
                  {STATUS_LABELS[selectedOrder.status]?.label || selectedOrder.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {selectedOrder.origin_city} → {selectedOrder.destination_city}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Poids</p>
                  <p className="font-bold">{selectedOrder.weight} kg</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Montant</p>
                  <p className="font-bold">{selectedOrder.total_price?.toLocaleString()} {selectedOrder.currency}</p>
                </div>
              </div>
              <div className="flex justify-center py-4">
                <div className="bg-white p-4 rounded-xl shadow-sm">
                  <img
                    src={orderQrUrl(selectedOrder.order_number)}
                    alt={`QR ${selectedOrder.order_number}`}
                    className="w-48 h-48"
                  />
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Présentez ce QR au transporteur ou au destinataire
              </p>
              <p className="text-center text-[10px] text-muted-foreground/60">
                {format(new Date(selectedOrder.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ─── Order Card Component ─── */
function OrderCard({ order, onSelect }: { order: OrderItem; onSelect: () => void }) {
  const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: "bg-muted" };
  return (
    <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={onSelect}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-xs font-bold">{order.order_number}</span>
          <Badge className={`text-[10px] ${statusInfo.color}`}>{statusInfo.label}</Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span>{order.origin_city} → {order.destination_city}</span>
          <span className="ml-auto font-medium">{order.weight} kg</span>
        </div>
      </CardContent>
    </Card>
  );
}
