import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { OrderQRCode } from "@/components/client/OrderQRCode";
import { TransportPageLoader } from "@/components/ui/TransportLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, MapPin, Phone, MessageCircle, Package, CheckCircle, Info, Truck } from "lucide-react";
import { motion } from "framer-motion";

export default function RoutierOrderQRPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const orderId = params.get("order");
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [gpProfile, setGpProfile] = useState<any>(null);

  useEffect(() => {
    if (!orderId) return;
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const { data } = await supabase
        .from("orders")
        .select("*, gp:gp_id(business_name, phone, whatsapp_phone, reception_address, deposit_address, city)")
        .eq("id", orderId)
        .maybeSingle();

      if (data) {
        setOrder(data);
        setGpProfile(data.gp);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <TransportPageLoader message="Chargement..." vehicle="truck" />;
  if (!order) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <p className="text-muted-foreground">Commande introuvable</p>
    </div>
  );

  const depositAddress = gpProfile?.deposit_address || gpProfile?.reception_address || gpProfile?.city;
  const whatsapp = gpProfile?.whatsapp_phone || gpProfile?.phone;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/10 to-background px-4 pt-6 pb-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <h1 className="text-lg font-bold text-foreground">Mission acceptée !</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Téléchargez le QR code et collez-le sur votre colis avant le dépôt.
          </p>
        </motion.div>
      </div>

      <div className="px-4 space-y-4">
        {/* Step 1: Download QR */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                <h2 className="font-semibold text-sm">Téléchargez le QR du colis</h2>
              </div>
              <p className="text-xs text-muted-foreground pl-8">
                Ce QR code est unique à votre commande. Le transporteur le scannera pour confirmer la réception de votre colis.
              </p>
              <OrderQRCode
                orderNumber={order.order_number}
                orderId={order.id}
                status={order.status}
                weight={order.weight}
                originCity={order.origin_city}
                destinationCity={order.destination_city}
                totalPrice={order.total_price}
                currency={order.currency}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Step 2: Deposit info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                <h2 className="font-semibold text-sm">Déposez votre colis</h2>
              </div>

              {depositAddress && (
                <div className="pl-8 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Adresse de dépôt</p>
                    <p className="text-xs text-muted-foreground">{depositAddress}</p>
                  </div>
                </div>
              )}

              {gpProfile?.business_name && (
                <div className="pl-8 flex items-start gap-2">
                  <Truck className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Transporteur</p>
                    <p className="text-xs text-muted-foreground">{gpProfile.business_name}</p>
                  </div>
                </div>
              )}

              {whatsapp && (
                <div className="pl-8 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => window.open(`https://wa.me/${whatsapp.replace(/\D/g, '')}`, '_blank')}
                  >
                    <MessageCircle className="w-3.5 h-3.5 mr-1" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => window.open(`tel:${gpProfile?.phone}`, '_blank')}
                  >
                    <Phone className="w-3.5 h-3.5 mr-1" />
                    Appeler
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Step 3: Instructions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                <h2 className="font-semibold text-sm">Le transporteur scanne votre QR</h2>
              </div>
              <div className="pl-8 space-y-2">
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                  <span>Imprimez ou affichez le QR code sur votre téléphone lors du dépôt</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                  <span>Le transporteur confirme la prise en charge en le scannant</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                  <span>Vous recevrez une notification à chaque étape du transport</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Route summary */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Package className="w-4 h-4 text-primary" />
                <span className="font-medium">{order.origin_city}</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-medium">{order.destination_city}</span>
              </div>
              <span className="text-sm font-bold text-primary">
                {order.total_price?.toLocaleString()} {order.currency}
              </span>
            </div>
            {order.weight && (
              <p className="text-xs text-muted-foreground mt-1">{order.weight} kg</p>
            )}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Button 
            className="w-full" 
            onClick={() => navigate("/reservations")}
          >
            Voir mes réservations
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
