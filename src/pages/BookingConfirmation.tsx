import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Package, MapPin, Calendar, User, MessageCircle, Home, ArrowRight, Plane, Clock, Shield, Copy, Phone, MapPinned, Lock, Eye, QrCode, Building2 } from "lucide-react";
import { DepartureInfoCard } from "@/components/booking/DepartureInfoCard";
import { supabase } from "@/integrations/supabase/client";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useGPContactRelease } from "@/hooks/useGPContactRelease";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { OrderQRCode } from "@/components/client/OrderQRCode";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
interface OrderDetails {
  id: string;
  order_number: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  total_price: number;
  currency: string;
  weight: number;
  status: string;
  payment_status: string;
  description: string | null;
  created_at: string;
  gp_id: string;
  offer_id: string | null;
}
interface OfferDetails {
  departure_date: string;
  arrival_date: string | null;
  airline: string | null;
  flight_number: string | null;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
}
export default function BookingConfirmation() {
  const {
    orderId
  } = useParams();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [offer, setOffer] = useState<OfferDetails | null>(null);

  // Progressive release hook
  const {
    publicInfo,
    contactInfo,
    canSeeDepositAddress,
    canSeeWhatsApp,
    canSeeReceptionAddress,
    canSeeSecondaryPhone
  } = useGPContactRelease(order?.gp_id, order ? {
    orderId: order.id,
    status: order.status,
    paymentStatus: order.payment_status
  } : undefined);
  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);
  const loadOrderDetails = async () => {
    if (!orderId) {
      navigate("/");
      return;
    }
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      const {
        data: orderData,
        error: orderError
      } = await supabase.from("orders").select("*").eq("id", orderId).eq("client_id", user.id).single();
      if (orderError || !orderData) {
        toast({
          title: "Commande non trouvée",
          variant: "destructive"
        });
        navigate("/client/dashboard");
        return;
      }
      setOrder(orderData);
      if (orderData.offer_id) {
        const {
          data: offerData
        } = await supabase.from("gp_offers").select("departure_date, arrival_date, airline, flight_number, origin_city, origin_country, destination_city, destination_country").eq("id", orderData.offer_id).single();
        if (offerData) setOffer(offerData);
      }
    } catch (error) {
      console.error("Error loading order:", error);
    } finally {
      setLoading(false);
    }
  };
  const copyOrderNumber = () => {
    if (order?.order_number) {
      navigator.clipboard.writeText(order.order_number);
      toast({
        title: "Numéro copié",
        description: order.order_number
      });
    }
  };
  const handleContactGP = () => {
    navigate("/messages");
  };
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>;
  }
  if (!order) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Commande non trouvée</p>
          <Button onClick={() => navigate("/")} className="mt-4">Retour à l'accueil</Button>
        </div>
      </div>;
  }
  const currencySymbol = getCurrencySymbol(order.currency);
  const isPaid = order.payment_status === "paid" || ["accepted", "collected", "in_transit", "delivered"].includes(order.status);
  const isDelivered = order.status === "delivered";
  return <div className="min-h-screen bg-background pb-safe">
      <MobileHeader />

      <div className="px-4 py-6" style={{
      paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))'
    }}>
        {/* Success Animation */}
        <motion.div initial={{
        scale: 0
      }} animate={{
        scale: 1
      }} transition={{
        type: "spring",
        stiffness: 200,
        damping: 15
      }} className="text-center mb-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-4">
            <motion.div initial={{
            scale: 0,
            rotate: -180
          }} animate={{
            scale: 1,
            rotate: 0
          }} transition={{
            delay: 0.2,
            type: "spring"
          }}>
              <CheckCircle className="w-10 h-10 text-success" />
            </motion.div>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-1">Réservation confirmée !</h1>
          <p className="text-sm text-muted-foreground">
            Votre demande a été envoyée au transporteur
          </p>
        </motion.div>

        {/* Order Number Card */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.1
      }}>
          <Card className="mb-4 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Numéro de commande</p>
                  <p className="text-lg font-bold font-mono text-primary">{order.order_number}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={copyOrderNumber}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Route Summary */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.2
      }}>
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <Plane className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Trajet</h3>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-bold text-lg">{order.origin_city}</p>
                  <p className="text-xs text-muted-foreground">{order.origin_country}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <div className="w-10 h-0.5 bg-border" />
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <div className="w-10 h-0.5 bg-border" />
                  <div className="w-2 h-2 rounded-full bg-accent" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-bold text-lg">{order.destination_city}</p>
                  <p className="text-xs text-muted-foreground">{order.destination_country}</p>
                </div>
              </div>

              {offer && (
                <div className="mt-4 pt-4 border-t">
                  <DepartureInfoCard
                    departureDate={offer.departure_date}
                    arrivalDate={offer.arrival_date}
                    airline={offer.airline}
                    flightNumber={offer.flight_number}
                    originCity={offer.origin_city || order.origin_city}
                    originCountry={offer.origin_country || order.origin_country}
                    destinationCity={offer.destination_city || order.destination_city}
                    destinationCountry={offer.destination_country || order.destination_country}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Order Details */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.3
      }}>
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <Package className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Détails</h3>
              </div>
              
              <div className="space-y-3">
                {order.description && <div className="flex justify-between items-start">
                    <span className="text-sm text-muted-foreground">Contenu</span>
                    <span className="text-sm font-medium text-right max-w-[60%]">{order.description}</span>
                  </div>}
                {order.weight > 0 && <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Poids total</span>
                    <span className="text-sm font-medium">{order.weight} kg</span>
                  </div>}
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Total à payer</span>
                  <span className="text-lg font-bold text-primary">
                    {order.total_price.toLocaleString()} {currencySymbol}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Transporter Info with Progressive Release */}
        {publicInfo && <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.4
      }}>
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <User className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Votre transporteur</h3>
                </div>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{publicInfo.business_name}</p>
                      {publicInfo.verified_at && <Shield className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {publicInfo.city}, {publicInfo.country_code}
                    </p>
                  </div>
                </div>

                {/* Progressive Contact Info Release */}
                <div className="space-y-3 pt-3 border-t">
                  {/* Deposit Address - Visible after payment */}
                  <div className="flex items-start gap-3">
                    <MapPinned className={`w-5 h-5 mt-0.5 ${canSeeDepositAddress ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">Adresse de dépôt</p>
                        {!canSeeDepositAddress && <Badge variant="secondary" className="text-[10px] gap-1">
                            <Lock className="w-3 h-3" />
                            Après paiement
                          </Badge>}
                      </div>
                      {canSeeDepositAddress && contactInfo.deposit_address ? <p className="text-sm text-muted-foreground">{contactInfo.deposit_address}</p> : <p className="text-sm text-muted-foreground italic">
                          {isPaid ? "Non renseignée" : "Visible après paiement"}
                        </p>}
                    </div>
                  </div>

                  {/* WhatsApp - Visible after payment */}
                  <div className="flex items-start gap-3">
                    <Phone className={`w-5 h-5 mt-0.5 ${canSeeWhatsApp ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">WhatsApp</p>
                        {!canSeeWhatsApp && <Badge variant="secondary" className="text-[10px] gap-1">
                            <Lock className="w-3 h-3" />
                            Après paiement
                          </Badge>}
                        {canSeeWhatsApp && <Badge variant="default" className="text-[10px] gap-1">
                            <Eye className="w-3 h-3" />
                            Visible
                          </Badge>}
                      </div>
                      {canSeeWhatsApp && contactInfo.whatsapp_number ? <a href={`https://wa.me/${contactInfo.whatsapp_number.replace(/\D/g, '')}`} className="text-sm text-primary underline" target="_blank" rel="noopener noreferrer">
                          {contactInfo.whatsapp_number}
                        </a> : <p className="text-sm text-muted-foreground italic">
                          {isPaid ? "Non renseigné" : "Visible après paiement"}
                        </p>}
                    </div>
                  </div>

                  {/* Reception Address - Visible after delivery */}
                  <div className="flex items-start gap-3">
                    <MapPin className={`w-5 h-5 mt-0.5 ${canSeeReceptionAddress ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">Adresse de réception</p>
                        {!canSeeReceptionAddress && <Badge variant="secondary" className="text-[10px] gap-1">
                            <Lock className="w-3 h-3" />
                            Après livraison
                          </Badge>}
                      </div>
                      {canSeeReceptionAddress && contactInfo.reception_address ? <p className="text-sm text-muted-foreground">{contactInfo.reception_address}</p> : <p className="text-sm text-muted-foreground italic">
                          {isDelivered ? "Non renseignée" : "Visible après livraison"}
                        </p>}
                    </div>
                  </div>

                  {/* Secondary Phone - Visible after delivery */}
                  {canSeeSecondaryPhone && contactInfo.phone_secondary && <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 mt-0.5 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Téléphone secondaire</p>
                        <p className="text-sm text-muted-foreground">{contactInfo.phone_secondary}</p>
                      </div>
                    </div>}
                </div>

                <Button onClick={handleContactGP} className="w-full mt-4 gap-2" variant="outline">
                  <MessageCircle className="w-4 h-4" />
                  Contacter via messagerie
                </Button>
              </CardContent>
            </Card>
          </motion.div>}

        {/* Next Steps */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.5
      }}>
          <Card className="mb-4 bg-muted/50">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Prochaines étapes</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${order.status !== 'pending' ? 'bg-success/20' : 'bg-primary/10'}`}>
                    <span className={`text-xs font-bold ${order.status !== 'pending' ? 'text-success' : 'text-primary'}`}>1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Confirmation du transporteur</p>
                    <p className="text-xs text-muted-foreground">
                      Le transporteur confirmera votre réservation sous 24h
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isPaid ? 'bg-success/20' : 'bg-muted'}`}>
                    <span className={`text-xs font-bold ${isPaid ? 'text-success' : 'text-muted-foreground'}`}>2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Paiement & adresse de dépôt</p>
                    <p className="text-xs text-muted-foreground">
                      {isPaid ? "✅ Adresse de dépôt disponible ci-dessus" : "L'adresse de dépôt s'affichera après paiement"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isDelivered ? 'bg-success/20' : 'bg-muted'}`}>
                    <span className={`text-xs font-bold ${isDelivered ? 'text-success' : 'text-muted-foreground'}`}>3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Livraison & adresse de réception</p>
                    <p className="text-xs text-muted-foreground">
                      {isDelivered ? "✅ Adresse de réception disponible" : "L'adresse de réception s'affichera après livraison"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* QR Code for Deposit/Delivery */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 0.55
      }}>
          <OrderQRCode orderNumber={order.order_number} orderId={order.id} status={order.status} />
        </motion.div>

        {/* Action Buttons */}
        
      </div>

      <MobileNav />
    </div>;
}