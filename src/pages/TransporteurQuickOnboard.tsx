import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Sparkles, Package, ArrowRight, CheckCircle2, MessageCircle,
  Plus, Loader2, Truck, MapPin, Calendar, Weight, User, Phone, RefreshCw,
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
import { CityCombobox } from "@/components/beta/CityCombobox";

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

// Persisted anonymous session id for funnel attribution
function getSessionId() {
  try {
    let id = localStorage.getItem("kkt_beta_sid");
    if (!id) {
      id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("kkt_beta_sid", id);
    }
    return id;
  } catch { return `s_${Date.now()}`; }
}

function track(event_type: string, extra: Record<string, any> = {}) {
  const session_id = getSessionId();
  const source = extra.source || (typeof window !== "undefined" ? sessionStorage.getItem("kkt_src") : null);
  void supabase.from("beta_tracking_events" as any).insert({
    event_type,
    session_id,
    source,
    metadata: extra,
  } as any);
}

function cleanPhoneInput(v: string) {
  // Keep digits and a leading "+"
  const trimmed = v.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/[^\d]/g, "");
}

export default function TransporteurQuickOnboard() {
  const nav = useNavigate();
  const [params] = useSearchParams();
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
  const [refreshing, setRefreshing] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // Read prefill from URL + persist source
  useEffect(() => {
    const qPhone = params.get("phone");
    const qName = params.get("name");
    const qSrc = params.get("src") || params.get("utm_source");
    if (qPhone) setPhone(cleanPhoneInput(qPhone));
    if (qName) setName(qName.slice(0, 80));
    if (qSrc) {
      try { sessionStorage.setItem("kkt_src", qSrc); } catch {}
    }
    // Page view
    track("landing_view", { source: qSrc || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-detect existing session (prefill)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (profile?.full_name) setName((n) => n || profile.full_name);
        const { data: gp } = await supabase
          .from("gp_profiles")
          .select("id, business_name, phone")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (gp) {
          setCreatedGpId(gp.id);
          setName((n) => n || gp.business_name);
          setPhone((p) => p || gp.phone || "");
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToForm = () => {
    track("cta_start");
    setStep("form");
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      track("form_view");
    }, 50);
  };

  const phoneClean = useMemo(() => phone.replace(/\D/g, ""), [phone]);
  const formValid = useMemo(
    () =>
      name.trim().length >= 2 &&
      phoneClean.length >= 8 &&
      origin.trim().length >= 2 &&
      destination.trim().length >= 2 &&
      origin.trim().toLowerCase() !== destination.trim().toLowerCase() &&
      !!date &&
      Number(capacity) > 0 &&
      Number(capacity) <= 200,
    [name, phoneClean, origin, destination, date, capacity]
  );

  const refreshOpportunities = async (route?: { o: string; d: string }) => {
    const r = route || publishedRoute;
    if (!r) return;
    setRefreshing(true);
    try {
      const { data: matched } = await supabase
        .from("custom_requests")
        .select("id, origin_city, destination_city, weight_estimate, description, pickup_date_from, request_number")
        .eq("status", "open")
        .eq("transport_type", "bagages_international")
        .ilike("origin_city", r.o)
        .ilike("destination_city", r.d)
        .order("created_at", { ascending: false })
        .limit(10);

      let opps = (matched as Opportunity[]) || [];
      if (opps.length === 0) {
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
    } finally {
      setRefreshing(false);
    }
  };

  // Realtime + polling while success view is open
  useEffect(() => {
    if (step !== "success" || !publishedRoute) return;
    const channel = supabase
      .channel("beta_opportunities")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "custom_requests" },
        () => { void refreshOpportunities(); }
      )
      .subscribe();
    const interval = window.setInterval(() => { void refreshOpportunities(); }, 30000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, publishedRoute]);

  // Friendly mapping of low-level errors → user-facing messages
  const friendlyError = (raw: string): string => {
    const m = raw.toLowerCase();
    if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed"))
      return "Connexion impossible. Vérifiez votre Internet et réessayez.";
    if (m.includes("timeout") || m.includes("timed out"))
      return "Le serveur met trop de temps à répondre. Nouvelle tentative…";
    if (m.includes("auth")) return "Création du compte impossible. Réessayez dans un instant.";
    if (m.includes("offer")) return "Le départ n'a pas pu être enregistré. Réessayez.";
    if (m.includes("gp:")) return "Profil transporteur non créé. Réessayez.";
    if (m.includes("server") || m.includes("500") || m.includes("503"))
      return "Le service est momentanément indisponible. Réessayez.";
    return raw || "Erreur inconnue. Réessayez.";
  };

  const invokeWithRetry = async (payload: Record<string, any>, maxAttempts = 3) => {
    let lastErr: any = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await supabase.functions.invoke("beta-onboard", { body: payload });
        if (res.error) throw new Error(res.error.message || "Edge function error");
        if (!res.data?.gp_id || !res.data?.user_id) throw new Error("Réponse invalide du serveur");
        return res.data;
      } catch (e: any) {
        lastErr = e;
        const msg = (e?.message || "").toLowerCase();
        // Don't retry on validation errors (400) — only on network/server failures
        if (msg.includes("invalide") || msg.includes("champs")) break;
        if (attempt < maxAttempts) {
          toast.message(`Tentative ${attempt}/${maxAttempts} échouée — nouvelle tentative…`, {
            duration: 1500,
          });
          await new Promise((r) => setTimeout(r, 800 * attempt)); // 800ms, 1600ms
        }
      }
    }
    throw lastErr || new Error("Échec après plusieurs tentatives");
  };

  const handlePublish = async () => {
    if (!formValid) {
      toast.error("Vérifiez les champs (téléphone, villes différentes, capacité)");
      return;
    }
    setSubmitting(true);
    try {
      const session_id = getSessionId();
      const source = (() => { try { return sessionStorage.getItem("kkt_src"); } catch { return null; } })();

      const data = await invokeWithRetry({
        name: name.trim(),
        phone: phone.trim(),
        origin_city: origin.trim(),
        destination_city: destination.trim(),
        departure_date: date,
        capacity_kg: Number(capacity),
        session_id,
        source,
      });

      // Persist session BEFORE marking account ready
      if (data.session?.access_token && data.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      // Verification fallback — confirm the account is actually usable
      const { data: check } = await supabase.auth.getUser();
      if (!check?.user) {
        // Account created but session not active — still proceed but warn
        toast.warning("Compte créé. Connectez-vous pour accéder au tableau de bord.");
      }

      setCreatedGpId(data.gp_id);
      const route = { o: origin.trim(), d: destination.trim() };
      setPublishedRoute(route);
      setStep("success");
      toast.success("Votre départ est actif");
      await refreshOpportunities(route);
      setTimeout(() => successRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (e: any) {
      const friendly = friendlyError(e?.message || "");
      toast.error(friendly, {
        description: "Si le problème persiste, contactez-nous sur WhatsApp.",
        duration: 6000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInterest = (op: Opportunity) => {
    setInterestedIds((prev) => new Set(prev).add(op.id));
    track("interest_clicked", { request_id: op.id, request_number: op.request_number });
    if (createdGpId) {
      void (supabase.from("transporter_interests") as any)
        .insert({ gp_id: createdGpId, custom_request_id: op.id, status: "pending" });
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
    <div className="min-h-screen bg-[hsl(var(--k-scan-bg-top))] text-[hsl(var(--k-scan-text))]">
      {/* ======================= LANDING ======================= */}
      <section className="px-6 pt-16 pb-10 max-w-xl mx-auto">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--k-scan-text))]/40 mb-6">
          <Sparkles className="w-3 h-3" /> Konnekt · Accès Bêta
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold leading-[1.05] tracking-tight">
          Remplissez vos trajets<br />
          <span className="text-[hsl(var(--k-scan-text))]/50">avec des colis.</span>
        </h1>

        <p className="text-base text-[hsl(var(--k-scan-text))]/60 mt-5 leading-relaxed">
          Gagnez de l'argent sur vos trajets existants.<br />
          Aucun effort supplémentaire.
        </p>

        <div className="mt-7 space-y-2">
          <div className="flex items-center gap-2.5 text-sm text-[hsl(var(--k-scan-text))]/80">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))] animate-pulse" />
            Des colis sont déjà disponibles cette semaine
          </div>
          <div className="flex items-center gap-2.5 text-sm text-[hsl(var(--k-scan-text))]/80">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--k-scan-text))]/60" />
            Accès bêta — transporteurs sélectionnés
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <Badge className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full">Transporteur fondateur</Badge>
          <Badge variant="outline" className="border-[hsl(var(--k-scan-text))]/20 text-[hsl(var(--k-scan-text))]/80 rounded-full">0% commission</Badge>
        </div>

        {step === "landing" && (
          <Button
            onClick={goToForm}
            className="mt-10 w-full h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold"
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
            className="px-6 pb-10 max-w-xl mx-auto border-t border-[hsl(var(--k-scan-text))]/10 pt-10"
          >
            <h2 className="text-xl font-semibold mb-1">Votre premier départ</h2>
            <p className="text-sm text-[hsl(var(--k-scan-text))]/50 mb-6">Tout sur un seul écran. Moins d'une minute.</p>

            <div className="space-y-4">
              <FieldRow icon={<User className="w-4 h-4" />} label="Nom">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 80))}
                  placeholder="Votre nom"
                  className="h-12 rounded-xl bg-[hsl(var(--k-scan-text))]/5 border-[hsl(var(--k-scan-text))]/10 text-[hsl(var(--k-scan-text))] placeholder:text-[hsl(var(--k-scan-text))]/30"
                />
              </FieldRow>

              <FieldRow icon={<Phone className="w-4 h-4" />} label="WhatsApp">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(cleanPhoneInput(e.target.value))}
                  placeholder="+221 77 000 00 00"
                  inputMode="tel"
                  className="h-12 rounded-xl bg-[hsl(var(--k-scan-text))]/5 border-[hsl(var(--k-scan-text))]/10 text-[hsl(var(--k-scan-text))] placeholder:text-[hsl(var(--k-scan-text))]/30"
                />
              </FieldRow>

              <div className="grid grid-cols-2 gap-3">
                <FieldRow icon={<MapPin className="w-4 h-4" />} label="Départ">
                  <CityCombobox value={origin} onChange={(v) => setOrigin(v.slice(0, 60))} placeholder="Dakar" />
                </FieldRow>
                <FieldRow icon={<MapPin className="w-4 h-4" />} label="Destination">
                  <CityCombobox value={destination} onChange={(v) => setDestination(v.slice(0, 60))} placeholder="Paris" />
                </FieldRow>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FieldRow icon={<Calendar className="w-4 h-4" />} label="Date">
                  <Input
                    type="date"
                    value={date}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-12 rounded-xl bg-[hsl(var(--k-scan-text))]/5 border-[hsl(var(--k-scan-text))]/10 text-[hsl(var(--k-scan-text))]"
                  />
                </FieldRow>
                <FieldRow icon={<Weight className="w-4 h-4" />} label="Capacité (kg)">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={200}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="20"
                    className="h-12 rounded-xl bg-[hsl(var(--k-scan-text))]/5 border-[hsl(var(--k-scan-text))]/10 text-[hsl(var(--k-scan-text))] placeholder:text-[hsl(var(--k-scan-text))]/30"
                  />
                </FieldRow>
              </div>
            </div>

            {step === "form" && (
              <Button
                onClick={handlePublish}
                disabled={!formValid || submitting}
                className="mt-7 w-full h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold disabled:opacity-40"
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
            className="px-6 pb-32 max-w-xl mx-auto border-t border-[hsl(var(--k-scan-text))]/10 pt-10"
          >
            <div className="flex items-start gap-3 p-5 rounded-2xl bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/25">
              <CheckCircle2 className="w-6 h-6 text-[hsl(var(--success))] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Votre départ est actif</div>
                <p className="text-sm text-[hsl(var(--k-scan-text))]/60 mt-1">
                  Nous vous envoyons des colis correspondant à votre trajet.
                </p>
              </div>
            </div>

            <a
              href={whatsappConfirmHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 h-12 rounded-2xl border border-[hsl(var(--k-scan-text))]/15 hover:bg-[hsl(var(--k-scan-text))]/5 text-sm font-medium transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Recevoir la confirmation sur WhatsApp
            </a>

            <div className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Colis disponibles pour votre trajet</h3>
                <button
                  onClick={() => refreshOpportunities()}
                  className="flex items-center gap-1.5 text-xs text-[hsl(var(--k-scan-text))]/50 hover:text-[hsl(var(--k-scan-text))]/80"
                >
                  <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
                  {opportunities.length > 0 ? `${opportunities.length} match` : "Actualiser"}
                </button>
              </div>

              {opportunities.length === 0 ? (
                <Card className="bg-[hsl(var(--k-scan-text))]/5 border-[hsl(var(--k-scan-text))]/10 p-6 text-center">
                  <Package className="w-6 h-6 text-[hsl(var(--k-scan-text))]/30 mx-auto mb-2" />
                  <p className="text-sm text-[hsl(var(--k-scan-text))]/70">Des colis sont en cours d'ajout</p>
                  <p className="text-xs text-[hsl(var(--k-scan-text))]/40 mt-1">Vous serez notifié dès qu'une opportunité correspond.</p>
                </Card>
              ) : (
                <div className="space-y-2.5">
                  {opportunities.map((op) => {
                    const interested = interestedIds.has(op.id);
                    return (
                      <Card key={op.id} className="bg-[hsl(var(--k-scan-text))]/5 border-[hsl(var(--k-scan-text))]/10 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-[hsl(var(--k-scan-text))]/40 text-xs mb-1">
                              <Package className="w-3.5 h-3.5" />
                              {op.weight_estimate ? `${op.weight_estimate} kg` : "Poids à confirmer"}
                            </div>
                            <div className="font-semibold truncate">
                              {op.origin_city} → {op.destination_city}
                            </div>
                            {op.pickup_date_from && (
                              <div className="text-xs text-[hsl(var(--k-scan-text))]/50 mt-0.5">
                                À partir du {format(new Date(op.pickup_date_from), "d MMM", { locale: fr })}
                              </div>
                            )}
                          </div>
                          <Badge variant="outline" className="border-[hsl(var(--k-scan-text))]/15 text-[hsl(var(--k-scan-text))]/60 text-[10px] shrink-0">
                            {op.request_number.split("-").pop()}
                          </Badge>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          {interested ? (
                            <Badge className="bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/25 rounded-full">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Demande envoyée
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
                              onClick={() => handleInterest(op)}
                            >
                              Je suis intéressé
                            </Button>
                          )}
                          <a
                            href={whatsappOpportunityHref(op)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[hsl(var(--k-scan-text))]/15 hover:bg-[hsl(var(--k-scan-text))]/5 text-xs"
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

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-12 rounded-2xl border-[hsl(var(--k-scan-text))]/15 text-[hsl(var(--k-scan-text))] hover:bg-[hsl(var(--k-scan-text))]/5"
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
                className="h-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => nav("/t/dashboard")}
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
      <Label className="flex items-center gap-1.5 text-xs text-[hsl(var(--k-scan-text))]/50 mb-1.5">
        {icon} {label}
      </Label>
      {children}
    </div>
  );
}
