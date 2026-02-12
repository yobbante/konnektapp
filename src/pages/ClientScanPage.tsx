/**
 * ClientScanPage — Page scan client avec 3 onglets
 * Scanner | Mon QR | Mes Colis
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
import { UnifiedScanRouter } from "@/components/scan/UnifiedScanRouter";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  const [scannedUserId, setScannedUserId] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Mon QR
  const [userId, setUserId] = useState<string | null>(null);
  const [userQrLoaded, setUserQrLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Mes Colis
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

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

  // Scanner logic
  const parseQRContent = (code: string): { type: "user" | "order"; value: string } => {
    const userUrlMatch = code.match(/\/track\/user\/([a-f0-9-]{36})/i);
    if (userUrlMatch) return { type: "user", value: userUrlMatch[1] };
    const protocolMatch = code.match(/konnekt:\/\/user\/([a-f0-9-]{36})/i);
    if (protocolMatch) return { type: "user", value: protocolMatch[1] };
    const uuidMatch = code.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
    if (uuidMatch) return { type: "user", value: code };
    return { type: "order", value: code.toUpperCase() };
  };

  const handleCameraScan = (code: string) => {
    setCameraOpen(false);
    const parsed = parseQRContent(code);
    if (parsed.type === "user") {
      setScannedUserId(parsed.value);
      setShowResult(true);
    } else {
      // Order code — show in result
      setScannedUserId(null);
      toast({ title: "Code scanné", description: parsed.value });
    }
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    handleCameraScan(manualCode.trim());
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
              <Button onClick={handleManualSubmit} disabled={!manualCode.trim()}>
                <Keyboard className="w-4 h-4" />
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

                {/* Explications */}
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
                {/* Active orders */}
                {activeOrders.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">En cours ({activeOrders.length})</h3>
                    {activeOrders.map(order => (
                      <OrderCard key={order.id} order={order} onSelect={() => setSelectedOrder(order)} />
                    ))}
                  </div>
                )}
                {/* Past orders */}
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

            {/* Explications */}
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

      {/* Scan Result Sheet */}
      <Sheet open={showResult} onOpenChange={(open) => { if (!open) { setShowResult(false); setScannedUserId(null); } }}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl overflow-y-auto">
          <SheetHeader className="pb-2">
            <SheetTitle className="flex items-center gap-2 text-base">
              <QrCode className="w-4 h-4 text-primary" />
              Résultat du scan
            </SheetTitle>
          </SheetHeader>
          {scannedUserId && (
            <UnifiedScanRouter scannedUserId={scannedUserId} onComplete={() => { setShowResult(false); setScannedUserId(null); }} />
          )}
        </SheetContent>
      </Sheet>

      {/* Order Detail Sheet */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl overflow-y-auto">
          {selectedOrder && <OrderDetailSheet order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Order Card Component ───
function OrderCard({ order, onSelect }: { order: OrderItem; onSelect: () => void }) {
  const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: "bg-muted text-muted-foreground" };

  return (
    <button onClick={onSelect} className="w-full text-left p-3 bg-card border rounded-xl hover:border-primary/30 transition-all flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Package className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold truncate">{order.order_number}</span>
          <Badge className={`text-[10px] ${statusInfo.color} border-none`}>{statusInfo.label}</Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
          <MapPin className="w-3 h-3" />
          <span>{order.origin_city}</span>
          <ArrowRight className="w-2.5 h-2.5" />
          <span>{order.destination_city}</span>
          <span className="ml-auto">{order.weight}kg</span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
}

// ─── Order Detail Sheet ───
function OrderDetailSheet({ order, onClose }: { order: OrderItem; onClose: () => void }) {
  const { toast } = useToast();
  const [qrLoaded, setQrLoaded] = useState(false);
  const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: "bg-muted" };
  const canShowQR = ["accepted", "collected", "in_transit", "delivered"].includes(order.status);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(order.order_number)}&format=png&margin=10`;

  return (
    <div className="space-y-4 py-2">
      <SheetHeader>
        <SheetTitle className="text-base">Détails du colis</SheetTitle>
      </SheetHeader>

      {/* Status */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-bold">{order.order_number}</span>
        <Badge className={`${statusInfo.color} border-none`}>{statusInfo.label}</Badge>
      </div>

      {/* Route */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">{order.origin_city}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="font-medium text-sm">{order.destination_city}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Poids</p>
              <p className="font-semibold">{order.weight} kg</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Prix total</p>
              <p className="font-semibold text-primary">{order.total_price?.toLocaleString()} {order.currency}</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Créée le {format(new Date(order.created_at), "d MMMM yyyy", { locale: fr })}
          </div>
        </CardContent>
      </Card>

      {/* QR Code */}
      {canShowQR ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary" />
              QR Code du colis
            </h4>
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-xl border">
                {!qrLoaded && <div className="w-44 h-44 flex items-center justify-center"><MiniLoader size="md" /></div>}
                <img
                  src={qrUrl}
                  alt={`QR ${order.order_number}`}
                  className={`w-44 h-44 ${qrLoaded ? "block" : "hidden"}`}
                  onLoad={() => setQrLoaded(true)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard.writeText(order.order_number);
                toast({ title: "Code copié" });
              }}>
                <Copy className="w-4 h-4 mr-1.5" />
                Copier
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const link = document.createElement("a");
                link.href = qrUrl;
                link.download = `qr-${order.order_number}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}>
                <Download className="w-4 h-4 mr-1.5" />
                Télécharger
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <QrCode className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">QR disponible après acceptation par le transporteur</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
