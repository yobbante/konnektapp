import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, Package, ArrowRight, CheckCircle2, MessageCircle,
  Plus, Loader2, Truck, MapPin, Calendar, Weight, User, Phone,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const KONNEKT_WHATSAPP = "221770000000"; // numéro support à remplacer

interface Opportunity {
  id: string;
  origin_city: string;
  destination_city: string;
  weight_estimate: number | null;
  description: string | null;
  pickup_date_from: string | null;
  request_number: string;
}

type Step = "landing" | "form" | "success";

export default function TransporteurQuickOnboard() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>("landing");
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [capacity, setCapacity] = useState("");

  // Result state
  const [createdGpId, setCreatedGpId] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());
  const [publishedRoute, setPublishedRoute] = useState<{ o: string; d: string } | null>(null);

  const formRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // Auto-detect existing session (prefill)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setPhone(data.user.phone || "");
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (profile?.full_name) setName(profile.full_name);
        const { data: gp } = await supabase
          .from("gp_profiles")
          .select("id, business_name, phone")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (gp) {
          setCreatedGpId(gp.id);
          if (!name) setName(gp.business_name);
          if (!phone) setPhone(gp.phone);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToForm = () => {
    setStep("form");
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const formValid = useMemo(
    () => name.trim() && phone.trim() && origin.trim() && destination.trim() && date && Number(capacity) > 0,
    [name, phone, origin, destination, date, capacity]
  );

  /**
   * Lazy account creation:
   * - if user not authenticated → create with phone-derived email + random password (silent)
   * - then create gp_profile if missing
   * - then create gp_offers (departure) with status=active
   */
  const handlePublish = async () => {
    if (!formValid) {
      toast.error("Remplissez tous les champs");
      return;
    }
    setSubmitting(true);
    try {
      // 1) Auth (silent)
      let user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        const cleanPhone = phone.replace(/\D/g, "");
        const email = `t${cleanPhone}@konnekt.beta`;
        const password = `Knkt!${cleanPhone}${Math.floor(Math.random() * 9000 + 1000)}`;
        const { data: signUp, error: suErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/t`,
            data: { full_name: name },
          },
        });
        if (suErr) throw suErr;
        user = signUp.user;
        if (!user) throw new Error("Compte non créé");
      }

      // 2) GP profile (create if missing)
      let gpId = createdGpId;
      if (!gpId) {
        const { data: existing } = await supabase
          .from("gp_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (existing) {
          gpId = existing.id;
        } else {
          const insertGp: any = {
            user_id: user.id,
            business_name: name,
            phone,
            whatsapp: phone,
            city: origin,
            country_code: "SN",
            gp_type: "bagages_international",
            status: "verified", // bêta = visible immédiatement
            kyc_status: "pending",
            kyc_level: 0,
          };
          const { data: gpRow, error: gpErr } = await (supabase.from("gp_profiles") as any)
            .insert(insertGp)
            .select("id")
            .single();
          if (gpErr) throw gpErr;
          gpId = gpRow.id;
        }
        setCreatedGpId(gpId);
      }

      // 3) Départ (gp_offers) — status active, available_capacity = total
      const cap = Number(capacity);
      const offerPayload: any = {
        gp_id: gpId,
        origin_city: origin.trim(),
        destination_city: destination.trim(),
        departure_date: date,
        total_capacity: cap,
        available_capacity: cap,
        price_per_kg: 0,
        currency: "XOF",
        transport_type: "bagages_international",
        status: "active",
      };
      const { error: offErr } = await (supabase.from("gp_offers") as any).insert(offerPayload);
      if (offErr) throw offErr;

      // 4) Charger opportunités matchées (route exacte d'abord, puis fallback)
      const { data: matched } = await supabase
        .from("custom_requests")
        .select("id, origin_city, destination_city, weight_estimate, description, pickup_date_from, request_number")
        .eq("status", "open")
        .eq("transport_type", "bagages_international")
        .ilike("origin_city", origin.trim())
        .ilike("destination_city", destination.trim())
        .limit(10);

      let opps = (matched as Opportunity[]) || [];
      if (opps.length === 0) {
        // Fallback : afficher les plus récentes pour ne jamais montrer un écran vide
        const { data: latest } = await supabase
          .from("custom_requests")
          .select("id, origin_city, destination_city, weight_estimate, description, pickup_date_from, request_number")
          .eq("status", "open")
          .eq("transport_type", "bagages_international")
          .order("created_at", { ascending: false })
          .limit(5);
        opps = (latest as Opportunity[]) || [];
      }
      setOpportunities(opps);
      setPublishedRoute({ o: origin.trim(), d: destination.trim() });
      setStep("success");
      toast.success("Votre départ est actif");
      setTimeout(() => successRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la publication");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInterest = (op: Opportunity) => {
    setInterestedIds((prev) => new Set(prev).add(op.id));
    // Best-effort enregistrement en base (silencieux)
    if (createdGpId) {
      (supabase.from("transporter_interests") as any)
        .insert({ gp_id: createdGpId, custom_request_id: op.id, status: "pending" })
        .then(() => {});
    }
    toast.success("Demande envoyée");
  };

  const whatsappConfirmHref = useMemo(() => {
    if (!publishedRoute) return "#";
    const msg = encodeURIComponent(
      `Mon départ ${publishedRoute.o} → ${publishedRoute.d} est actif sur Konnekt ✅\nJe suis prêt à recevoir des colis.`
    );
    return `https://wa.me/${KONNEKT_WHATSAPP}?text=${msg}`;
  }, [publishedRoute]);

  const whatsappOpportunityHref = (op: Opportunity) => {
    const dateStr = op.pickup_date_from
      ? format(new Date(op.pickup_date_from), "d MMM yyyy", { locale: fr })
      : "dès que possible";
    const msg = encodeURIComponent(
      [
        `Bonjour Konnekt,`,
        `Je suis intéressé par la demande *${op.request_number}*.`,
        ``,
        `📍 ${op.origin_city} → ${op.destination_city}`,
        `📅 ${dateStr}`,
        `⚖️ ${op.weight_estimate ? op.weight_estimate + " kg" : "à confirmer"}`,
      ].join("\n")
    );
    return `https://wa.me/${KONNEKT_WHATSAPP}?text=${msg}`;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ======================= LANDING ======================= */}
      <section className="px-6 pt-16 pb-10 max-w-xl mx-auto">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/40 mb-6">
          <Sparkles className="w-3 h-3" /> Konnekt · Accès Bêta
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold leading-[1.05] tracking-tight">
          Remplissez vos trajets<br />
          <span className="text-white/50">avec des colis.</span>
        </h1>

        <p className="text-base text-white/60 mt-5 leading-relaxed">
          Gagnez de l'argent sur vos trajets existants.<br />
          Aucun effort supplémentaire.
        </p>

        {/* Trust signals */}
        <div className="mt-7 space-y-2">
          <div className="flex items-center gap-2.5 text-sm text-white/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Des colis sont déjà disponibles cette semaine
          </div>
          <div className="flex items-center gap-2.5 text-sm text-white/80">
            <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
            Accès bêta — transporteurs sélectionnés
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <Badge className="bg-white text-black hover:bg-white/90 rounded-full">Transporteur fondateur</Badge>
          <Badge variant="outline" className="border-white/20 text-white/80 rounded-full">0% commission</Badge>
        </div>

        {step === "landing" && (
          <Button
            onClick={goToForm}
            className="mt-10 w-full h-14 rounded-2xl bg-white text-black hover:bg-white/90 text-base font-semibold"
          >
            Commencer
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        )}
      </section>

      {/* ======================= FORM ======================= */}
      <AnimatePresence>
        {(step === "form" || step === "success") && (
          <motion.section
            ref={formRef}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="px-6 pb-10 max-w-xl mx-auto border-t border-white/10 pt-10"
          >
            <h2 className="text-xl font-semibold mb-1">Votre premier départ</h2>
            <p className="text-sm text-white/50 mb-6">Tout sur un seul écran. Moins d'une minute.</p>

            <div className="space-y-4">
              <FieldRow icon={<User className="w-4 h-4" />} label="Nom">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom"
                  className="h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </FieldRow>

              <FieldRow icon={<Phone className="w-4 h-4" />} label="WhatsApp">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+221 77 000 00 00"
                  inputMode="tel"
                  className="h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </FieldRow>

              <div className="grid grid-cols-2 gap-3">
                <FieldRow icon={<MapPin className="w-4 h-4" />} label="Départ">
                  <Input
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="Dakar"
                    className="h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </FieldRow>
                <FieldRow icon={<MapPin className="w-4 h-4" />} label="Destination">
                  <Input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Paris"
                    className="h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </FieldRow>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FieldRow icon={<Calendar className="w-4 h-4" />} label="Date">
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-12 rounded-xl bg-white/5 border-white/10 text-white"
                  />
                </FieldRow>
                <FieldRow icon={<Weight className="w-4 h-4" />} label="Capacité (kg)">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="20"
                    className="h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </FieldRow>
              </div>
            </div>

            {step === "form" && (
              <Button
                onClick={handlePublish}
                disabled={!formValid || submitting}
                className="mt-7 w-full h-14 rounded-2xl bg-white text-black hover:bg-white/90 text-base font-semibold disabled:opacity-40"
              >
                {submitting ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Publication…</>
                ) : (
                  <>Publier mon départ <ArrowRight className="w-5 h-5 ml-2" /></>
                )}
              </Button>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* ======================= SUCCESS + ACTIVATION ======================= */}
      <AnimatePresence>
        {step === "success" && (
          <motion.section
            ref={successRef}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="px-6 pb-32 max-w-xl mx-auto border-t border-white/10 pt-10"
          >
            {/* Success */}
            <div className="flex items-start gap-3 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-400/20">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Votre départ est actif</div>
                <p className="text-sm text-white/60 mt-1">
                  Nous vous envoyons des colis correspondant à votre trajet.
                </p>
              </div>
            </div>

            {/* WhatsApp confirmation */}
            <a
              href={whatsappConfirmHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 h-12 rounded-2xl border border-white/15 hover:bg-white/5 text-sm font-medium transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Recevoir la confirmation sur WhatsApp
            </a>

            {/* Activation: opportunités */}
            <div className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Colis disponibles pour votre trajet</h3>
                {opportunities.length > 0 && (
                  <span className="text-xs text-white/40">{opportunities.length} match</span>
                )}
              </div>

              {opportunities.length === 0 ? (
                <Card className="bg-white/5 border-white/10 p-6 text-center">
                  <Package className="w-6 h-6 text-white/30 mx-auto mb-2" />
                  <p className="text-sm text-white/70">Des colis sont en cours d'ajout</p>
                  <p className="text-xs text-white/40 mt-1">Vous serez notifié dès qu'une opportunité correspond.</p>
                </Card>
              ) : (
                <div className="space-y-2.5">
                  {opportunities.map((op) => {
                    const interested = interestedIds.has(op.id);
                    return (
                      <Card key={op.id} className="bg-white/5 border-white/10 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-white/40 text-xs mb-1">
                              <Package className="w-3.5 h-3.5" />
                              {op.weight_estimate ? `${op.weight_estimate} kg` : "Poids à confirmer"}
                            </div>
                            <div className="font-semibold truncate">
                              {op.origin_city} → {op.destination_city}
                            </div>
                            {op.pickup_date_from && (
                              <div className="text-xs text-white/50 mt-0.5">
                                À partir du {format(new Date(op.pickup_date_from), "d MMM", { locale: fr })}
                              </div>
                            )}
                          </div>
                          <Badge variant="outline" className="border-white/15 text-white/60 text-[10px] shrink-0">
                            {op.request_number.split("-").pop()}
                          </Badge>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          {interested ? (
                            <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-400/20 rounded-full">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Demande envoyée
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-white text-black hover:bg-white/90 rounded-full"
                              onClick={() => handleInterest(op)}
                            >
                              Je suis intéressé
                            </Button>
                          )}
                          <a
                            href={whatsappOpportunityHref(op)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-white/15 hover:bg-white/5 text-xs"
                          >
                            <MessageCircle className="w-3 h-3" /> WhatsApp
                          </a>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Loop : ajouter un autre départ */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-12 rounded-2xl border-white/15 text-white hover:bg-white/5"
                onClick={() => {
                  setOrigin(""); setDestination(""); setDate(""); setCapacity("");
                  setStep("form");
                  setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un autre départ
              </Button>
              <Button
                className="h-12 rounded-2xl bg-white text-black hover:bg-white/90"
                onClick={() => nav("/transporteur/beta")}
              >
                <Truck className="w-4 h-4 mr-2" />
                Mon dashboard
              </Button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function FieldRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="flex items-center gap-1.5 text-xs text-white/50 mb-1.5">
        {icon} {label}
      </Label>
      {children}
    </div>
  );
}
