// Admin Beta Tracking Dashboard — funnel + cohortes + GP list + chart 30j.
import { useEffect, useMemo, useState, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, RefreshCw, TrendingUp, Users, Send, MousePointerClick,
  ChevronDown, ChevronUp, MessageCircle, ArrowUpDown, MapPin, Phone, Clock, FileText, Copy,
} from "lucide-react";
import { UnifiedAdminLayout } from "@/components/layout/UnifiedAdminLayout";
import { toast } from "@/hooks/use-toast";

interface Event {
  id: string;
  event_type: string;
  source: string | null;
  session_id: string | null;
  gp_id: string | null;
  user_id: string | null;
  metadata: any;
  created_at: string;
}

interface ProfileRow {
  id: string;
  business_name: string | null;
  prenom: string | null;
  nom: string | null;
  city: string | null;
  status: string | null;
  created_at: string;
  total_deliveries: number | null;
  reference: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  phone_secondary: string | null;
  country_code: string | null;
  kyc_status: string | null;
  kyc_level: number | null;
  subscription: string | null;
  rating: number | null;
  beta_source: string | null;
  zones_covered: string[] | null;
  international_destinations: string[] | null;
}

interface TransporteurRow {
  id: string;
  reference: string | null;
  prenom: string | null;
  nom: string | null;
  telephone_1: string | null;
  telephone_2: string | null;
  navettes: string[] | null;
  created_at: string;
  welcome_sent_at: string | null;
  link_opened_at: string | null;
  form_completed_at: string | null;
  whatsapp_clicked_at: string | null;
  whatsapp_confirmed_at: string | null;
}

interface OnboardingEvent {
  ref_gp: string | null;
  event: string;
  occurred_at: string;
}

// Unified GP row used by the list
interface GP {
  key: string;
  ref: string;
  realRef: boolean;
  name: string;
  city: string | null;
  status: string;
  createdAt: string;
  missions: number;
  origin: "profile" | "yobbante";
  phone: string | null;
  // detail
  phones: string[];
  country: string | null;
  kycStatus: string | null;
  kycLevel: number | null;
  subscription: string | null;
  rating: number | null;
  betaSource: string | null;
  routes: string[];
  welcomeSentAt: string | null;
  linkOpenedAt: string | null;
  formCompletedAt: string | null;
  whatsappClickedAt: string | null;
  whatsappConfirmedAt: string | null;
}

const EVENT_LABELS: Record<string, string> = {
  cta_start: "Clic Commencer",
  form_view: "Vue formulaire",
  departure_published: "Départ publié",
  interest_clicked: "Intéressé",
};

const ONB_LABELS: Record<string, string> = {
  link_opened: "Lien ouvert",
  form_view: "Formulaire vu",
  registered: "Inscrit",
};

type GPFilter = "all" | "registered" | "not_registered" | "yobbante";
type SortKey = "ref" | "name" | "city" | "createdAt" | "missions" | "status";
type SortDir = "asc" | "desc";

const REGISTERED = new Set(["verified", "active"]);
const normPhone = (p?: string | null) => (p || "").replace(/[^0-9]/g, "");

export default function AdminBetaTracking() {
  const [events, setEvents] = useState<Event[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [transporteurs, setTransporteurs] = useState<TransporteurRow[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingEvent[]>([]);
  const [gpFilter, setGpFilter] = useState<GPFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: ev }, { data: p }, { data: t }, { data: ob }] = await Promise.all([
      supabase
        .from("beta_tracking_events" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000),
      supabase
        .from("gp_profiles")
        .select(
          "id, business_name, prenom, nom, city, status, created_at, total_deliveries, reference, phone, whatsapp_phone, phone_secondary, country_code, kyc_status, kyc_level, subscription, rating, beta_source, zones_covered, international_destinations"
        )
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("transporteurs" as any)
        .select("id, reference, prenom, nom, telephone_1, telephone_2, navettes, created_at, welcome_sent_at, form_completed_at, whatsapp_clicked_at, whatsapp_confirmed_at")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("gp_onboarding_events" as any)
        .select("ref_gp, event, occurred_at")
        .order("occurred_at", { ascending: false })
        .limit(2000),
    ]);
    setEvents((ev as unknown as Event[]) || []);
    setProfiles((p as unknown as ProfileRow[]) || []);
    setTransporteurs((t as unknown as TransporteurRow[]) || []);
    setOnboarding((ob as unknown as OnboardingEvent[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Build unified GP list (profils Konnekt + transporteurs Yobbanté non-inscrits)
  const allGps = useMemo<GP[]>(() => {
    const list: GP[] = [];
    const seenRefs = new Set<string>();
    const seenPhones = new Set<string>();

    for (const p of profiles) {
      const fullName = [p.prenom, p.nom].filter(Boolean).join(" ").trim();
      const ref = (p.reference || "").trim();
      const phones = [p.phone, p.whatsapp_phone, p.phone_secondary].filter(Boolean) as string[];
      if (ref) seenRefs.add(ref.toUpperCase());
      phones.forEach((ph) => seenPhones.add(normPhone(ph)));
      list.push({
        key: `p-${p.id}`,
        ref: ref || `GP${p.id.slice(0, 4).toUpperCase()}`,
        realRef: !!ref,
        name: fullName || p.business_name || "—",
        city: p.city,
        status: p.status || "pending",
        createdAt: p.created_at,
        missions: p.total_deliveries || 0,
        origin: "profile",
        phone: phones[0] || null,
        phones,
        country: p.country_code,
        kycStatus: p.kyc_status,
        kycLevel: p.kyc_level,
        subscription: p.subscription,
        rating: p.rating,
        betaSource: p.beta_source,
        routes: [...(p.zones_covered || []), ...(p.international_destinations || [])],
        welcomeSentAt: null,
        linkOpenedAt: null,
        formCompletedAt: null,
        whatsappClickedAt: null,
        whatsappConfirmedAt: null,
      });
    }

    for (const t of transporteurs) {
      const ref = (t.reference || "").trim();
      const phones = [t.telephone_1, t.telephone_2].filter(Boolean) as string[];
      const refDup = ref && seenRefs.has(ref.toUpperCase());
      const phoneDup = phones.some((ph) => seenPhones.has(normPhone(ph)));
      if (refDup || phoneDup) continue; // déjà couvert par un profil
      const fullName = [t.prenom, t.nom].filter(Boolean).join(" ").trim();
      list.push({
        key: `t-${t.id}`,
        ref: ref || `GP${t.id.slice(0, 4).toUpperCase()}`,
        realRef: !!ref,
        name: fullName || "—",
        city: null,
        status: "yobbante_invited",
        createdAt: t.created_at,
        missions: 0,
        origin: "yobbante",
        phone: phones[0] || null,
        phones,
        country: null,
        kycStatus: null,
        kycLevel: null,
        subscription: null,
        rating: null,
        betaSource: "yobbante",
        routes: t.navettes || [],
        welcomeSentAt: t.welcome_sent_at,
        linkOpenedAt: t.link_opened_at,
        formCompletedAt: t.form_completed_at,
        whatsappClickedAt: t.whatsapp_clicked_at,
        whatsappConfirmedAt: t.whatsapp_confirmed_at,
      });
    }

    return list;
  }, [profiles, transporteurs]);

  const filteredGps = useMemo(() => {
    let arr = allGps;
    if (gpFilter === "registered") arr = arr.filter((g) => REGISTERED.has(g.status));
    else if (gpFilter === "not_registered") arr = arr.filter((g) => g.origin === "profile" && !REGISTERED.has(g.status));
    else if (gpFilter === "yobbante") arr = arr.filter((g) => g.origin === "yobbante");

    const dir = sortDir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "ref": cmp = a.ref.localeCompare(b.ref); break;
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "city": cmp = (a.city || "").localeCompare(b.city || ""); break;
        case "missions": cmp = a.missions - b.missions; break;
        case "status": cmp = a.status.localeCompare(b.status); break;
        case "createdAt":
        default: cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
      }
      return cmp * dir;
    });
  }, [allGps, gpFilter, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "createdAt" || k === "missions" ? "desc" : "asc"); }
  };

  // Tracking timeline for a GP from onboarding events + dates
  const trackingFor = (g: GP) => {
    const steps: { label: string; at: string }[] = [];
    const ref = g.realRef ? g.ref.toUpperCase() : null;
    if (ref) {
      onboarding
        .filter((e) => (e.ref_gp || "").toUpperCase() === ref)
        .forEach((e) => steps.push({ label: ONB_LABELS[e.event] || e.event, at: e.occurred_at }));
    }
    steps.push({ label: g.origin === "yobbante" ? "Ajouté (Yobbanté)" : "Profil créé", at: g.createdAt });
    if (g.welcomeSentAt) steps.push({ label: "Bienvenue envoyée", at: g.welcomeSentAt });
    return steps.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  };

  const dossierLink = (g: GP) => {
    const num = normPhone(g.phone);
    const firstName = g.name.split(" ")[0] || "";
    const msg = `Bonjour ${firstName}, ici l'équipe Konnekt. Pour finaliser votre dossier GP (réf ${g.ref}), merci de nous transmettre : pièce d'identité, photo/selfie, et justificatif de voyage. Merci !`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  };

  const askDossier = (g: GP) => {
    window.open(dossierLink(g), "_blank");
  };

  const copyDossierLink = async (g: GP) => {
    try {
      await navigator.clipboard.writeText(dossierLink(g));
      toast({ title: "Lien copié", description: "Lien wa.me copié dans le presse-papier." });
    } catch {
      toast({ title: "Échec de la copie", description: "Copiez le lien manuellement.", variant: "destructive" });
    }
  };

  // Inscriptions par jour sur 30 derniers jours (profils)
  const dailyChart = useMemo(() => {
    const days: { day: string; count: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = profiles.filter((g) => g.created_at?.slice(0, 10) === key).length;
      days.push({ day: key, count });
    }
    return days;
  }, [profiles]);

  const conversionRate = profiles.length
    ? Math.round((profiles.filter((g) => REGISTERED.has(g.status || "")).length / profiles.length) * 100)
    : 0;

  const totalMissions = profiles.reduce((s, g) => s + (g.total_deliveries || 0), 0);

  const funnel = useMemo(() => {
    const distinct = (type: string) => new Set(
      events.filter((e) => e.event_type === type).map((e) => e.session_id || e.user_id || e.id)
    ).size;
    const start = distinct("cta_start");
    const view = distinct("form_view");
    const pub = distinct("departure_published");
    const interest = distinct("interest_clicked");
    const activation = start ? Math.round((pub / start) * 100) : 0;
    return { start, view, pub, interest, activation };
  }, [events]);

  const sources = useMemo(() => {
    const map = new Map<string, { start: number; pub: number; interest: number }>();
    for (const e of events) {
      const src = e.source || "direct";
      if (!map.has(src)) map.set(src, { start: 0, pub: 0, interest: 0 });
      const row = map.get(src)!;
      if (e.event_type === "cta_start") row.start++;
      if (e.event_type === "departure_published") row.pub++;
      if (e.event_type === "interest_clicked") row.interest++;
    }
    return Array.from(map.entries())
      .map(([src, v]) => ({ src, ...v, rate: v.start ? Math.round((v.pub / v.start) * 100) : 0 }))
      .sort((a, b) => b.start - a.start);
  }, [events]);

  const SortableTh = ({ k, label, align = "left" }: { k: SortKey; label: string; align?: "left" | "right" }) => (
    <th className={`py-2 ${align === "right" ? "text-right" : "text-left"} cursor-pointer select-none`} onClick={() => toggleSort(k)}>
      <span className={`inline-flex items-center gap-1 ${sortKey === k ? "text-foreground" : ""}`}>
        {label}
        {sortKey === k
          ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
          : <ArrowUpDown className="w-3 h-3 opacity-40" />}
      </span>
    </th>
  );

  return (
    <UnifiedAdminLayout activeModule="overview" standalone activeRoute="tracking">
      <div className="max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Beta Tracking</h1>
          <p className="text-sm text-muted-foreground">Funnel transporteurs · Cohortes par source</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Actualiser
        </Button>
      </header>

      {loading && events.length === 0 ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <>
          {/* Funnel */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Kpi icon={<MousePointerClick className="w-4 h-4" />} label="Clic Commencer" value={funnel.start} />
            <Kpi icon={<Users className="w-4 h-4" />} label="Vue formulaire" value={funnel.view} />
            <Kpi icon={<Send className="w-4 h-4" />} label="Départ publié" value={funnel.pub} />
            <Kpi icon={<TrendingUp className="w-4 h-4" />} label="Intéressé" value={funnel.interest} />
            <Kpi icon={<TrendingUp className="w-4 h-4" />} label="Activation %" value={`${funnel.activation}%`} highlight />
          </div>

          {/* Cohorts */}
          <Card className="p-4 mb-6">
            <h2 className="text-sm font-semibold mb-3">Cohortes par source</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-left py-2">Source</th>
                    <th className="text-right py-2">Clic</th>
                    <th className="text-right py-2">Publié</th>
                    <th className="text-right py-2">Intéressé</th>
                    <th className="text-right py-2">Activation</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-4 text-muted-foreground">Aucune donnée</td></tr>
                  ) : sources.map((s) => (
                    <tr key={s.src} className="border-b last:border-0">
                      <td className="py-2"><Badge variant="outline">{s.src}</Badge></td>
                      <td className="text-right">{s.start}</td>
                      <td className="text-right">{s.pub}</td>
                      <td className="text-right">{s.interest}</td>
                      <td className="text-right font-semibold">{s.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Stats Konnekt beta */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 mb-3">
            <Kpi icon={<Users className="w-4 h-4" />} label="GP invités" value={profiles.length} />
            <Kpi
              icon={<Users className="w-4 h-4" />}
              label="Inscrits"
              value={profiles.filter((g) => REGISTERED.has(g.status || "")).length}
            />
            <Kpi icon={<TrendingUp className="w-4 h-4" />} label="Taux conv." value={`${conversionRate}%`} highlight />
            <Kpi icon={<Send className="w-4 h-4" />} label="Missions assignées" value={totalMissions} />
          </div>

          {/* Chart inscriptions 30j */}
          <Card className="p-4 mb-6" style={{ background: "#111111" }}>
            <h2 className="text-sm font-semibold mb-3 text-white">Inscriptions par jour (30 derniers jours)</h2>
            {(() => {
              const max = Math.max(1, ...dailyChart.map((d) => d.count));
              return (
                <div className="flex items-end gap-1 h-32">
                  {dailyChart.map((d) => (
                    <div key={d.day} className="flex-1 h-full flex flex-col justify-end items-center gap-1" title={`${d.day} · ${d.count}`}>
                      <div
                        className="w-full rounded-t"
                        style={{
                          height: `${(d.count / max) * 100}%`,
                          minHeight: d.count > 0 ? "4px" : "1px",
                          background: d.count > 0 ? "#3B82F6" : "rgba(255,255,255,0.08)",
                        }}
                      />
                    </div>
                  ))}
                </div>
              );
            })()}
            <div className="flex justify-between text-[10px] text-white/40 mt-2 tabular-nums">
              <span>{dailyChart[0]?.day}</span>
              <span>{dailyChart[dailyChart.length - 1]?.day}</span>
            </div>
          </Card>

          {/* Liste GP */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-sm font-semibold">Liste GP ({filteredGps.length})</h2>
              <div className="flex gap-1 flex-wrap">
                {([
                  { k: "all", label: "Tous" },
                  { k: "registered", label: "Inscrits" },
                  { k: "not_registered", label: "Non inscrits" },
                  { k: "yobbante", label: "Yobbanté" },
                ] as const).map((opt) => (
                  <Button
                    key={opt.k}
                    size="sm"
                    variant={gpFilter === opt.k ? "default" : "outline"}
                    onClick={() => setGpFilter(opt.k)}
                    className="h-7 text-xs"
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="w-6" />
                    <SortableTh k="ref" label="Réf" />
                    <SortableTh k="name" label="Nom" />
                    <SortableTh k="city" label="Ville" />
                    <SortableTh k="createdAt" label="Inscrit le" />
                    <SortableTh k="missions" label="Missions" align="right" />
                    <SortableTh k="status" label="Statut" align="right" />
                  </tr>
                </thead>
                <tbody>
                  {filteredGps.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-4 text-muted-foreground">Aucun GP</td></tr>
                  ) : filteredGps.slice(0, 200).map((g) => {
                    const open = expanded === g.key;
                    return (
                      <Fragment key={g.key}>
                        <tr
                          key={g.key}
                          className="border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors"
                          onClick={() => setExpanded(open ? null : g.key)}
                        >
                          <td className="py-2 text-muted-foreground">
                            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </td>
                          <td className="py-2 font-mono text-xs">
                            {g.ref}{!g.realRef && <span className="text-muted-foreground/50">*</span>}
                          </td>
                          <td className="py-2 truncate max-w-[140px]">{g.name}</td>
                          <td className="py-2 text-muted-foreground">{g.city || "—"}</td>
                          <td className="py-2 text-xs text-muted-foreground">
                            {new Date(g.createdAt).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="py-2 text-right tabular-nums">{g.missions}</td>
                          <td className="py-2 text-right">
                            <Badge variant="outline" className="text-[10px]">{g.status}</Badge>
                          </td>
                        </tr>
                        {open && (
                          <tr key={`${g.key}-d`} className="bg-muted/20">
                            <td colSpan={7} className="p-4">
                              <div className="grid md:grid-cols-3 gap-4">
                                {/* Identité */}
                                <div className="space-y-1.5 text-xs">
                                  <div className="font-semibold text-sm mb-1">{g.name}</div>
                                  <Info icon={<Phone className="w-3 h-3" />} label="Téléphone" value={g.phones.join(" · ") || "—"} />
                                  <Info icon={<MapPin className="w-3 h-3" />} label="Ville / Pays" value={[g.city, g.country].filter(Boolean).join(" · ") || "—"} />
                                  <Info icon={<TrendingUp className="w-3 h-3" />} label="Itinéraires" value={g.routes.length ? g.routes.join(", ") : "—"} />
                                </div>
                                {/* Dossier */}
                                <div className="space-y-1.5 text-xs">
                                  <div className="font-semibold text-sm mb-1">Dossier</div>
                                  <Info icon={<FileText className="w-3 h-3" />} label="Statut" value={g.status} />
                                  <Info icon={<FileText className="w-3 h-3" />} label="KYC" value={[g.kycStatus, g.kycLevel != null ? `niv. ${g.kycLevel}` : null].filter(Boolean).join(" · ") || "—"} />
                                  <Info icon={<FileText className="w-3 h-3" />} label="Abonnement" value={g.subscription || "—"} />
                                  <Info icon={<TrendingUp className="w-3 h-3" />} label="Missions / Note" value={`${g.missions} · ${g.rating != null ? g.rating.toFixed(1) : "—"}`} />
                                  <Info icon={<Send className="w-3 h-3" />} label="Source" value={g.betaSource || "—"} />
                                </div>
                                {/* Tracking */}
                                <div className="space-y-1.5 text-xs">
                                  <div className="font-semibold text-sm mb-1">Tracking</div>
                                  {trackingFor(g).map((s, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                      <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                      <span className="font-medium">{s.label}</span>
                                      <span className="text-muted-foreground ml-auto tabular-nums">{new Date(s.at).toLocaleString("fr-FR")}</span>
                                    </div>
                                  ))}
                                  <div className="border-t border-border/50 mt-2 pt-2 space-y-1.5">
                                    {[
                                      { label: "Formulaire complété", at: g.formCompletedAt },
                                      { label: "WA cliqué", at: g.whatsappClickedAt },
                                      { label: "WA confirmé", at: g.whatsappConfirmedAt },
                                    ].map((s) => (
                                      <div key={s.label} className="flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                        <span className="font-medium">{s.label}</span>
                                        <span className="text-muted-foreground ml-auto tabular-nums">
                                          {s.at ? new Date(s.at).toLocaleString("fr-FR") : "—"}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-4 space-y-2">
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    className="h-8 text-xs"
                                    disabled={!normPhone(g.phone)}
                                    onClick={(e) => { e.stopPropagation(); askDossier(g); }}
                                  >
                                    <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Demander compléments (WhatsApp)
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs"
                                    disabled={!normPhone(g.phone)}
                                    onClick={(e) => { e.stopPropagation(); copyDossierLink(g); }}
                                  >
                                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Copier le lien wa.me
                                  </Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                  Si la fenêtre WhatsApp ne s'ouvre pas (envoi automatique limité à 24h), copiez le lien wa.me et collez-le dans votre navigateur ou WhatsApp.
                                </p>
                              </div>

                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">* référence provisoire (non rattachée à une réf GP officielle)</p>
          </Card>

          {/* Recent events */}
          <Card className="p-4 mt-6">
            <h2 className="text-sm font-semibold mb-3">Évènements récents</h2>
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {events.slice(0, 100).map((e) => (
                <div key={e.id} className="flex items-center justify-between text-xs border-b last:border-0 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="secondary" className="text-[10px]">{EVENT_LABELS[e.event_type] || e.event_type}</Badge>
                    <span className="text-muted-foreground truncate">{e.source || "direct"}</span>
                  </div>
                  <span className="text-muted-foreground shrink-0">{new Date(e.created_at).toLocaleString("fr-FR")}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
      </div>
    </UnifiedAdminLayout>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium break-words">{value}</span>
    </div>
  );
}

function Kpi({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: number | string; highlight?: boolean }) {
  return (
    <Card className={`p-4 ${highlight ? "bg-primary/5 border-primary/20" : ""}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">{icon}{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </Card>
  );
}
