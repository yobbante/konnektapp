/**
 * GPDirectDashboard — Mini dashboard GP beta (accès par lien direct)
 *
 * URL : /gp/[ref_gp]  (ex: /gp/GP4346)
 * Source unique : table `transporteurs` (aucun gp_profiles, aucune auth).
 *
 * Accès :
 *  - ref introuvable (local + Yobbanté) → page "Lien invalide ou expiré"
 *  - trouvé → dashboard
 */
import { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, MessageCircle, Plane, Package, Wallet, User,
  Plus, Pencil, Trash2, Check, AlertTriangle, MapPin,
} from "lucide-react";
import { fetchYobbanteGp } from "@/lib/yobbante";

const NAVY = "#0A1628";
const GOLD = "#C97B3A";
const GREEN = "#22C55E";
const BLUE = "#3B82F6";
const GREEN_WA = "#25D366";
const KONNEKT_WA = "221789269756";

const ACTIVE_MISSION_STATUSES = ["ASSIGNED", "COLLECTED", "IN_TRANSIT"];

interface Transporteur {
  id: string;
  reference: string;
  prenom: string | null;
  nom: string | null;
  telephone_1: string | null;
  navettes: string[] | null;
  residence_city: string | null;
  whatsapp_confirmed_at: string | null;
  beta_wizard_completed_at: string | null;
  beta_tarif_defaut: number | null;
  beta_forfait_min: number | null;
  beta_devise: string | null;
  beta_notes_conditions: string | null;
}

/** Villes disponibles pour les sélecteurs de navette. */
export const KONNEKT_CITIES = [
  "Dakar", "Paris", "Bordeaux", "Lyon", "Marseille", "Lille", "Rennes",
  "Rouen", "Toulouse", "Nice", "Strasbourg", "Nantes", "Montpellier",
  "Abidjan", "Bamako", "Douala", "Yaoundé", "Kinshasa", "Brazzaville",
  "Libreville", "Conakry", "Lomé", "Cotonou", "Accra", "Lagos",
  "Madrid", "Barcelone", "Berlin", "Amsterdam", "Bruxelles", "Genève",
  "Montréal", "New York", "Washington", "Dubai", "Istanbul",
];

/** Devises disponibles pour les tarifs GP. */
export const KONNEKT_CURRENCIES = ["XOF", "EUR", "USD", "GBP", "CAD"] as const;

interface Departure {
  id: string;
  ville_depart: string | null;
  ville_arrivee: string | null;
  destination: string | null;
  date_depart: string | null;
  capacite_kg: number | null;
  poids_kg: number | null;
  tarif_par_kg: number | null;
  currency: string | null;
}

interface Mission {
  id: string;
  tracking_id: string | null;
  konnekt_external_id: string | null;
  client_prenom: string | null;
  destination_city: string | null;
  status: string | null;
  poids_reel: number | null;
}



/** Parse a stored date string safely and return a JS Date or null. */
function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  // Match a clean ISO-ish date prefix (yyyy-mm-dd) to avoid garbage like "60715-02-20"
  const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    if (y >= 2000 && y <= 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return new Date(y, mo - 1, d);
    }
    return null;
  }
  const dt = new Date(raw);
  if (!isNaN(dt.getTime()) && dt.getFullYear() >= 2000 && dt.getFullYear() <= 2100) return dt;
  return null;
}

/** "15 juil. 2026" — formatage français robuste. */
function formatDateLong(raw: string | null): string {
  const dt = parseDate(raw);
  if (!dt) return "Date non définie";
  return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

const inputCls =
  "w-full rounded-xl border border-black/15 px-3 py-2.5 text-sm outline-none focus:border-[#C97B3A] focus:ring-2 focus:ring-[#C97B3A]/20";
const labelCls = "block text-xs font-semibold mb-1.5 text-black/70";

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    ASSIGNED: { label: "Assigné", bg: "rgba(245,158,11,0.12)", color: "#B45309" },
    COLLECTED: { label: "Collecté", bg: "rgba(59,130,246,0.12)", color: "#1D4ED8" },
    IN_TRANSIT: { label: "En transit", bg: "rgba(99,102,241,0.12)", color: "#4338CA" },
  };
  const s = map[(status || "").toUpperCase()] || { label: status || "—", bg: "#F3F4F6", color: "#374151" };
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

/* ─────────────────────────  HEADER  ───────────────────────── */

function DashboardHeader({ gp }: { gp: Transporteur }) {
  return (
    <header className="text-white" style={{ backgroundColor: NAVY }}>
      <div className="max-w-md mx-auto px-4 pt-5 pb-6" style={{ paddingTop: "calc(20px + env(safe-area-inset-top,0px))" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg grid place-items-center font-bold text-white" style={{ backgroundColor: GOLD }}>K</span>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-[15px] tracking-tight">KONNEKT</span>
              <span className="text-[11px] text-white/50 mt-0.5">Espace GP</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {gp.whatsapp_confirmed_at && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1 text-white" style={{ backgroundColor: GREEN_WA }}>
                <Check className="w-3 h-3" /> WhatsApp actif
              </span>
            )}
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: GOLD }}>
              {gp.reference}
            </span>
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight mt-5">
          Bonjour {gp.prenom || ""} 👋
        </h1>
      </div>
    </header>
  );
}

/* ─────────────────────────  WHATSAPP CTA  ───────────────────────── */

const WA_INCENTIVES = [
  { icon: "📨", label: "Missions en temps réel" },
  { icon: "✅", label: "Confirmer une collecte" },
  { icon: "🛫", label: "Enregistrer un départ" },
  { icon: "⏰", label: "Rappels automatiques" },
];

function WhatsAppCTABanner({ refGp }: { refGp: string }) {
  const SESSION_KEY = `wa_cta_dismissed_${refGp.toUpperCase()}`;
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY) === "1",
  );
  if (dismissed) return null;

  const waUrl = `https://wa.me/${KONNEKT_WA}?text=${encodeURIComponent(`KONNEKT ${refGp.toUpperCase()}`)}`;

  return (
    <div className="px-4 py-4 text-white" style={{ backgroundColor: GREEN_WA }}>
      <div className="max-w-md mx-auto">
        <div className="flex items-start gap-2.5">
          <MessageCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <h2 className="text-[15px] font-bold leading-snug">
            Activez WhatsApp pour tirer le meilleur de Konnekt
          </h2>
        </div>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {WA_INCENTIVES.map((it) => (
            <li key={it.label} className="text-[11px] font-medium bg-white/20 rounded-full px-2.5 py-1 inline-flex items-center gap-1">
              <span>{it.icon}</span>{it.label}
            </li>
          ))}
        </ul>
        <a href={waUrl} target="_blank" rel="noopener noreferrer"
          className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-sm"
          style={{ backgroundColor: "#FFFFFF", color: GREEN_WA }}>
          <MessageCircle className="w-4 h-4" /> Activer WhatsApp
        </a>
        <button onClick={() => { sessionStorage.setItem(SESSION_KEY, "1"); setDismissed(true); }}
          className="mt-2 w-full text-center text-[12px] font-medium text-white/80 underline">
          Plus tard
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────  INVALID REF  ───────────────────────── */

function InvalidRefPage() {
  return (
    <div className="min-h-screen grid place-items-center px-6" style={{ backgroundColor: "#F8FAFC" }}>
      <Helmet>
        <title>Lien invalide — Konnekt GP</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="max-w-sm w-full text-center bg-white rounded-2xl shadow-sm border border-black/10 p-8">
        <div className="w-14 h-14 rounded-2xl grid place-items-center mx-auto" style={{ backgroundColor: "rgba(201,123,58,0.12)" }}>
          <AlertTriangle className="w-7 h-7" style={{ color: GOLD }} />
        </div>
        <h1 className="text-xl font-bold mt-5" style={{ color: NAVY }}>Lien invalide ou expiré</h1>
        <p className="text-sm text-black/60 mt-2">Ce lien d'invitation n'est pas reconnu.</p>
        <a href="/beta" className="mt-6 w-full inline-flex items-center justify-center rounded-xl py-3 font-bold text-sm text-white" style={{ backgroundColor: GOLD }}>
          Rejoindre Konnekt
        </a>
      </div>
    </div>
  );
}

/* ─────────────────────────  MAIN  ───────────────────────── */

export default function GPDirectDashboard({ refGp }: { refGp: string }) {
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [gp, setGp] = useState<Transporteur | null>(null);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);

  /* Force light mode */
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => { if (hadDark) root.classList.add("dark"); };
  }, []);

  const loadDeparturesAndMissions = useCallback(async (ref: string) => {
    const [dep, mis] = await Promise.all([
      supabase
        .from("manual_departures")
        .select("id, ville_depart, ville_arrivee, destination, date_depart, capacite_kg, poids_kg, tarif_par_kg, currency, created_at")
        .ilike("gp_reference", ref)
        .order("created_at", { ascending: false }),
      supabase
        .from("shipments")
        .select("id, tracking_id, konnekt_external_id, client_prenom, destination_city, status, poids_reel")
        .ilike("assigned_gp", ref),
    ]);
    setDepartures((dep.data as Departure[]) || []);
    setMissions(
      ((mis.data as Mission[]) || []).filter((m) =>
        ACTIVE_MISSION_STATUSES.includes((m.status || "").toUpperCase()),
      ),
    );
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setInvalid(false);
      const SELECT_COLS =
        "id, reference, prenom, nom, telephone_1, navettes, residence_city, whatsapp_confirmed_at, beta_wizard_completed_at, beta_tarif_defaut, beta_forfait_min, beta_devise, beta_notes_conditions";

      // 1) Fiche locale si déjà créée
      let { data } = await supabase
        .from("transporteurs")
        .select(SELECT_COLS)
        .ilike("reference", refGp)
        .maybeSingle();
      if (!active) return;

      // 2) Sinon, identité dans le projet Yobbanté
      if (!data) {
        const yob = await fetchYobbanteGp(refGp);
        if (!active) return;
        if (!yob) {
          setInvalid(true);
          setLoading(false);
          return;
        }
        const { data: created } = await supabase
          .from("transporteurs")
          .insert({
            reference: refGp.toUpperCase(),
            prenom: yob.prenom,
            nom: yob.nom,
            telephone_1: yob.telephone_1 || yob.telephone_2,
            navettes: [],
          })
          .select(SELECT_COLS)
          .maybeSingle();
        if (!active) return;
        data = created;
      }

      if (!data) {
        setInvalid(true);
        setLoading(false);
        return;
      }

      const t = data as Transporteur;
      // Ref existante mais onboarding non terminé → compléter l'inscription
      if (!t.beta_wizard_completed_at) {
        window.location.replace(`/onboarding/${t.reference}`);
        return;
      }
      setGp(t);
      await loadDeparturesAndMissions(t.reference);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [refGp, loadDeparturesAndMissions]);

  const refreshGp = useCallback(async () => {
    const { data } = await supabase
      .from("transporteurs")
      .select("id, reference, prenom, nom, telephone_1, navettes, residence_city, whatsapp_confirmed_at, beta_wizard_completed_at, beta_tarif_defaut, beta_forfait_min, beta_devise, beta_notes_conditions")
      .ilike("reference", refGp)
      .maybeSingle();
    if (data) setGp(data as Transporteur);
  }, [refGp]);

  if (invalid) return <InvalidRefPage />;

  if (loading || !gp) {
    return (
      <div className="min-h-screen grid place-items-center bg-white">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#F8FAFC", color: NAVY }}>
      <Helmet>
        <title>Konnekt GP — Mon espace</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <DashboardHeader gp={gp} />
      {!gp.whatsapp_confirmed_at && <WhatsAppCTABanner refGp={gp.reference} />}

      <main className="px-4 py-5 max-w-md mx-auto space-y-4">
        <DeparturesSection
          gp={gp}
          departures={departures}
          onChanged={() => loadDeparturesAndMissions(gp.reference)}
        />
        <MissionsSection missions={missions} />
        <PaymentsSection />
        <ProfileSection gp={gp} onSaved={refreshGp} />
      </main>

      <footer className="max-w-md mx-auto px-4 pb-8 pt-2 text-center">
        <p className="text-xs font-semibold" style={{ color: NAVY }}>Konnekt by Yobbanté</p>
        <a
          href={`https://wa.me/${KONNEKT_WA}?text=${encodeURIComponent("AIDE")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold mt-1 inline-flex items-center gap-1"
          style={{ color: GREEN_WA }}
        >
          <MessageCircle className="w-3.5 h-3.5" /> Aide
        </a>
      </footer>
    </div>
  );
}

/* ─────────────────────────  SECTIONS  ───────────────────────── */

function SectionCard({ accent, icon, title, action, children }: {
  accent: string; icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section
      className="bg-white rounded-xl p-4 shadow-sm border border-black/5"
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-bold">{icon}{title}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

function DeparturesSection({ gp, departures, onChanged }: { gp: Transporteur; departures: Departure[]; onChanged: () => void | Promise<void> }) {
  const [editing, setEditing] = useState<Departure | "new" | null>(null);

  return (
    <SectionCard
      accent={GOLD}
      icon={<Plane className="w-4 h-4" style={{ color: GOLD }} />}
      title="Mes départs"
    >
      {departures.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-2xl grid place-items-center mx-auto" style={{ backgroundColor: "rgba(201,123,58,0.1)" }}>
            <Plane className="w-6 h-6" style={{ color: GOLD }} />
          </div>
          <p className="text-sm font-medium mt-3">Aucun départ enregistré.</p>
          <p className="text-xs text-black/50 mt-0.5">Ajoutez votre prochain voyage.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {departures.map((d) => {
            const capacite = d.capacite_kg ?? d.poids_kg;
            return (
              <li key={d.id} className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-2" style={{ backgroundColor: "rgba(201,123,58,0.05)" }}>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-bold truncate">
                    <Plane className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GOLD }} />
                    {(d.ville_depart || "—")} → {(d.ville_arrivee || d.destination || "—")}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-black/50">{formatDateLong(d.date_depart)}</span>
                    {capacite != null && capacite > 0 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#15803D" }}>
                        {capacite} kg dispo
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setEditing(d)} className="p-1.5 rounded-md hover:bg-black/5"><Pencil className="w-3.5 h-3.5 text-black/50" /></button>
                  <button
                    onClick={async () => { await supabase.from("manual_departures").delete().eq("id", d.id); await onChanged(); }}
                    className="p-1.5 rounded-md hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" style={{ color: "#DC2626" }} /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button
        onClick={() => setEditing("new")}
        className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 font-semibold text-sm border-2 transition-colors hover:text-white"
        style={{ borderColor: NAVY, color: NAVY }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = NAVY; e.currentTarget.style.color = "#fff"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = NAVY; }}
      >
        <Plus className="w-4 h-4" /> Ajouter un départ
      </button>

      {editing && (
        <DepartureForm
          gp={gp}
          departure={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await onChanged(); }}
        />
      )}
    </SectionCard>
  );
}

function DepartureForm({ gp, departure, onClose, onSaved }: { gp: Transporteur; departure: Departure | null; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [villeDepart, setVilleDepart] = useState(departure?.ville_depart || gp.residence_city || "");
  const [villeArrivee, setVilleArrivee] = useState(departure?.ville_arrivee || departure?.destination || "");
  const [dateDepart, setDateDepart] = useState(() => {
    const dt = parseDate(departure?.date_depart || null);
    if (!dt) return "";
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${dt.getFullYear()}-${mm}-${dd}`;
  });
  const [capacite, setCapacite] = useState(departure?.capacite_kg != null ? String(departure.capacite_kg) : (departure?.poids_kg != null ? String(departure.poids_kg) : ""));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const payload = {
      gp_reference: gp.reference,
      ville_depart: villeDepart.trim(),
      ville_arrivee: villeArrivee.trim(),
      destination: villeArrivee.trim(),
      date_depart: dateDepart || null,
      capacite_kg: capacite ? Number(capacite) : null,
      poids_kg: capacite ? Number(capacite) : null,
      // Tarif confidentiel (admin only) — conservé tel quel, jamais exposé au GP
      tarif_par_kg: departure?.tarif_par_kg ?? gp.beta_tarif_defaut ?? null,
      currency: "XOF",
      source: "gp_dashboard_beta",
    };
    if (departure) await supabase.from("manual_departures").update(payload).eq("id", departure.id);
    else await supabase.from("manual_departures").insert(payload);
    setSaving(false);
    await onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-end sm:place-items-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">{departure ? "Modifier le départ" : "Nouveau départ"}</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Départ</label><input className={inputCls} value={villeDepart} onChange={(e) => setVilleDepart(e.target.value)} /></div>
            <div><label className={labelCls}>Arrivée</label><input className={inputCls} value={villeArrivee} onChange={(e) => setVilleArrivee(e.target.value)} /></div>
          </div>
          <div><label className={labelCls}>Date</label><input type="date" className={inputCls} value={dateDepart || ""} onChange={(e) => setDateDepart(e.target.value)} /></div>
          <div><label className={labelCls}>Capacité (kg)</label><input type="number" className={inputCls} value={capacite} onChange={(e) => setCapacite(e.target.value)} /></div>
        </div>
        <div className="flex items-center gap-3 mt-5">
          <button onClick={onClose} className="flex-1 rounded-xl py-3 font-semibold text-sm border" style={{ borderColor: "#E5E7EB", color: "#6B7280" }}>Annuler</button>
          <button onClick={save} disabled={saving || !villeArrivee.trim()} className="flex-1 inline-flex items-center justify-center gap-2 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50" style={{ backgroundColor: GOLD }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Enregistrer <Check className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

function MissionsSection({ missions }: { missions: Mission[] }) {
  return (
    <SectionCard accent={GREEN} icon={<Package className="w-4 h-4" style={{ color: GREEN }} />} title="Mes missions">
      {missions.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-2xl grid place-items-center mx-auto" style={{ backgroundColor: "rgba(34,197,94,0.1)" }}>
            <Package className="w-6 h-6" style={{ color: GREEN }} />
          </div>
          <p className="text-sm font-medium mt-3">Aucune mission active pour le moment.</p>
          <p className="text-xs text-black/50 mt-0.5">Les colis vous seront assignés par Konnekt.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {missions.map((m) => (
            <li key={m.id} className="rounded-xl px-3 py-2.5 border border-black/5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-black/50">{m.tracking_id || m.konnekt_external_id || "—"}</span>
                <StatusBadge status={m.status} />
              </div>
              <div className="text-sm font-medium mt-1">{m.client_prenom || "Client"}</div>
              <div className="text-[11px] text-black/50 mt-0.5">
                {m.destination_city || "—"}{m.poids_reel != null ? ` · ${m.poids_reel} kg` : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function PaymentsSection() {
  const solde = 0;
  return (
    <SectionCard accent={BLUE} icon={<Wallet className="w-4 h-4" style={{ color: BLUE }} />} title="Mes paiements">
      <div className="rounded-xl px-4 py-4" style={{ backgroundColor: "rgba(59,130,246,0.06)" }}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-black/60">Solde en attente</span>
          {solde > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#B45309" }}>
              En attente
            </span>
          )}
        </div>
        <div className="text-2xl font-bold mt-1" style={{ color: NAVY }}>
          {solde.toLocaleString("fr-FR")} FCFA
        </div>
      </div>
      <p className="text-sm text-black/50 mt-3">Aucun paiement reçu pour le moment.</p>
    </SectionCard>
  );
}

function ProfileSection({ gp, onSaved }: { gp: Transporteur; onSaved: () => void | Promise<void> }) {
  const [editing, setEditing] = useState(false);

  const navettes = (gp.navettes || []).filter(Boolean);
  const devise = gp.beta_devise || "XOF";

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-center justify-between py-2 border-b border-black/5 last:border-0">
      <span className="text-xs text-black/50">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]">{value || "—"}</span>
    </div>
  );

  return (
    <SectionCard
      accent={NAVY}
      icon={<User className="w-4 h-4" style={{ color: NAVY }} />}
      title="Mon profil"
    >
      <div>
        <Row label="Prénom" value={gp.prenom} />
        <Row label="Nom" value={gp.nom} />
        <Row label="Téléphone" value={gp.telephone_1} />
        <Row label="Ville de résidence" value={gp.residence_city} />
        <Row label="Villes de navette" value={navettes.length ? navettes.join(" → ") : "—"} />
      </div>

      {/* Mes tarifs — visibles par le GP, jamais exposés aux clients */}
      <div className="mt-4 rounded-xl p-3" style={{ backgroundColor: "rgba(10,22,40,0.04)" }}>
        <div className="flex items-center gap-1.5 text-xs font-bold mb-2" style={{ color: NAVY }}>
          <Wallet className="w-3.5 h-3.5" /> Mes tarifs
          <span className="ml-auto text-[10px] font-medium text-black/40">privé</span>
        </div>
        <Row label="Prix au kg" value={gp.beta_tarif_defaut != null ? `${gp.beta_tarif_defaut} ${devise}` : "—"} />
        <Row label="Forfait minimum" value={gp.beta_forfait_min != null ? `${gp.beta_forfait_min} ${devise}` : "—"} />
        <Row label="Devise" value={devise} />
      </div>
      <button
        onClick={() => setEditing(true)}
        className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 font-semibold text-sm text-white"
        style={{ backgroundColor: NAVY }}
      >
        <Pencil className="w-4 h-4" /> Modifier mes infos
      </button>

      {editing && (
        <ProfileEditModal gp={gp} onClose={() => setEditing(false)} onSaved={async () => { setEditing(false); await onSaved(); }} />
      )}
    </SectionCard>
  );
}

function ProfileEditModal({ gp, onClose, onSaved }: { gp: Transporteur; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [prenom, setPrenom] = useState(gp.prenom || "");
  const [nom, setNom] = useState(gp.nom || "");
  const [telephone, setTelephone] = useState(gp.telephone_1 || "");
  const [residence, setResidence] = useState(gp.residence_city || "");
  const existing = (gp.navettes || []).filter(Boolean);
  const [villeDepart, setVilleDepart] = useState(existing[0] || "");
  const [villeArrivee, setVilleArrivee] = useState(existing[1] || "");
  const [prixKg, setPrixKg] = useState(gp.beta_tarif_defaut != null ? String(gp.beta_tarif_defaut) : "");
  const [forfaitMin, setForfaitMin] = useState(gp.beta_forfait_min != null ? String(gp.beta_forfait_min) : "");
  const [devise, setDevise] = useState(gp.beta_devise || "XOF");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await supabase.from("transporteurs").update({
      prenom: prenom.trim() || null,
      nom: nom.trim() || null,
      telephone_1: telephone.trim() || null,
      residence_city: residence.trim() || null,
      navettes: [villeDepart, villeArrivee].map((s) => s.trim()).filter(Boolean),
      beta_tarif_defaut: prixKg ? Number(prixKg) : null,
      beta_forfait_min: forfaitMin ? Number(forfaitMin) : null,
      beta_devise: devise,
    }).eq("id", gp.id);
    setSaving(false);
    await onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-end sm:place-items-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">Modifier mes infos</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Prénom</label><input className={inputCls} value={prenom} onChange={(e) => setPrenom(e.target.value)} /></div>
            <div><label className={labelCls}>Nom</label><input className={inputCls} value={nom} onChange={(e) => setNom(e.target.value)} /></div>
          </div>
          <div><label className={labelCls}>Téléphone</label><input className={inputCls} value={telephone} onChange={(e) => setTelephone(e.target.value)} /></div>
          <div><label className={labelCls}>Ville de résidence</label><input className={inputCls} value={residence} onChange={(e) => setResidence(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Ville de départ</label>
              <select className={inputCls} value={villeDepart} onChange={(e) => setVilleDepart(e.target.value)}>
                <option value="">Choisir…</option>
                {KONNEKT_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Ville d'arrivée</label>
              <select className={inputCls} value={villeArrivee} onChange={(e) => setVilleArrivee(e.target.value)}>
                <option value="">Choisir…</option>
                {KONNEKT_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Mes tarifs — privé, jamais exposé aux clients */}
          <div className="rounded-xl p-3 space-y-3" style={{ backgroundColor: "rgba(10,22,40,0.04)" }}>
            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: NAVY }}>
              <Wallet className="w-3.5 h-3.5" /> Mes tarifs
              <span className="ml-auto text-[10px] font-medium text-black/40">privé</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Prix au kg</label><input type="number" className={inputCls} value={prixKg} onChange={(e) => setPrixKg(e.target.value)} /></div>
              <div><label className={labelCls}>Forfait minimum</label><input type="number" className={inputCls} value={forfaitMin} onChange={(e) => setForfaitMin(e.target.value)} /></div>
            </div>
            <div>
              <label className={labelCls}>Devise</label>
              <select className={inputCls} value={devise} onChange={(e) => setDevise(e.target.value)}>
                {KONNEKT_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-5">
          <button onClick={onClose} className="flex-1 rounded-xl py-3 font-semibold text-sm border" style={{ borderColor: "#E5E7EB", color: "#6B7280" }}>Annuler</button>
          <button onClick={save} disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50" style={{ backgroundColor: NAVY }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Enregistrer <Check className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
