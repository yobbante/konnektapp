// Mini dashboard transporteur beta (pré-lancement) — actif jusqu'à la fin du countdown.
// Sections : Départs actifs · Demandes attribuées par Yobbante · Demandes envoyées (en attente).
// Après la fin du countdown, les transporteurs basculeront automatiquement sur /gp/apercu.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Plus, Package, ArrowLeft, MessageCircle, Calendar, Loader2, RefreshCw, Sparkles, Inbox, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ClaimAccountBanner } from "@/components/beta/ClaimAccountBanner";
import { BetaApercuLinkBanner } from "@/components/beta/BetaApercuLinkBanner";
import { BetaInviteBadge } from "@/components/beta/BetaInviteBadge";
import { BetaReferralSection } from "@/components/beta/BetaReferralSection";

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
  const [gpReference, setGpReference] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [invitedCount, setInvitedCount] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [now, setNow] = useState<Date>(new Date());
  const gpIdRef = useRef<string | null>(null);

  // Launch state — affiché en bannière (countdown / lancé). Aucune redirection forcée.
  const [launchInfo, setLaunchInfo] = useState<{ is_locked: boolean; launch_at: string } | null>(null);

  // Blocage désactivé : on lit uniquement l'état du lock pour l'afficher dans la
  // bannière (countdown / lancement), sans jamais forcer la redirection.
  useEffect(() => {
    let cancelled = false;
    const checkLaunch = async () => {
      try {
        const { data, error } = await supabase
          .from("app_lock_settings" as any)
          .select("is_locked, launch_at")
          .maybeSingle();
        if (cancelled || error || !data) return;
        setLaunchInfo(data as unknown as { is_locked: boolean; launch_at: string });
      } catch {
        /* silent */
      }
    };
    void checkLaunch();
    const id = window.setInterval(checkLaunch, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [nav]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { nav("/t"); return; }

      const { data: gp } = await supabase
        .from("gp_profiles")
        .select("id, business_name")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (!gp) { nav("/t"); return; }
      if (cancelled) return;
      setGpId(gp.id);
      gpIdRef.current = gp.id;
      setGpReference(gp.id.slice(0, 4).toUpperCase());

      // Load profile first name (profiles.user_id == auth.uid)
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", u.user.id)
        .maybeSingle();
      const fn = (prof?.full_name as string | undefined)?.split(" ")[0]
        || (gp.business_name as string | undefined)?.split(" ")[0]
        || "";
      setFirstName(fn);

      await Promise.all([loadDepartures(gp.id), loadInterests(gp.id)]);
      if (!cancelled) {
        setLoading(false);
        setLastUpdate(new Date());
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh: realtime + 20s polling + ticker for "il y a Xs" indicator
  useEffect(() => {
    if (!gpId) return;

    const refresh = async () => {
      if (!gpIdRef.current) return;
      setRefreshing(true);
      try {
        await Promise.all([loadDepartures(gpIdRef.current), loadInterests(gpIdRef.current)]);
        setLastUpdate(new Date());
      } finally {
        setRefreshing(false);
      }
    };

    const channel = supabase
      .channel("mini_dashboard_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "gp_offers" }, () => { void refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "transporter_interests" }, () => { void refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_requests" }, () => { void refresh(); })
      .subscribe();

    const interval = window.setInterval(() => { void refresh(); }, 20000);
    const tick = window.setInterval(() => setNow(new Date()), 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpId]);

  const manualRefresh = async () => {
    if (!gpId) return;
    setRefreshing(true);
    try {
      await Promise.all([loadDepartures(gpId), loadInterests(gpId)]);
      setLastUpdate(new Date());
      toast.success("Mis à jour");
    } finally {
      setRefreshing(false);
    }
  };

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
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <header className="px-6 pt-12 pb-6 max-w-xl mx-auto">
        <button onClick={() => nav("/t")} className="text-xs text-foreground/40 hover:text-foreground/70 flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3 h-3" /> Retour
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight">
              Bonjour{firstName ? `, ${firstName}` : ""}.
            </h1>
            <p
              className="mt-1 tabular-nums"
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: "11px",
                color: "#F5C518",
              }}
            >
              Partenaire Konnekt · GP{gpReference}
            </p>
          </div>
          <button
            onClick={manualRefresh}
            disabled={refreshing}
            aria-label="Actualiser"
            className="shrink-0 mt-1 h-9 w-9 rounded-full border border-foreground/15 hover:bg-foreground/5 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[hsl(var(--success))]" : "text-foreground/60"}`} />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-foreground/40">
          <span className={`w-1.5 h-1.5 rounded-full ${refreshing ? "bg-[hsl(var(--success))] animate-pulse" : "bg-muted-foreground/40"}`} />
          {refreshing ? "Mise à jour…" : `Mis à jour ${formatAgo(now, lastUpdate)}`}
        </div>
      </header>

      {/* LAUNCH STATUS BANNER + BETA INVITE + CLAIM ACCOUNT */}
      <section className="px-6 max-w-xl mx-auto -mt-2 mb-4 space-y-3">
        <BetaInviteBadge />
        <LaunchStatusBanner info={launchInfo} now={now} />
        <ClaimAccountBanner />
        <BetaApercuLinkBanner />
      </section>

      {/* QUICK ACTIONS */}
      <section className="px-6 max-w-xl mx-auto mb-6">
        <h2 className="text-sm uppercase tracking-wider text-foreground/40 mb-3">Actions rapides</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <QuickAction
            icon={<Plus className="w-4 h-4" />}
            label="Nouveau départ"
            sublabel="Publier un trajet"
            onClick={() => nav("/t")}
            tone="primary"
          />
          <QuickAction
            icon={<Inbox className="w-4 h-4" />}
            label="Demandes"
            sublabel="Opportunités client"
            onClick={() => nav("/t")}
            tone="secondary"
          />
          <QuickAction
            icon={<MessageCircle className="w-4 h-4" />}
            label="Mon profil"
            sublabel="Coordonnées beta"
            onClick={() => nav("/t")}
            tone="muted"
          />
          <QuickAction
            icon={<Package className="w-4 h-4" />}
            label="Wallet (à venir)"
            sublabel="Disponible au lancement"
            onClick={() => toast.info("Disponible au lancement officiel")}
            tone="locked"
          />
        </div>
      </section>

      {/* STATS */}
      <section className="px-6 max-w-xl mx-auto mb-6">
        <h2 className="text-sm uppercase tracking-wider text-foreground/40 mb-3">Statistiques</h2>
        {(() => {
          const total = interests.length + departures.length;
          const pendingI = interests.filter((i) => i.status === "pending").length;
          const completed = interests.filter((i) => i.status === "completed").length;
          const gains = completed * 0; // gains réels disponibles au lancement
          return (
            <div className="grid grid-cols-4 gap-2">
              <StatTile value={total} label="Missions" />
              <StatTile value={pendingI} label="En attente" tone="secondary" />
              <StatTile value={completed} label="Complétées" />
              <StatTile value={gains} label="Gains FCFA" />
            </div>
          );
        })()}
      </section>

      {/* PARAMÈTRES PRIX & RESTRICTIONS (preview verrouillé beta) */}
      <section className="px-6 max-w-xl mx-auto mb-6">
        <h2 className="text-sm uppercase tracking-wider text-foreground/40 mb-3">Paramètres</h2>
        <div className="space-y-2.5">
          <SettingRow
            title="Tarification au kilo"
            description="Définissez votre prix par kg et tranches"
            locked
          />
          <SettingRow
            title="Restrictions de transport"
            description="Catégories interdites, taille max, etc."
            locked
          />
        </div>
        <p className="text-[11px] text-foreground/40 mt-3 leading-relaxed">
          Ces paramètres seront éditables dès l'activation de votre compte
          GP au lancement officiel.
        </p>
      </section>

      {/* DEPARTURES */}
      <section className="px-6 max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm uppercase tracking-wider text-foreground/40 flex items-center gap-2">
            <Truck className="w-3.5 h-3.5" /> Mes départs actifs
          </h2>
          <Button size="sm" variant="outline" className="h-8 rounded-full border-foreground/15 text-xs" onClick={() => nav("/t")}>
            <Plus className="w-3 h-3 mr-1" /> Ajouter
          </Button>
        </div>

        {departures.length === 0 ? (
          <Card className="bg-foreground/5 border-foreground/10 p-6 text-center">
            <p className="text-sm text-foreground/60">Aucun départ actif</p>
            <Button className="mt-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full" size="sm" onClick={() => nav("/t")}>
              Publier un départ
            </Button>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {departures.map((d) => (
              <Card key={d.id} className="bg-foreground/5 border-foreground/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">{d.origin_city} → {d.destination_city}</div>
                  <Badge className="bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/25 text-[10px]">Actif</Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-foreground/50">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(d.departure_date), "d MMM yyyy", { locale: fr })}</span>
                  <span>{d.available_capacity}/{d.total_capacity} kg</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* DEMANDES ATTRIBUÉES PAR YOBBANTE (status: validated, in_progress) */}
      {(() => {
        const assigned = interests.filter((i) => i.status === "validated" || i.status === "in_progress");
        const pending = interests.filter((i) => i.status === "pending");
        const past = interests.filter((i) => i.status === "completed" || i.status === "declined");

        return (
          <>
            <section className="px-6 max-w-xl mx-auto mt-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm uppercase tracking-wider text-secondary flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> Attribuées par Yobbante
                </h2>
                {assigned.length > 0 && (
                  <Badge className="bg-secondary/15 text-secondary border-secondary/25 text-[10px]">
                    {assigned.length} active{assigned.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>

              {assigned.length === 0 ? (
                <Card className="bg-gradient-to-br from-secondary/5 to-transparent border-secondary/20 p-6 text-center">
                  <Inbox className="w-5 h-5 text-secondary/60 mx-auto mb-2" />
                  <p className="text-sm text-foreground/70">Aucune mission attribuée pour l'instant</p>
                  <p className="text-xs text-foreground/40 mt-1">
                    Yobbante vous notifiera dès qu'une demande client sera validée pour vous.
                  </p>
                </Card>
              ) : (
                <div className="space-y-2.5">
                  {assigned.map((i) => (
                    <Card key={i.id} className="bg-gradient-to-br from-secondary/15 to-transparent border-secondary/30 p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-secondary shrink-0" />
                            {i.custom_requests?.origin_city} → {i.custom_requests?.destination_city}
                          </div>
                          <div className="text-xs text-foreground/60 mt-1 flex items-center gap-2 flex-wrap">
                            <span className="font-mono">{i.custom_requests?.request_number}</span>
                            {i.custom_requests?.weight_estimate && (
                              <span>· {i.custom_requests.weight_estimate} kg</span>
                            )}
                            {i.custom_requests?.pickup_date_from && (
                              <span className="flex items-center gap-1">
                                · <Calendar className="w-3 h-3" />
                                {format(new Date(i.custom_requests.pickup_date_from), "d MMM", { locale: fr })}
                              </span>
                            )}
                          </div>
                        </div>
                        <StatusBadge status={i.status} />
                      </div>
                      <div className="mt-3 pt-3 border-t border-foreground/10 flex items-center justify-between">
                        <p className="text-[11px] text-secondary/80">
                          Mission validée — préparez l'enlèvement
                        </p>
                        <button
                          onClick={() => nav("/t")}
                          className="text-[11px] text-secondary hover:text-secondary flex items-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3" /> Contact
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* DEMANDES ENVOYÉES (en attente de validation admin) */}
            <section className="px-6 max-w-xl mx-auto mt-10">
              <h2 className="text-sm uppercase tracking-wider text-foreground/40 flex items-center gap-2 mb-3">
                <MessageCircle className="w-3.5 h-3.5" /> Mes demandes envoyées
                {pending.length > 0 && (
                  <span className="text-[10px] text-foreground/30">({pending.length} en attente)</span>
                )}
              </h2>

              {pending.length === 0 && past.length === 0 ? (
                <Card className="bg-foreground/5 border-foreground/10 p-6 text-center">
                  <Package className="w-5 h-5 text-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-foreground/60">Aucune demande envoyée</p>
                  <p className="text-xs text-foreground/40 mt-1">Cliquez "Je suis intéressé" sur une opportunité.</p>
                </Card>
              ) : (
                <div className="space-y-2.5">
                  {[...pending, ...past].map((i) => (
                    <Card key={i.id} className="bg-foreground/5 border-foreground/10 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">
                            {i.custom_requests?.origin_city} → {i.custom_requests?.destination_city}
                          </div>
                          <div className="text-xs text-foreground/50 mt-0.5 flex items-center gap-2">
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

            {/* Info beta footer */}
            <section className="px-6 max-w-xl mx-auto mt-10">
              <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 flex gap-3">
                <AlertCircle className="w-4 h-4 text-foreground/40 shrink-0 mt-0.5" />
                <div className="text-[11px] text-foreground/50 leading-relaxed">
                  <span className="text-foreground/70 font-medium">Mode beta actif.</span> Vous accédez au mini-dashboard
                  transporteur. À l'ouverture officielle, vous basculerez automatiquement sur le tableau de bord
                  complet GP avec toutes les fonctionnalités.
                </div>
              </div>
            </section>
          </>
        );
      })()}
    </div>
  );
}

function formatAgo(now: Date, then: Date) {
  const s = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 1000));
  if (s < 5) return "à l'instant";
  if (s < 60) return `il y a ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  return `il y a ${h}h`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "En attente", cls: "bg-foreground/10 text-foreground/70 border-foreground/15" },
    validated: { label: "Validée", cls: "bg-[hsl(var(--transport-maritime))]/15 text-[hsl(var(--transport-maritime))] border-[hsl(var(--transport-maritime))]/25" },
    in_progress: { label: "En cours", cls: "bg-secondary/15 text-secondary border-secondary/25" },
    completed: { label: "Terminée", cls: "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/25" },
    declined: { label: "Refusée", cls: "bg-destructive/15 text-destructive border-destructive/25" },
  };
  const m = map[status] || map.pending;
  return <Badge variant="outline" className={`${m.cls} text-[10px] shrink-0`}>{m.label}</Badge>;
}

function LaunchStatusBanner({
  info,
  now,
}: {
  info: { is_locked: boolean; launch_at: string } | null;
  now: Date;
}) {
  if (!info) {
    return (
      <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] px-4 py-3 flex items-center gap-2 text-[11px] text-foreground/40">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 animate-pulse" />
        Vérification du statut de lancement…
      </div>
    );
  }

  const launchTs = new Date(info.launch_at).getTime();
  const diff = launchTs - now.getTime();
  const launched = !info.is_locked || diff <= 0;

  if (launched) {
    return (
      <div className="rounded-2xl border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 px-4 py-3 flex items-center gap-2.5">
        <span className="w-2 h-2 rounded-full bg-[hsl(var(--success))] animate-pulse" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-[hsl(var(--success))]">Plateforme lancée</div>
          <div className="text-[11px] text-[hsl(var(--success))]/80">Votre dashboard GP complet est désormais accessible.</div>
        </div>
      </div>
    );
  }

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  const cd =
    days > 0 ? `${days}j ${String(hours).padStart(2, "0")}h`
    : hours > 0 ? `${hours}h ${String(minutes).padStart(2, "0")}m`
    : `${minutes}m ${String(seconds).padStart(2, "0")}s`;

  return (
    <div className="rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 to-transparent px-4 py-3 flex items-center gap-2.5">
      <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-primary">Lancement officiel</div>
        <div className="text-[11px] text-primary/80">
          Compte à rebours&nbsp;: <span className="tabular-nums font-semibold">{cd}</span>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  sublabel,
  onClick,
  tone = "muted",
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onClick: () => void;
  tone?: "primary" | "secondary" | "muted" | "locked";
}) {
  const toneCls =
    tone === "primary"
      ? "border-primary/25 bg-primary/10 text-primary"
      : tone === "secondary"
      ? "border-secondary/25 bg-secondary/10 text-secondary"
      : tone === "locked"
      ? "border-foreground/10 bg-foreground/[0.03] text-foreground/40"
      : "border-foreground/10 bg-foreground/[0.04] text-foreground/70";
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-2xl border p-3 transition hover:bg-foreground/5 ${toneCls}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="w-7 h-7 rounded-lg bg-foreground/5 flex items-center justify-center">
          {icon}
        </span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <p className="text-[11px] text-foreground/50 leading-snug">{sublabel}</p>
    </button>
  );
}

function StatTile({
  value,
  label,
  tone = "default",
}: {
  value: number;
  label: string;
  tone?: "default" | "secondary";
}) {
  const valueCls = tone === "secondary" ? "text-secondary" : "text-foreground";
  return (
    <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-3 text-center">
      <div className={`text-2xl font-bold tabular-nums ${valueCls}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-foreground/40 mt-1">
        {label}
      </div>
    </div>
  );
}

function SettingRow({
  title,
  description,
  locked,
}: {
  title: string;
  description: string;
  locked?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <p className="text-[11px] text-foreground/50 mt-0.5">{description}</p>
      </div>
      {locked && (
        <Badge
          variant="outline"
          className="text-[10px] border-foreground/15 text-foreground/50 shrink-0"
        >
          Verrouillé
        </Badge>
      )}
    </div>
  );
}
