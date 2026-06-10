/**
 * GPDirectDashboard — Mini dashboard GP beta (accès par lien direct)
 *
 * URL : /gp/[ref_gp]  (ex: /gp/GP4346)
 * Source unique : table `transporteurs` (aucun gp_profiles, aucune auth).
 *
 * Accès :
 *  - ref introuvable           → redirect /onboarding/[ref]
 *  - trouvé mais bot pas actif  → redirect /onboarding/[ref] ("Finalisez d'abord")
 *  - trouvé et actif            → dashboard (avec wizard 1ère visite)
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, MessageCircle, MapPin, Plane, Package, Wallet, User,
  Plus, Pencil, Trash2, ArrowRight, ArrowLeft, Check, Calendar, Scale, Coins,
} from "lucide-react";

const TEAL = "#0D9488";
const TEAL_DARK = "#0F766E";
const GREEN_WA = "#25D366";
const KONNEKT_WA = "221789269756";
const SUPPORT_TEL = "+221 78 926 97 56";

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
  beta_notes_conditions: string | null;
}

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

const inputCls =
  "w-full rounded-lg border border-black/15 px-3 py-2.5 text-sm outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20";
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

function KonnektHeader() {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-black/5">
      <div className="max-w-md mx-auto flex items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-md grid place-items-center font-bold text-sm text-white" style={{ backgroundColor: TEAL }}>K</span>
          <div className="flex flex-col leading-none">
            <span className="font-bold text-[15px] tracking-tight">KONNEKT</span>
            <span className="text-[10px] text-black/50">Espace GP</span>
          </div>
        </div>
        <a href={`https://wa.me/${KONNEKT_WA}`} target="_blank" rel="noopener noreferrer"
          className="text-[11px] font-semibold text-white px-3 py-1.5 rounded-full inline-flex items-center gap-1.5" style={{ backgroundColor: GREEN_WA }}>
          <MessageCircle className="w-3.5 h-3.5" /> Aide
        </a>
      </div>
    </header>
  );
}

function BetaBanner() {
  return (
    <div className="px-4 py-2 text-center text-[12px] font-medium" style={{ backgroundColor: "#ECFDF5", color: TEAL_DARK }}>
      🚧 Version beta — Vos données seront migrées vers votre espace complet.
    </div>
  );
}

export default function GPDirectDashboard({ refGp }: { refGp: string }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
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
      const { data, error } = await supabase
        .from("transporteurs")
        .select("id, reference, prenom, nom, telephone_1, navettes, residence_city, whatsapp_confirmed_at, beta_wizard_completed_at, beta_tarif_defaut, beta_notes_conditions")
        .ilike("reference", refGp)
        .maybeSingle();
      if (!active) return;

      if (error || !data) {
        navigate(`/onboarding/${refGp}`, { replace: true });
        return;
      }
      const t = data as Transporteur;
      if (!t.whatsapp_confirmed_at) {
        navigate(`/onboarding/${refGp}?finalize=1`, { replace: true });
        return;
      }
      setGp(t);
      await loadDeparturesAndMissions(t.reference);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [refGp, navigate, loadDeparturesAndMissions]);

  const refreshGp = useCallback(async () => {
    const { data } = await supabase
      .from("transporteurs")
      .select("id, reference, prenom, nom, telephone_1, navettes, residence_city, whatsapp_confirmed_at, beta_wizard_completed_at, beta_tarif_defaut, beta_notes_conditions")
      .ilike("reference", refGp)
      .maybeSingle();
    if (data) setGp(data as Transporteur);
  }, [refGp]);

  if (loading || !gp) {
    return (
      <div className="min-h-screen grid place-items-center bg-white">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: TEAL }} />
      </div>
    );
  }

  if (!gp.beta_wizard_completed_at) {
    return (
      <BetaWizard
        gp={gp}
        onReloadDepartures={() => loadDeparturesAndMissions(gp.reference)}
        onDone={async () => { await refreshGp(); await loadDeparturesAndMissions(gp.reference); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#0D1B2A] font-sans">
      <Helmet>
        <title>Konnekt GP — Mon espace</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <KonnektHeader />
      <BetaBanner />

      <main className="px-4 py-5 max-w-md mx-auto space-y-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: TEAL }}>
            <User className="w-4 h-4" /> {gp.reference}
          </div>
          <h1 className="text-xl font-bold tracking-tight mt-1">
            Bonjour {gp.prenom || ""} 👋
          </h1>
        </div>

        <DeparturesSection
          gp={gp}
          departures={departures}
          onChanged={() => loadDeparturesAndMissions(gp.reference)}
        />
        <MissionsSection missions={missions} />
        <PaymentsSection />
        <ProfileSection gp={gp} onSaved={refreshGp} />

        <p className="text-center text-xs text-black/50 pt-2">
          Une question ?{" "}
          <a href={`tel:${KONNEKT_WA}`} className="font-semibold" style={{ color: TEAL }}>{SUPPORT_TEL}</a>
        </p>
      </main>
    </div>
  );
}

/* ─────────────────────────  WIZARD  ───────────────────────── */

function BetaWizard({
  gp, onDone, onReloadDepartures,
}: {
  gp: Transporteur;
  onDone: () => void | Promise<void>;
  onReloadDepartures: () => void | Promise<void>;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);

  // Step 1 — profil
  const [prenom, setPrenom] = useState(gp.prenom || "");
  const [nom, setNom] = useState(gp.nom || "");
  const [residence, setResidence] = useState(gp.residence_city || "");

  // Step 2 — premier départ
  const [villeDepart, setVilleDepart] = useState(gp.residence_city || "");
  const [villeArrivee, setVilleArrivee] = useState("");
  const [dateDepart, setDateDepart] = useState("");
  const [capacite, setCapacite] = useState("");
  const [tarifDepart, setTarifDepart] = useState("");

  // Step 3 — tarifs
  const [tarifDefaut, setTarifDefaut] = useState(gp.beta_tarif_defaut ? String(gp.beta_tarif_defaut) : "");
  const [notes, setNotes] = useState(gp.beta_notes_conditions || "");

  const saveStep1 = async () => {
    setSaving(true);
    await supabase.from("transporteurs")
      .update({ prenom: prenom.trim(), nom: nom.trim(), residence_city: residence.trim() })
      .eq("id", gp.id);
    setSaving(false);
    if (!villeDepart) setVilleDepart(residence.trim());
    setStep(2);
  };

  const saveStep2 = async (skip: boolean) => {
    if (!skip) {
      setSaving(true);
      await supabase.from("manual_departures").insert({
        gp_reference: gp.reference,
        ville_depart: villeDepart.trim() || residence.trim(),
        ville_arrivee: villeArrivee.trim(),
        destination: villeArrivee.trim(),
        date_depart: dateDepart || null,
        capacite_kg: capacite ? Number(capacite) : null,
        poids_kg: capacite ? Number(capacite) : null,
        tarif_par_kg: tarifDepart ? Number(tarifDepart) : null,
        currency: "XOF",
        source: "gp_dashboard_beta",
      });
      await onReloadDepartures();
      setSaving(false);
    }
    setStep(3);
  };

  const saveStep3 = async () => {
    setSaving(true);
    await supabase.from("transporteurs").update({
      beta_tarif_defaut: tarifDefaut ? Number(tarifDefaut) : null,
      beta_notes_conditions: notes.trim() || null,
      beta_wizard_completed_at: new Date().toISOString(),
    }).eq("id", gp.id);
    setSaving(false);
    await onDone();
  };

  return (
    <div className="min-h-screen bg-white text-[#0D1B2A] font-sans">
      <Helmet><title>Konnekt GP — Bienvenue</title><meta name="robots" content="noindex,nofollow" /></Helmet>
      <KonnektHeader />
      <BetaBanner />

      <main className="px-4 py-6 max-w-md mx-auto">
        {/* Stepper */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: s <= step ? TEAL : "#E5E7EB" }} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Mon profil</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Prénom</label><input className={inputCls} value={prenom} onChange={(e) => setPrenom(e.target.value)} /></div>
              <div><label className={labelCls}>Nom</label><input className={inputCls} value={nom} onChange={(e) => setNom(e.target.value)} /></div>
            </div>
            <div><label className={labelCls}>Ville de résidence principale</label><input className={inputCls} value={residence} onChange={(e) => setResidence(e.target.value)} placeholder="Dakar" /></div>
            <div>
              <label className={labelCls}>Téléphone</label>
              <input className={`${inputCls} bg-black/[0.03] text-black/60`} value={gp.telephone_1 || ""} disabled />
            </div>
            <button onClick={saveStep1} disabled={saving || prenom.trim().length < 2 || !residence.trim()}
              className="w-full inline-flex items-center justify-center gap-2 text-white rounded-lg py-3.5 font-semibold text-sm disabled:opacity-50" style={{ backgroundColor: TEAL }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continuer <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Mon premier départ</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Ville de départ</label><input className={inputCls} value={villeDepart} onChange={(e) => setVilleDepart(e.target.value)} placeholder="Dakar" /></div>
              <div><label className={labelCls}>Ville d'arrivée</label><input className={inputCls} value={villeArrivee} onChange={(e) => setVilleArrivee(e.target.value)} placeholder="Paris" /></div>
            </div>
            <div><label className={labelCls}>Date de départ</label><input type="date" className={inputCls} value={dateDepart} onChange={(e) => setDateDepart(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Capacité (kg)</label><input type="number" className={inputCls} value={capacite} onChange={(e) => setCapacite(e.target.value)} placeholder="20" /></div>
              <div><label className={labelCls}>Tarif / kg (FCFA)</label><input type="number" className={inputCls} value={tarifDepart} onChange={(e) => setTarifDepart(e.target.value)} placeholder="5000" /></div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={() => saveStep2(true)} className="flex-1 rounded-lg py-3 font-semibold text-sm border" style={{ borderColor: "#E5E7EB", color: "#6B7280" }}>Passer →</button>
              <button onClick={() => saveStep2(false)} disabled={saving || !villeArrivee.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 text-white rounded-lg py-3 font-semibold text-sm disabled:opacity-50" style={{ backgroundColor: TEAL }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continuer <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Mes tarifs</h2>
            <div><label className={labelCls}>Tarif par défaut (FCFA / kg)</label><input type="number" className={inputCls} value={tarifDefaut} onChange={(e) => setTarifDefaut(e.target.value)} placeholder="5000" /></div>
            <div><label className={labelCls}>Notes / conditions</label><textarea rows={4} className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex : objets fragiles acceptés, paiement à la livraison…" /></div>
            <button onClick={saveStep3} disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 text-white rounded-lg py-3.5 font-semibold text-sm disabled:opacity-50" style={{ backgroundColor: TEAL }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Accéder à mon espace <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

/* ─────────────────────────  SECTIONS  ───────────────────────── */

function SectionCard({ icon, title, action, children }: { icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-black/10 rounded-2xl p-4 shadow-sm">
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
      icon={<Plane className="w-4 h-4" style={{ color: TEAL }} />}
      title="Mes départs"
      action={
        <button onClick={() => setEditing("new")} className="text-xs font-semibold inline-flex items-center gap-1" style={{ color: TEAL }}>
          <Plus className="w-3.5 h-3.5" /> Ajouter
        </button>
      }
    >
      {departures.length === 0 ? (
        <p className="text-sm text-black/50">Aucun départ enregistré.</p>
      ) : (
        <ul className="space-y-2">
          {departures.map((d) => (
            <li key={d.id} className="rounded-lg px-3 py-2.5 flex items-center justify-between gap-2" style={{ backgroundColor: "rgba(13,148,136,0.05)" }}>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-medium truncate">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: TEAL }} />
                  {(d.ville_depart || "—")} → {(d.ville_arrivee || d.destination || "—")}
                </div>
                <div className="text-[11px] text-black/50 mt-0.5">
                  {d.date_depart || "Date non définie"}
                  {d.capacite_kg || d.poids_kg ? ` · ${d.capacite_kg ?? d.poids_kg} kg` : ""}
                  {d.tarif_par_kg ? ` · ${d.tarif_par_kg} FCFA/kg` : ""}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setEditing(d)} className="p-1.5 rounded-md hover:bg-black/5"><Pencil className="w-3.5 h-3.5 text-black/50" /></button>
                <button
                  onClick={async () => { await supabase.from("manual_departures").delete().eq("id", d.id); await onChanged(); }}
                  className="p-1.5 rounded-md hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" style={{ color: "#DC2626" }} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

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
  const [dateDepart, setDateDepart] = useState(departure?.date_depart || "");
  const [capacite, setCapacite] = useState(departure?.capacite_kg != null ? String(departure.capacite_kg) : (departure?.poids_kg != null ? String(departure.poids_kg) : ""));
  const [tarif, setTarif] = useState(departure?.tarif_par_kg != null ? String(departure.tarif_par_kg) : (gp.beta_tarif_defaut ? String(gp.beta_tarif_defaut) : ""));
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
      tarif_par_kg: tarif ? Number(tarif) : null,
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
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Capacité (kg)</label><input type="number" className={inputCls} value={capacite} onChange={(e) => setCapacite(e.target.value)} /></div>
            <div><label className={labelCls}>Tarif/kg (FCFA)</label><input type="number" className={inputCls} value={tarif} onChange={(e) => setTarif(e.target.value)} /></div>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-5">
          <button onClick={onClose} className="flex-1 rounded-lg py-3 font-semibold text-sm border" style={{ borderColor: "#E5E7EB", color: "#6B7280" }}>Annuler</button>
          <button onClick={save} disabled={saving || !villeArrivee.trim()} className="flex-1 inline-flex items-center justify-center gap-2 text-white rounded-lg py-3 font-semibold text-sm disabled:opacity-50" style={{ backgroundColor: TEAL }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Enregistrer <Check className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

function MissionsSection({ missions }: { missions: Mission[] }) {
  return (
    <SectionCard icon={<Package className="w-4 h-4" style={{ color: TEAL }} />} title="Mes missions">
      {missions.length === 0 ? (
        <p className="text-sm text-black/50">Aucune mission en cours.</p>
      ) : (
        <ul className="space-y-2">
          {missions.map((m) => (
            <li key={m.id} className="rounded-lg px-3 py-2.5 border border-black/5">
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
  return (
    <SectionCard icon={<Wallet className="w-4 h-4" style={{ color: TEAL }} />} title="Mes paiements">
      <div className="rounded-lg px-3 py-3 flex items-center justify-between" style={{ backgroundColor: "rgba(13,148,136,0.05)" }}>
        <span className="text-sm text-black/60">Solde en attente</span>
        <span className="text-base font-bold">0 FCFA</span>
      </div>
      <p className="text-sm text-black/50 mt-3">Aucun paiement pour le moment.</p>
    </SectionCard>
  );
}

function ProfileSection({ gp, onSaved }: { gp: Transporteur; onSaved: () => void | Promise<void> }) {
  const [residence, setResidence] = useState(gp.residence_city || "");
  const [tarif, setTarif] = useState(gp.beta_tarif_defaut ? String(gp.beta_tarif_defaut) : "");
  const [notes, setNotes] = useState(gp.beta_notes_conditions || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    await supabase.from("transporteurs").update({
      residence_city: residence.trim() || null,
      beta_tarif_defaut: tarif ? Number(tarif) : null,
      beta_notes_conditions: notes.trim() || null,
    }).eq("id", gp.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await onSaved();
  };

  return (
    <SectionCard icon={<User className="w-4 h-4" style={{ color: TEAL }} />} title="Mon profil">
      <div className="space-y-3">
        <div><label className={labelCls}>Ville de résidence</label><input className={inputCls} value={residence} onChange={(e) => setResidence(e.target.value)} /></div>
        <div><label className={labelCls}>Tarif par défaut (FCFA / kg)</label><input type="number" className={inputCls} value={tarif} onChange={(e) => setTarif(e.target.value)} /></div>
        <div><label className={labelCls}>Notes / conditions</label><textarea rows={3} className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <button onClick={save} disabled={saving} className="w-full inline-flex items-center justify-center gap-2 text-white rounded-lg py-3 font-semibold text-sm disabled:opacity-50" style={{ backgroundColor: TEAL }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <>Enregistré <Check className="w-4 h-4" /></> : "Enregistrer"}
        </button>
      </div>
    </SectionCard>
  );
}
