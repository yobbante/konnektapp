import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Package, MapPin, User, MessageCircle, Home, ArrowRight, Plane, Shield, Copy, Phone, MapPinned, Lock, Eye, QrCode } from "lucide-react";
import { DepartureInfoCard } from "@/components/booking/DepartureInfoCard";
import { PDFDownloadGate } from "@/components/booking/PDFDownloadGate";
import { DepositAddressPopup } from "@/components/client/DepositAddressPopup";
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
import { LogisticsLabelGenerator } from "@/components/logistics/LogisticsLabelGenerator";
import { MiniLoader } from "@/components/ui/MiniLoader";

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
  recipient_name: string | null;
  recipient_phone: string | null;
  recipient_user_id: string | null;
  client_id: string;
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
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [offer, setOffer] = useState<OfferDetails | null>(null);
  const [pdfGatePassed, setPdfGatePassed] = useState(false);
  const [clientName, setClientName] = useState<string>("Client");
  const [gpName, setGpName] = useState<string>("Transporteur");

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
    if (!orderId) { navigate("/"); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: orderData, error: orderError } = await supabase
        .from("orders").select("*").eq("id", orderId).eq("client_id", user.id).single();
      if (orderError || !orderData) {
        toast({ title: "Commande non trouvée", variant: "destructive" });
        navigate("/client/dashboard");
        return;
      }
      setOrder(orderData);

      // Fetch client name
      const { data: clientProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (clientProfile?.full_name) setClientName(clientProfile.full_name);

      // Fetch GP name
      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("business_name")
        .eq("id", orderData.gp_id)
        .maybeSingle();
      if (gpProfile?.business_name) setGpName(gpProfile.business_name);

      if (orderData.offer_id) {
        const { data: offerData } = await supabase
          .from("gp_offers")
          .select("departure_date, arrival_date, airline, flight_number, origin_city, origin_country, destination_city, destination_country")
          .eq("id", orderData.offer_id).single();
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
      toast({ title: "Numéro copié", description: order.order_number });
    }
  };

  const handleContactGP = () => navigate("/messages");
  const handlePdfUnlocked = useCallback(() => setPdfGatePassed(true), []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <MiniLoader size="lg" showText text="Chargement..." />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Commande non trouvée</p>
          <Button onClick={() => navigate("/")} className="mt-4">Retour à l'accueil</Button>
        </div>
      </div>
    );
  }

  // ─── STEP 1: PDF GATE ───
  if (!pdfGatePassed) {
    return (
      <PDFDownloadGate
        order={{
          orderNumber: order.order_number,
          orderId: order.id,
          clientName: clientName,
          gpName: gpName,
          recipientName: order.recipient_name || undefined,
          recipientPhone: order.recipient_phone || undefined,
          originCity: order.origin_city,
          destinationCity: order.destination_city,
          originCountry: order.origin_country,
          destinationCountry: order.destination_country,
          weight: order.weight,
          description: order.description,
        }}
        onUnlocked={handlePdfUnlocked}
      />
    );
  }

  // ─── STEP 2: CONFIRMATION ───
  const currencySymbol = getCurrencySymbol(order.currency);
  const isPaid = order.payment_status === "paid" || ["accepted", "collected", "in_transit", "delivered"].includes(order.status);
  const isDelivered = order.status === "delivered";
  const isAccepted = ["accepted", "collected", "in_transit", "delivered"].includes(order.status);

  const steps = [
    {
      num: 1,
      label: "Confirmation transporteur",
      sub: "Le transporteur confirmera sous 24h",
      done: order.status !== "pending",
    },
    {
      num: 2,
      label: "Paiement & dépôt",
      sub: isPaid ? "Adresse de dépôt disponible" : "Visible après paiement",
      done: isPaid,
    },
    {
      num: 3,
      label: "Livraison",
      sub: isDelivered ? "Livré avec succès" : "Visible après livraison",
      done: isDelivered,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-safe">
      <MobileHeader />

      <div className="px-4 pt-4 pb-32 space-y-4 max-w-lg mx-auto">

        {/* ── HERO ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 18 }}
          className="relative overflow-hidden rounded-2xl bg-primary px-6 py-8 text-primary-foreground text-center"
        >
          <div className="absolute inset-0 opacity-10"
            style={{ background: "radial-gradient(circle at 80% 20%, white 0%, transparent 60%)" }}
          />
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
            className="w-14 h-14 mx-auto rounded-full bg-primary-foreground/20 flex items-center justify-center mb-3"
          >
            <CheckCircle className="w-8 h-8" />
          </motion.div>
          <h1 className="text-xl font-bold mb-1">Réservation confirmée !</h1>
          <p className="text-sm opacity-80">Votre demande a été transmise au transporteur</p>

          {/* Order number chip */}
          <button
            onClick={copyOrderNumber}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/25 transition-colors text-sm font-mono font-semibold"
          >
            {order.order_number}
            <Copy className="w-3.5 h-3.5 opacity-70" />
          </button>
        </motion.div>

        {/* ── TRAJET ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Plane className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Trajet</h3>
              </div>

              {/* Route visual */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold">{order.origin_city}</p>
                  <p className="text-xs text-muted-foreground">{order.origin_country}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <div className="w-8 h-px bg-border" />
                  <ArrowRight className="w-4 h-4" />
                  <div className="w-8 h-px bg-border" />
                  <div className="w-2 h-2 rounded-full bg-accent" />
                </div>
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold">{order.destination_city}</p>
                  <p className="text-xs text-muted-foreground">{order.destination_country}</p>
                </div>
              </div>

              {offer && (
                <div className="pt-3 border-t">
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

        {/* ── RÉSUMÉ COMMANDE ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Détails de la commande</h3>
              </div>
              <div className="space-y-2.5">
                {order.description && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-muted-foreground">Contenu</span>
                    <span className="text-sm font-medium text-right max-w-[55%]">{order.description}</span>
                  </div>
                )}
                {order.weight > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Poids</span>
                    <span className="text-sm font-medium">{order.weight} kg</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Frais de service</span>
                  <Badge variant="secondary" className="text-[10px] font-medium">0% jusqu'au 01/01/2027</Badge>
                </div>
                <div className="flex justify-between items-center pt-2.5 border-t">
                  <span className="font-semibold text-sm">Total à payer</span>
                  <span className="text-xl font-bold text-primary">
                    {order.total_price.toLocaleString()} {currencySymbol}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── PROCHAINES ÉTAPES ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="bg-muted/40">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-4">Prochaines étapes</h3>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[11px] top-5 bottom-5 w-px bg-border" />
                <div className="space-y-5">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3 relative">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 z-10 transition-colors ${
                        step.done
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-background border-border text-muted-foreground"
                      }`}>
                        {step.done
                          ? <CheckCircle className="w-3.5 h-3.5" />
                          : <span className="text-[10px] font-bold">{step.num}</span>
                        }
                      </div>
                      <div className="pt-0.5">
                        <p className={`text-sm font-medium ${step.done ? "text-foreground" : "text-muted-foreground"}`}>
                          {step.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{step.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── TRANSPORTEUR ── */}
        {publicInfo && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Votre transporteur</h3>
                </div>

                {/* GP Identity */}
                <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-muted/50">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm truncate">{publicInfo.business_name}</p>
                      {publicInfo.verified_at && <Shield className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{publicInfo.city}, {publicInfo.country_code}</p>
                  </div>
                </div>

                {/* Contact info — progressive release */}
                <div className="space-y-3">
                  {/* Adresse dépôt */}
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${canSeeDepositAddress ? "bg-primary/10" : "bg-muted"}`}>
                      <MapPinned className={`w-4 h-4 ${canSeeDepositAddress ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">Adresse de dépôt</p>
                        {!canSeeDepositAddress && (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <Lock className="w-2.5 h-2.5" /> Après paiement
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {canSeeDepositAddress && contactInfo.deposit_address
                          ? contactInfo.deposit_address
                          : isPaid ? "Non renseignée" : "Visible après paiement"}
                      </p>
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${canSeeWhatsApp ? "bg-primary/10" : "bg-muted"}`}>
                      <Phone className={`w-4 h-4 ${canSeeWhatsApp ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">WhatsApp</p>
                        {!canSeeWhatsApp && (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <Lock className="w-2.5 h-2.5" /> Après paiement
                          </Badge>
                        )}
                        {canSeeWhatsApp && (
                          <Badge variant="default" className="text-[10px] gap-1">
                            <Eye className="w-2.5 h-2.5" /> Visible
                          </Badge>
                        )}
                      </div>
                      {canSeeWhatsApp && contactInfo.whatsapp_number ? (
                        <button
                          onClick={() => navigate(`/messages?gp=${order.gp_id}&order=${order.id}`)}
                          className="text-xs text-primary underline"
                        >
                          Ouvrir la messagerie sécurisée
                        </button>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isPaid ? "Non renseigné" : "Visible après paiement"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Adresse réception */}
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${canSeeReceptionAddress ? "bg-primary/10" : "bg-muted"}`}>
                      <MapPin className={`w-4 h-4 ${canSeeReceptionAddress ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">Adresse de réception</p>
                        {!canSeeReceptionAddress && (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <Lock className="w-2.5 h-2.5" /> Après livraison
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {canSeeReceptionAddress && contactInfo.reception_address
                          ? contactInfo.reception_address
                          : isDelivered ? "Non renseignée" : "Visible après livraison"}
                      </p>
                    </div>
                  </div>

                  {/* Téléphone secondaire */}
                  {canSeeSecondaryPhone && contactInfo.phone_secondary && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10">
                        <Phone className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Téléphone secondaire</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{contactInfo.phone_secondary}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dépôt popup si disponible */}
                {canSeeDepositAddress && contactInfo.deposit_address && (
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium">Adresse de dépôt disponible</p>
                      <p className="text-[10px] text-muted-foreground">Présentez votre QR lors du dépôt</p>
                    </div>
                    <DepositAddressPopup
                      depositAddress={contactInfo.deposit_address}
                      phone={contactInfo.phone_secondary}
                      whatsapp={contactInfo.whatsapp_number}
                      gpId={order.gp_id}
                      orderId={order.id}
                      gpName={publicInfo?.business_name || "Transporteur"}
                      isActive={["accepted"].includes(order.status)}
                    />
                  </div>
                )}

                <Button onClick={handleContactGP} className="w-full mt-4 gap-2" variant="outline" size="sm">
                  <MessageCircle className="w-4 h-4" />
                  Contacter via messagerie
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── QR CODE (si commande acceptée) ── */}
        {isAccepted && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <OrderQRCode orderNumber={order.order_number} orderId={order.id} status={order.status} />
          </motion.div>
        )}

        {/* ── ÉTIQUETTE LOGISTIQUE (re-download discret) ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="opacity-80">
          <LogisticsLabelGenerator
            order={{
              orderNumber: order.order_number,
              orderId: order.id,
              clientName: clientName,
              gpName: gpName,
              recipientName: order.recipient_name || undefined,
              recipientPhone: order.recipient_phone || undefined,
              originCity: order.origin_city,
              destinationCity: order.destination_city,
              originCountry: order.origin_country,
              destinationCountry: order.destination_country,
              weight: order.weight,
              description: order.description,
            }}
          />
        </motion.div>

        {/* ── RETOUR ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Button onClick={() => navigate("/")} className="w-full gap-2" variant="ghost" size="sm">
            <Home className="w-4 h-4" />
            Retour à l'accueil
          </Button>
        </motion.div>
      </div>

      <MobileNav />
    </div>
  );
}
