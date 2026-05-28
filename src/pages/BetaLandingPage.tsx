/**
 * /beta — Konnekt beta registration (light corporate redesign, no password)
 *
 * - Reads `?ref=GPxxxx` to pre-fill from gp_profiles
 * - Pas de mot de passe : l'identifiant est le téléphone, activation par
 *   notre équipe via WhatsApp dans les 24h.
 * - Inline per-field validation
 * - Calls beta-register edge function (un mot de passe aléatoire est généré
 *   côté client pour rester compatible avec le backend existant)
 * - On success: page de confirmation WhatsApp (pas de redirection auto)
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Loader2, Check, ArrowRight, ArrowLeft, ShieldCheck, MessageCircle,
  Truck, Briefcase, Building2, Users, Phone,
  Luggage, Plane, Ship, Zap, Bike, Car,
  Clock, Smartphone, Package,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PhoneCountrySelect, buildFullPhone } from "@/components/PhoneCountrySelect";
import { detectDefaultCountry, currencyFromPhone } from "@/lib/phoneCurrency";

/* ───────── Data ───────── */

const CITY_GROUPS: { label: string; cities: string[] }[] = [
  {
    label: "Europe",
    cities: [
      "Paris", "Lyon", "Marseille", "Bordeaux",
      "Madrid", "Barcelone", "Rome", "Milan",
      "Bruxelles", "Amsterdam", "Genève",
      "Londres", "Lisbonne",
    ],
  },
  {
    label: "Amérique",
    cities: ["New York", "Montréal", "Toronto", "Washington DC", "Miami"],
  },
  {
    label: "Afrique (hors Sénégal)",
    cities: ["Abidjan", "Conakry", "Bamako", "Douala", "Libreville"],
  },
  {
    label: "Sénégal",
    cities: ["Dakar", "Thiès", "Saint-Louis", "Ziguinchor", "Kaolack", "Touba", "Mbour"],
  },
];
const ALL_CITIES = [...CITY_GROUPS.flatMap((g) => g.cities), "Autre"];

const ROLES = [
  { id: "gp",          label: "GP / Voyageur",      sub: "Bagages accompagnés",     icon: Briefcase },
  { id: "transporteur", label: "Transporteur Pro", sub: "Routier, maritime, aérien", icon: Truck },
  { id: "client",      label: "Particulier",        sub: "J'envoie des colis",       icon: Users },
  { id: "entreprise",  label: "Entreprise",         sub: "Logistique B2B",           icon: Building2 },
] as const;

const MODES = [
  { id: "bagages_international", label: "GP Bagages",   icon: Luggage },
  { id: "routier",               label: "Routier",      icon: Truck },
  { id: "aerien",                label: "Aérien",       icon: Plane },
  { id: "maritime",              label: "Maritime",     icon: Ship },
  { id: "express",               label: "Coursier",     icon: Zap },
  { id: "moto",                  label: "Moto",         icon: Bike },
  { id: "mobility",              label: "Mobility",     icon: Car },
];

const KONNEKT_WA = "221781221891";
const KONNEKT_TEL = "+221 78 460 40 03";

type RoleId = typeof ROLES[number]["id"];

/* ───────── Helpers ───────── */

function cleanPhone(v: string) {
  const t = v.trim();
  const plus = t.startsWith("+") ? "+" : "";
  return plus + t.replace(/[^\d]/g, "");
}

function randomPassword() {
  // Mot de passe aléatoire interne (l'utilisateur ne s'en sert jamais)
  const a = crypto.getRandomValues(new Uint8Array(18));
  return "K!" + Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 22);
}

type Errors = Partial<Record<"first" | "last" | "phone" | "city" | "role" | "modes", string>>;

/* ───────── Page ───────── */

export default function BetaLandingPage() {
  const [params] = useSearchParams();
  const ref = (params.get("ref") || "").trim();
  const refClean = ref.replace(/^GP/i, "").toLowerCase();
  const hasRef = /^[0-9a-f]{4,8}$/.test(refClean);

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<string>(() => detectDefaultCountry());
  const [phoneLocal, setPhoneLocal] = useState("");
  const [whatsappCountry, setWhatsappCountry] = useState<string>(() => detectDefaultCountry());
  const [whatsappLocal, setWhatsappLocal] = useState("");
  const [role, setRole] = useState<RoleId | "">("");
  const [city, setCity] = useState("Dakar");
  const [citiesServed, setCitiesServed] = useState("");
  const [modes, setModes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const initialized = useRef(false);

  /* Force light mode while on /beta */
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    const removed: string[] = [];
    ["theme-admin", "theme-transporter", "theme-client", "theme-routier", "theme-maritime", "theme-aerien"].forEach((c) => {
      if (root.classList.contains(c)) { removed.push(c); root.classList.remove(c); }
    });
    root.classList.remove("dark");
    return () => {
      if (hadDark) root.classList.add("dark");
      removed.forEach((c) => root.classList.add(c));
    };
  }, []);

  /* Pre-fill from existing GP record when ref is present */
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    document.title = hasRef ? "Konnekt Bêta — Bienvenue partenaire" : "Konnekt — Rejoindre";
    if (!hasRef) return;
    void (async () => {
      const { data } = await supabase
        .from("gp_profiles")
        .select("id, business_name, phone, whatsapp, city")
        .ilike("id", `${refClean}%`)
        .limit(1)
        .maybeSingle();
      if (data) {
        const name: string = (data as any).business_name || "";
        const [f, ...rest] = name.split(/\s+/);
        if (f) setFirst((s) => s || f);
        if (rest.length) setLast((s) => s || rest.join(" "));
        if ((data as any).phone) setPhone((p) => (p === "+221 " ? (data as any).phone : p));
        if ((data as any).whatsapp) setWhatsapp((w) => w || (data as any).whatsapp);
        if ((data as any).city) setCity((data as any).city);
        setRole("gp");
        setModes(["bagages_international"]);
      }
    })();
  }, [hasRef, refClean]);

  const refLabel = useMemo(() => (hasRef ? `GP${refClean.toUpperCase().slice(0, 4)}` : ""), [hasRef, refClean]);

  /* Validation */
  const errors = useMemo<Errors>(() => {
    const e: Errors = {};
    if (first.trim().length < 2) e.first = "Au moins 2 caractères";
    if (last.trim().length < 1) e.last = "Requis";
    if (phone.replace(/\D/g, "").length < 8) e.phone = "Numéro invalide (min. 8 chiffres)";
    if (!city) e.city = "Sélectionnez une ville";
    if (!role) e.role = "Sélectionnez un rôle";
    if (modes.length === 0) e.modes = "Choisissez au moins un mode";
    return e;
  }, [first, last, phone, city, role, modes]);

  const valid = Object.keys(errors).length === 0;

  const toggleMode = (id: string) => {
    setModes((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  };

  const showErr = (k: keyof Errors) => (touched[k] || touched.__submit) && errors[k];

  const submit = async () => {
    setTouched((t) => ({ ...t, __submit: true }));
    setServerError(null);
    if (!valid) {
      const el = document.querySelector("[data-error='1']");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("beta-register", {
        body: {
          ref: hasRef ? refClean : null,
          first_name: first.trim(),
          last_name: last.trim(),
          phone: phone.trim(),
          whatsapp: whatsapp.trim() || phone.trim(),
          city,
          cities_served: citiesServed.trim() || null,
          modes,
          role,
          password: randomPassword(), // jamais montré à l'utilisateur
          source: hasRef ? "whatsapp_partner" : "beta_landing",
        },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setServerError(e?.message || "Une erreur est survenue. Réessayez dans un instant.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border safe-area-x">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            <span className="w-7 h-7 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold text-sm">K</span>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-[15px] tracking-tight">KONNEKT</span>
              <span className="text-[10px] text-muted-foreground">by Yobbanté</span>
            </div>
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold border border-primary/30 bg-primary/10 text-primary rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Accès prioritaire
          </span>
        </div>
      </header>

      <main className="px-4 py-10 md:py-14">
        <div className="max-w-xl mx-auto">
          {!done ? (
            <>
              {/* HERO */}
              <section className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                  Recevez vos missions{" "}
                  <span className="text-primary">Yobbanté</span> ici.
                </h1>
                <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">
                  Inscription en 2 minutes. Notre équipe vous active sur WhatsApp dans les 24h.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> Gratuit</span>
                  <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> 2 minutes</span>
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> Sécurisé</span>
                </div>
              </section>

              {/* CARD */}
              <div className="bg-card border border-border rounded-2xl p-5 md:p-7 shadow-sm">
                {hasRef && (
                  <div className="flex items-start gap-3 mb-6 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
                    <ShieldCheck className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-foreground">Partenaire vérifié · {refLabel}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Vos informations sont pré-remplies.</div>
                    </div>
                  </div>
                )}

                {/* Nom */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prénom" required error={showErr("first") ? errors.first : undefined}>
                    <KInput value={first} onChange={setFirst} onBlur={() => setTouched((t) => ({ ...t, first: true }))} placeholder="Ibrahima" invalid={!!showErr("first")} />
                  </Field>
                  <Field label="Nom" required error={showErr("last") ? errors.last : undefined}>
                    <KInput value={last} onChange={setLast} onBlur={() => setTouched((t) => ({ ...t, last: true }))} placeholder="Fall" invalid={!!showErr("last")} />
                  </Field>
                </div>

                {/* Téléphone */}
                <Field label="Téléphone" required hint="Sera votre identifiant Konnekt" error={showErr("phone") ? errors.phone : undefined}>
                  <KInput
                    value={phone}
                    onChange={(v) => setPhone(cleanPhone(v))}
                    onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                    placeholder="+221 77 000 00 00"
                    type="tel"
                    invalid={!!showErr("phone")}
                  />
                </Field>

                <Field label="WhatsApp" hint="Si différent du téléphone">
                  <KInput value={whatsapp} onChange={(v) => setWhatsapp(cleanPhone(v))} placeholder="+221 76 000 00 00" type="tel" />
                </Field>

                {/* Rôle */}
                <Field label="Rôle" required error={showErr("role") ? errors.role : undefined}>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.map((r) => {
                      const Ico = r.icon;
                      const active = role === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => { setRole(r.id); setTouched((t) => ({ ...t, role: true })); }}
                          className={`text-left p-3 rounded-xl border transition-all ${
                            active
                              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                              : "border-border bg-background hover:border-foreground/30"
                          }`}
                        >
                          <Ico className={`w-4 h-4 ${active ? "text-primary" : "text-foreground"}`} strokeWidth={1.75} />
                          <div className="text-sm font-semibold mt-2">{r.label}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{r.sub}</div>
                        </button>
                      );
                    })}
                  </div>
                </Field>

                {/* Ville de base */}
                <Field
                  label="Ville de base"
                  required
                  hint="Où vous résidez principalement"
                  error={showErr("city") ? errors.city : undefined}
                >
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, city: true }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    {CITY_GROUPS.map((g) => (
                      <optgroup key={g.label} label={g.label}>
                        {g.cities.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="Autre">Autre</option>
                  </select>
                </Field>

                {/* Villes desservies */}
                <Field label="Villes desservies" hint="Séparez les villes par des virgules">
                  <KInput
                    value={citiesServed}
                    onChange={setCitiesServed}
                    placeholder="Ex : Paris, Dakar, Lyon, New York..."
                  />
                </Field>

                {/* Modes recherchés */}
                <Field label="Mode(s) recherché(s)" required hint="Sélectionnez tous ceux qui s'appliquent" error={showErr("modes") ? errors.modes : undefined}>
                  <div className="flex flex-wrap gap-2">
                    {MODES.map((m) => {
                      const Ico = m.icon;
                      const active = modes.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => { toggleMode(m.id); setTouched((t) => ({ ...t, modes: true })); }}
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground hover:border-foreground/30"
                          }`}
                        >
                          <Ico className="w-3.5 h-3.5" strokeWidth={2} />
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                {/* Bloc info — pas de mot de passe */}
                <div
                  className="mt-5 flex items-start gap-3 rounded-xl"
                  style={{ backgroundColor: "#F5F5F5", padding: "12px 20px", borderRadius: 12 }}
                >
                  <MessageCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#25D366" }} strokeWidth={2} />
                  <p className="text-xs md:text-sm text-foreground leading-relaxed">
                    Votre numéro de téléphone est votre identifiant. Pas de mot de passe —
                    nous vous envoyons un code WhatsApp pour activer votre compte.
                  </p>
                </div>

                <p className="text-[11px] text-muted-foreground mt-5 leading-relaxed">
                  En vous inscrivant, vous acceptez les{" "}
                  <a href="/cgu" className="text-primary hover:underline font-medium">conditions d'utilisation</a> de Konnekt.
                </p>

                {serverError && (
                  <div className="mt-4 bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2.5 text-sm text-destructive">
                    {serverError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="w-full mt-5 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg py-3.5 font-semibold text-sm shadow-md disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {hasRef ? "Activer mon compte Konnekt" : "Rejoindre Konnekt"}
                  {!submitting && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-center text-xs text-muted-foreground mt-6">
                Déjà inscrit ?{" "}
                <Link to="/auth" className="text-primary hover:underline font-medium">Se connecter</Link>
              </p>
            </>
          ) : (
            <ConfirmationBlock firstName={first} />
          )}
        </div>
      </main>
    </div>
  );
}

/* ───────── Subcomponents ───────── */

function Field({
  label, required, hint, error, children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4" data-error={error ? "1" : undefined}>
      <label className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-foreground">
          {label} {required && <span className="text-primary">*</span>}
        </span>
        {hint && !error && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive mt-1.5 font-medium">{error}</p>}
    </div>
  );
}

function KInput({
  value, onChange, onBlur, placeholder, type = "text", invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
  invalid?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className={`w-full bg-background rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors border focus:ring-2 ${
        invalid
          ? "border-destructive focus:ring-destructive/20 focus:border-destructive"
          : "border-border focus:ring-primary/30 focus:border-primary"
      }`}
    />
  );
}

function ConfirmationBlock({ firstName }: { firstName: string }) {
  const waText = encodeURIComponent(
    `Salam, je viens de m'inscrire sur Konnekt.\nMon prénom : ${firstName || "—"}`
  );
  return (
    <div className="bg-card border border-border rounded-2xl p-7 text-center shadow-sm">
      <div className="flex justify-center mb-5">
        <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 grid place-items-center">
          <Check className="w-10 h-10 text-primary" strokeWidth={2.5} />
        </div>
      </div>

      <h2 className="text-2xl font-bold tracking-tight">
        Inscription reçue{firstName ? `, ${firstName}` : ""} !
      </h2>

      <p className="text-sm text-muted-foreground mt-4 max-w-md mx-auto leading-relaxed">
        Notre équipe Konnekt vous contacte sur WhatsApp dans les
        <span className="font-semibold text-foreground"> 24 heures </span>
        pour activer votre compte.
      </p>

      <div className="mt-6 bg-muted/60 border border-border rounded-xl px-4 py-4 text-left">
        <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-2">
          En attendant, enregistrez ce numéro
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-bold text-foreground">+221 78 122 18 91</div>
            <div className="text-xs text-muted-foreground mt-0.5">Nom : Konnekt GP</div>
          </div>
          <a
            href={`tel:+${KONNEKT_WA}`}
            className="w-10 h-10 rounded-full bg-background border border-border grid place-items-center text-foreground hover:bg-muted transition-colors"
            aria-label="Appeler Konnekt"
          >
            <Phone className="w-4 h-4" />
          </a>
        </div>
      </div>

      <a
        href={`https://wa.me/${KONNEKT_WA}?text=${waText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full mt-5 inline-flex items-center justify-center gap-2 text-white rounded-lg py-3.5 font-semibold text-sm shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99]"
        style={{ backgroundColor: "#25D366" }}
      >
        <MessageCircle className="w-4 h-4" />
        Écrire à Konnekt sur WhatsApp
        <ArrowRight className="w-4 h-4" />
      </a>

      <p className="text-xs text-muted-foreground mt-4">
        Ou appelez-nous :{" "}
        <a href={`tel:${KONNEKT_TEL.replace(/\s/g, "")}`} className="text-foreground font-semibold hover:underline">
          {KONNEKT_TEL}
        </a>
      </p>

      {/* Timeline — Que se passe-t-il ensuite ? */}
      <NextStepsTimeline />
    </div>
  );
}

function NextStepsTimeline() {
  const steps = [
    {
      key: "now",
      label: "Immédiat",
      title: "Vous recevez un WhatsApp de confirmation sur le +221 78 122 18 91",
      Icon: Check,
      color: "#16A34A",
      bg: "#DCFCE7",
    },
    {
      key: "24h",
      label: "Sous 24h",
      title: "Notre équipe examine votre profil et active votre compte",
      Icon: Clock,
      color: "#3DAA8A",
      bg: "rgba(61,170,138,0.12)",
    },
    {
      key: "activation",
      label: "Après activation",
      title: "Vous recevez vos identifiants par WhatsApp pour vous connecter sur usekonnekt.com/gp",
      Icon: Smartphone,
      color: "#6B7280",
      bg: "#F3F4F6",
    },
    {
      key: "missions",
      label: "Missions",
      title: "Vous recevez vos premières missions directement sur WhatsApp",
      Icon: Package,
      color: "#6B7280",
      bg: "#F3F4F6",
    },
  ];
  return (
    <div className="mt-8 text-left">
      <h3 className="text-sm font-bold text-foreground mb-4">Que se passe-t-il ensuite ?</h3>
      <ol className="relative">
        <span
          aria-hidden
          className="absolute left-[15px] top-2 bottom-2 w-px bg-border"
        />
        {steps.map((s, i) => {
          const { Icon } = s;
          return (
            <li key={s.key} className={`relative flex gap-3 ${i === steps.length - 1 ? "" : "pb-5"}`}>
              <div
                className="relative z-10 w-8 h-8 rounded-full grid place-items-center flex-shrink-0 border"
                style={{ backgroundColor: s.bg, borderColor: s.color }}
              >
                <Icon className="w-4 h-4" style={{ color: s.color }} strokeWidth={2.25} />
              </div>
              <div className="flex-1 pt-0.5">
                <div
                  className="text-[10px] uppercase tracking-widest font-semibold mb-0.5"
                  style={{ color: s.color }}
                >
                  Étape {i + 1} · {s.label}
                </div>
                <p className="text-sm text-foreground leading-snug">{s.title}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
