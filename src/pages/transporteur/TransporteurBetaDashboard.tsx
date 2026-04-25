import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Pencil, Package, Truck, Sparkles, MessageCircle, CheckCircle2, Clock, Loader2, FlaskConical } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Departure {
  id: string;
  origin_city: string;
  destination_city: string;
  departure_date: string;
  total_capacity: number;
  available_capacity: number;
  status: string;
}

interface Opportunity {
  id: string;
  origin_city: string;
  destination_city: string;
  weight_estimate: number | null;
  description: string | null;
  pickup_date_from: string | null;
  pickup_date_to: string | null;
  request_number: string;
  created_at: string;
}

interface Interest {
  id: string;
  custom_request_id: string;
  status: string;
}

const WHATSAPP_NUMBER = "221770000000"; // Konnekt support — à remplacer

export default function TransporteurBetaDashboard() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [gpId, setGpId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("Transporteur");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Departure | null>(null);

  // Auth + GP profile
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setUserId(data.user.id);
      const { data: gp } = await supabase
        .from("gp_profiles")
        .select("id, business_name")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (gp) {
        setGpId(gp.id);
        setBusinessName(gp.business_name || "Transporteur");
      }
    })();
  }, []);

  // Mes départs
  const departuresQ = useQuery({
    queryKey: ["beta-departures", gpId],
    enabled: !!gpId,
    queryFn: async (): Promise<Departure[]> => {
      const { data, error } = await supabase
        .from("gp_offers")
        .select("id, origin_city, destination_city, departure_date, total_capacity, available_capacity, status")
        .eq("gp_id", gpId!)
        .order("departure_date", { ascending: true });
      if (error) throw error;
      return data as Departure[];
    },
  });

  // Opportunités (custom_requests bagages_international, ouvertes)
  const opportunitiesQ = useQuery({
    queryKey: ["beta-opportunities"],
    refetchInterval: 30000,
    queryFn: async (): Promise<Opportunity[]> => {
      const { data, error } = await supabase
        .from("custom_requests")
        .select("id, origin_city, destination_city, weight_estimate, description, pickup_date_from, pickup_date_to, request_number, created_at")
        .eq("status", "open")
        .eq("transport_type", "bagages_international")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Opportunity[];
    },
  });

  // Mes intérêts
  const interestsQ = useQuery({
    queryKey: ["beta-interests", gpId],
    enabled: !!gpId,
    queryFn: async (): Promise<Interest[]> => {
      const { data, error } = await supabase
        .from("transporter_interests")
        .select("id, custom_request_id, status")
        .eq("gp_id", gpId!);
      if (error) throw error;
      return data as Interest[];
    },
  });

  const interestByRequest = useMemo(() => {
    const map = new Map<string, Interest>();
    (interestsQ.data || []).forEach((i) => map.set(i.custom_request_id, i));
    return map;
  }, [interestsQ.data]);

  // Mutations départs
  const upsertDeparture = useMutation({
    mutationFn: async (payload: {
      id?: string;
      origin_city: string;
      destination_city: string;
      departure_date: string;
      total_capacity: number;
    }) => {
      if (!gpId) throw new Error("Profil transporteur introuvable");
      if (payload.id) {
        const { error } = await supabase
          .from("gp_offers")
          .update({
            origin_city: payload.origin_city,
            destination_city: payload.destination_city,
            departure_date: payload.departure_date,
            total_capacity: payload.total_capacity,
            available_capacity: payload.total_capacity,
            status: "active",
          })
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const insertPayload: any = {
          gp_id: gpId,
          origin_city: payload.origin_city,
          destination_city: payload.destination_city,
          departure_date: payload.departure_date,
          total_capacity: payload.total_capacity,
          available_capacity: payload.total_capacity,
          price_per_kg: 0,
          currency: "XOF",
          transport_type: "bagages_international",
          status: "active",
        };
        const { error } = await (supabase.from("gp_offers") as any).insert(insertPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["beta-departures"] });
      toast.success("Votre départ est actif");
      setShowAdd(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message || "Erreur lors de la publication"),
  });

  const deleteDeparture = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gp_offers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["beta-departures"] });
      toast.success("Départ supprimé");
    },
  });

  const addInterest = useMutation({
    mutationFn: async (custom_request_id: string) => {
      if (!gpId) throw new Error("Profil introuvable");
      const { error } = await supabase
        .from("transporter_interests")
        .insert({ gp_id: gpId, custom_request_id, status: "pending" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["beta-interests"] });
      toast.success("Demande envoyée");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  const openWhatsApp = (op: Opportunity) => {
    const dateStr = op.pickup_date_from
      ? format(new Date(op.pickup_date_from), "d MMM yyyy", { locale: fr })
      : "dès que possible";
    const lines = [
      `Bonjour Konnekt,`,
      `Je suis intéressé par la demande *${op.request_number}*.`,
      ``,
      `📍 Origine : ${op.origin_city}`,
      `📍 Destination : ${op.destination_city}`,
      `📅 Date : ${dateStr}`,
      `⚖️ Poids : ${op.weight_estimate ? op.weight_estimate + " kg" : "à confirmer"}`,
      `🔖 Référence : ${op.request_number}`,
    ];
    const msg = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Connexion requise</h1>
          <p className="text-white/60">Connectez-vous pour accéder à votre dashboard transporteur bêta.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="px-5 pt-10 pb-6 border-b border-white/10">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/40 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Konnekt — Phase Bêta
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{businessName}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge className="bg-white text-black hover:bg-white/90 rounded-full">Transporteur fondateur</Badge>
          <Badge variant="outline" className="border-white/20 text-white/80 rounded-full">0% commission</Badge>
        </div>
        <p className="text-sm text-white/50 mt-3">Accès prioritaire aux colis pendant la phase de lancement.</p>
      </header>

      {/* Activity signals */}
      <div className="px-5 mt-5 grid grid-cols-2 gap-3">
        <SignalCard
          icon={<Package className="w-4 h-4" />}
          label="Colis cette semaine"
          value={opportunitiesQ.data?.length ?? "—"}
        />
        <SignalCard
          icon={<Truck className="w-4 h-4" />}
          label="Mes départs actifs"
          value={(departuresQ.data || []).filter((d) => d.status === "active").length}
        />
      </div>

      {/* Mode test intégration Yobbanté */}
      <section className="px-5 mt-6">
        <TestModePanel />
      </section>

      {/* Mes départs */}
      <section className="px-5 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Mes départs</h2>
          <Button
            size="sm"
            className="bg-white text-black hover:bg-white/90 rounded-full"
            onClick={() => { setEditing(null); setShowAdd(true); }}
          >
            <Plus className="w-4 h-4 mr-1" /> Ajouter
          </Button>
        </div>

        {departuresQ.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full bg-white/5" />
            <Skeleton className="h-20 w-full bg-white/5" />
          </div>
        ) : (departuresQ.data?.length ?? 0) === 0 ? (
          <Card className="bg-white/5 border-white/10 p-6 text-center">
            <p className="text-white/60 text-sm">Aucun départ publié.</p>
            <p className="text-white/40 text-xs mt-1">Ajoutez votre premier trajet pour recevoir des colis.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {departuresQ.data!.map((d) => (
              <motion.div key={d.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="bg-white/5 border-white/10 p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{d.origin_city} → {d.destination_city}</div>
                    <div className="text-xs text-white/50 mt-0.5">
                      {format(new Date(d.departure_date), "d MMM yyyy", { locale: fr })} · {d.available_capacity}/{d.total_capacity} kg dispo
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10" onClick={() => { setEditing(d); setShowAdd(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-white/70 hover:text-red-300 hover:bg-white/10" onClick={() => deleteDeparture.mutate(d.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Opportunités */}
      <section className="px-5 mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Colis disponibles</h2>
          <span className="text-xs text-white/40">Mise à jour auto</span>
        </div>

        {opportunitiesQ.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-24 w-full bg-white/5" />
            <Skeleton className="h-24 w-full bg-white/5" />
          </div>
        ) : (opportunitiesQ.data?.length ?? 0) === 0 ? (
          <Card className="bg-white/5 border-white/10 p-6 text-center">
            <p className="text-white/60 text-sm">Des colis sont en cours d'ajout</p>
            <p className="text-white/40 text-xs mt-1">Vous serez notifié dès qu'une opportunité correspond à vos départs.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {opportunitiesQ.data!.map((op) => {
                const interest = interestByRequest.get(op.id);
                return (
                  <motion.div key={op.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <Card className="bg-white/5 border-white/10 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{op.origin_city} → {op.destination_city}</div>
                          <div className="text-xs text-white/50 mt-0.5">
                            {op.weight_estimate ? `${op.weight_estimate} kg` : "Poids à confirmer"}
                            {op.pickup_date_from && (
                              <> · à partir du {format(new Date(op.pickup_date_from), "d MMM", { locale: fr })}</>
                            )}
                          </div>
                          {op.description && (
                            <p className="text-xs text-white/60 mt-2 line-clamp-2">{op.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="border-white/20 text-white/70 text-[10px] shrink-0">
                          {op.request_number.split("-").pop()}
                        </Badge>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        {interest ? (
                          <Badge className="bg-white/10 text-white border-white/10 rounded-full">
                            <StatusIcon status={interest.status} />
                            <span className="ml-1.5">{statusLabel(interest.status)}</span>
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-white text-black hover:bg-white/90 rounded-full"
                            disabled={addInterest.isPending}
                            onClick={() => addInterest.mutate(op.id)}
                          >
                            Je suis intéressé
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white/10 rounded-full"
                          onClick={() => openWhatsApp(op)}
                        >
                          <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                          WhatsApp
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Add/Edit dialog */}
      <DepartureDialog
        open={showAdd}
        editing={editing}
        onOpenChange={(o) => { setShowAdd(o); if (!o) setEditing(null); }}
        onSubmit={(payload) => upsertDeparture.mutate({ ...payload, id: editing?.id })}
        loading={upsertDeparture.isPending}
      />
    </div>
  );
}

function SignalCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <Card className="bg-white/5 border-white/10 p-4">
      <div className="flex items-center gap-2 text-white/50 text-xs">{icon}{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </Card>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed" || status === "validated") return <CheckCircle2 className="w-3 h-3 inline" />;
  if (status === "in_progress") return <Loader2 className="w-3 h-3 inline animate-spin" />;
  return <Clock className="w-3 h-3 inline" />;
}

function statusLabel(s: string) {
  return {
    pending: "Demande envoyée",
    validated: "Validé",
    in_progress: "En cours",
    completed: "Terminé",
    declined: "Refusé",
  }[s] || s;
}

function DepartureDialog({
  open, onOpenChange, onSubmit, loading, editing,
}: {
  open: boolean;
  editing: Departure | null;
  onOpenChange: (o: boolean) => void;
  onSubmit: (p: { origin_city: string; destination_city: string; departure_date: string; total_capacity: number }) => void;
  loading: boolean;
}) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [capacity, setCapacity] = useState("");

  useEffect(() => {
    if (open) {
      setOrigin(editing?.origin_city || "");
      setDestination(editing?.destination_city || "");
      setDate(editing?.departure_date?.slice(0, 10) || "");
      setCapacity(editing?.total_capacity?.toString() || "");
    }
  }, [open, editing]);

  const submit = () => {
    if (!origin || !destination || !date || !capacity) {
      toast.error("Tous les champs sont requis");
      return;
    }
    onSubmit({
      origin_city: origin,
      destination_city: destination,
      departure_date: date,
      total_capacity: Number(capacity),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifier le départ" : "Nouveau départ"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-white/70 text-xs">Origine</Label>
            <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Dakar" className="bg-white/5 border-white/10 text-white mt-1" />
          </div>
          <div>
            <Label className="text-white/70 text-xs">Destination</Label>
            <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Paris" className="bg-white/5 border-white/10 text-white mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-white/70 text-xs">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Capacité (kg)</Label>
              <Input type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="20" className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/70 hover:text-white hover:bg-white/10">Annuler</Button>
          <Button onClick={submit} disabled={loading} className="bg-white text-black hover:bg-white/90">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publier mon départ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Mode test : simule une demande client + appelle external-match-shipment
// ============================================================
function TestModePanel() {
  const [origin, setOrigin] = useState("Dakar");
  const [destination, setDestination] = useState("Paris");
  const [weight, setWeight] = useState("15");
  const [loading, setLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [createdRequest, setCreatedRequest] = useState<string | null>(null);

  const runTest = async () => {
    setLoading(true);
    setMatchResult(null);
    setCreatedRequest(null);
    try {
      // 1. Créer une demande client réelle (RPC sécurisée)
      const { data: created, error: e1 } = await supabase.rpc("create_shipment", {
        p_origin_city: origin,
        p_destination_city: destination,
        p_description: `[TEST] Simulation Yobbanté ${Date.now()}`,
        p_weight_estimate: Number(weight),
        p_shipment_type: "bagages_international",
      });
      if (e1) throw e1;
      const reqNum = (created as any)?.request_number;
      setCreatedRequest(reqNum || "créée");

      // 2. Appel direct à l'edge function de matching (comme Yobbanté)
      const { data: match, error: e2 } = await supabase.functions.invoke("external-match-shipment", {
        body: {
          origin_city: origin,
          destination_city: destination,
          weight_kg: Number(weight),
          urgency: "normal",
        },
      });
      if (e2) throw e2;
      setMatchResult(match);
      toast.success("Test terminé — réponse Yobbanté reçue");
    } catch (err: any) {
      toast.error(err.message || "Erreur test");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white/5 border-white/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <FlaskConical className="w-4 h-4 text-white/60" />
        <h3 className="font-semibold">Mode test — Intégration Yobbanté</h3>
      </div>
      <p className="text-xs text-white/50 mb-3">
        Crée une vraie demande client et vérifie que l'API renvoie 3 options (Rapide / Économique / Volume).
      </p>
      <div className="grid grid-cols-3 gap-2">
        <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Origine" className="bg-white/5 border-white/10 text-white" />
        <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Destination" className="bg-white/5 border-white/10 text-white" />
        <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Poids" className="bg-white/5 border-white/10 text-white" />
      </div>
      <Button
        onClick={runTest}
        disabled={loading || !origin || !destination || !weight}
        className="w-full mt-3 bg-white text-black hover:bg-white/90"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FlaskConical className="w-4 h-4 mr-2" />}
        Lancer la simulation
      </Button>

      {createdRequest && (
        <div className="mt-3 text-xs text-white/60">
          ✓ Demande client créée : <span className="font-mono text-white">{createdRequest}</span>
        </div>
      )}

      {matchResult && (
        <div className="mt-3 space-y-2">
          <div className="text-xs text-white/60">
            Source: {matchResult.source} · {matchResult.options?.length || 0} option(s)
          </div>
          {(matchResult.options || []).map((opt: any) => (
            <div key={opt.category} className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold capitalize">{opt.category}</span>
                <Badge variant="outline" className="border-white/20 text-white/80 text-[10px]">{opt.tagline}</Badge>
              </div>
              <div className="text-xs text-white/60 mt-1">
                💰 {opt.price_total?.toLocaleString()} {opt.currency || "FCFA"} · ⏱ {opt.eta_days} j
              </div>
            </div>
          ))}
          {(matchResult.options || []).length === 0 && (
            <div className="text-xs text-yellow-400/80">
              Aucune option retournée — vérifiez qu'un départ actif couvre ce trajet.
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
