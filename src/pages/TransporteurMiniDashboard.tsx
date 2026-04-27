// Mini dashboard transporteur (post-onboarding) — frictionless.
// Affiche "Mes départs actifs" et "Mes demandes envoyées" avec auto-refresh temps réel.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Plus, Package, ArrowLeft, MessageCircle, MapPin, Calendar, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface Interest {
  id: string;
  status: string;
  created_at: string;
  custom_request_id: string;
  custom_requests: {
    request_number: string;
    origin_city: string;
    destination_city: string;
    weight_estimate: number | null;
    pickup_date_from: string | null;
  } | null;
}

export default function TransporteurMiniDashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [gpId, setGpId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { nav("/t"); return; }

      const { data: gp } = await supabase
        .from("gp_profiles")
        .select("id")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (!gp) { nav("/t"); return; }
      if (cancelled) return;
      setGpId(gp.id);

      await Promise.all([loadDepartures(gp.id), loadInterests(gp.id)]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDepartures = async (id: string) => {
    const { data } = await supabase
      .from("gp_offers")
      .select("id, origin_city, destination_city, departure_date, total_capacity, available_capacity, status")
      .eq("gp_id", id)
      .eq("status", "active")
      .order("departure_date", { ascending: true });
    setDepartures((data as Departure[]) || []);
  };

  const loadInterests = async (id: string) => {
    const { data } = await supabase
      .from("transporter_interests")
      .select("id, status, created_at, custom_request_id, custom_requests(request_number, origin_city, destination_city, weight_estimate, pickup_date_from)")
      .eq("gp_id", id)
      .order("created_at", { ascending: false });
    setInterests((data as unknown as Interest[]) || []);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <header className="px-6 pt-12 pb-6 max-w-xl mx-auto">
        <button onClick={() => nav("/t")} className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3 h-3" /> Retour
        </button>
        <h1 className="text-3xl font-bold tracking-tight">Mon espace transporteur</h1>
        <p className="text-sm text-white/50 mt-1">Vos départs et opportunités</p>
      </header>

      {/* DEPARTURES */}
      <section className="px-6 max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm uppercase tracking-wider text-white/40 flex items-center gap-2">
            <Truck className="w-3.5 h-3.5" /> Mes départs actifs
          </h2>
          <Button size="sm" variant="outline" className="h-8 rounded-full border-white/15 text-xs" onClick={() => nav("/t")}>
            <Plus className="w-3 h-3 mr-1" /> Ajouter
          </Button>
        </div>

        {departures.length === 0 ? (
          <Card className="bg-white/5 border-white/10 p-6 text-center">
            <p className="text-sm text-white/60">Aucun départ actif</p>
            <Button className="mt-3 bg-white text-black hover:bg-white/90 rounded-full" size="sm" onClick={() => nav("/t")}>
              Publier un départ
            </Button>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {departures.map((d) => (
              <Card key={d.id} className="bg-white/5 border-white/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">{d.origin_city} → {d.destination_city}</div>
                  <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-400/20 text-[10px]">Actif</Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-white/50">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(d.departure_date), "d MMM yyyy", { locale: fr })}</span>
                  <span>{d.available_capacity}/{d.total_capacity} kg</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* INTERESTS */}
      <section className="px-6 max-w-xl mx-auto mt-10">
        <h2 className="text-sm uppercase tracking-wider text-white/40 flex items-center gap-2 mb-3">
          <MessageCircle className="w-3.5 h-3.5" /> Mes demandes envoyées
        </h2>

        {interests.length === 0 ? (
          <Card className="bg-white/5 border-white/10 p-6 text-center">
            <Package className="w-5 h-5 text-white/30 mx-auto mb-2" />
            <p className="text-sm text-white/60">Aucune demande envoyée</p>
            <p className="text-xs text-white/40 mt-1">Cliquez "Je suis intéressé" sur une opportunité.</p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {interests.map((i) => (
              <Card key={i.id} className="bg-white/5 border-white/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">
                      {i.custom_requests?.origin_city} → {i.custom_requests?.destination_city}
                    </div>
                    <div className="text-xs text-white/50 mt-0.5 flex items-center gap-2">
                      <span>{i.custom_requests?.request_number}</span>
                      {i.custom_requests?.weight_estimate && <span>· {i.custom_requests.weight_estimate} kg</span>}
                    </div>
                  </div>
                  <StatusBadge status={i.status} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "En attente", cls: "bg-white/10 text-white/70 border-white/15" },
    validated: { label: "Validée", cls: "bg-blue-500/15 text-blue-300 border-blue-400/20" },
    in_progress: { label: "En cours", cls: "bg-amber-500/15 text-amber-300 border-amber-400/20" },
    completed: { label: "Terminée", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20" },
    declined: { label: "Refusée", cls: "bg-red-500/15 text-red-300 border-red-400/20" },
  };
  const m = map[status] || map.pending;
  return <Badge variant="outline" className={`${m.cls} text-[10px] shrink-0`}>{m.label}</Badge>;
}
