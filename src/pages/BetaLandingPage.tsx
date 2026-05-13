/**
 * /beta — Konnekt beta registration (light corporate redesign)
 *
 * - Reads `?ref=GPxxxx` to pre-fill from gp_profiles
 * - Inline per-field validation
 * - Calls beta-register edge function
 * - On success: success card + auto-redirect to /t/dashboard
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Loader2, Check, ArrowRight, ArrowLeft, ShieldCheck,
  Truck, Briefcase, Building2, Users,
  Luggage, Plane, Ship, Zap, Bike, Car,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* ───────── Data ───────── */

const CITIES = ["Dakar", "Thiès", "Saint-Louis", "Ziguinchor", "Kaolack", "Touba", "Mbour", "Autre"];

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

type RoleId = typeof ROLES[number]["id"];

/* ───────── Helpers ───────── */

function cleanPhone(v: string) {
  const t = v.trim();
  const plus = t.startsWith("+") ? "+" : "";
  return plus + t.replace(/[^\d]/g, "");
}

type Errors = Partial<Record<"first" | "last" | "phone" | "city" | "role" | "modes" | "pwd" | "pwd2", string>>;

/* ───────── Page ───────── */

export default function BetaLandingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ref = (params.get("ref") || "").trim();
  const refClean = ref.replace(/^GP/i, "").toLowerCase();
  const hasRef = /^[0-9a-f]{4,8}$/.test(refClean);

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [phone, setPhone] = useState("+221 ");
  const [whatsapp, setWhatsapp] = useState("");
  const [role, setRole] = useState<RoleId | "">("");
  const [city, setCity] = useState("Dakar");
  const [modes, setModes] = useState<string[]>([]);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const [resultRef, setResultRef] = useState<string>("");
  const [redirectIn, setRedirectIn] = useState(5);
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
    document.title = hasRef ? "Konnekt Bêta — Bienvenue partenaire" : "Konnekt — Rejoindre la bêta";
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
    if (pwd.length < 6) e.pwd = "Au moins 6 caractères";
    if (pwd2 !== pwd) e.pwd2 = "Ne correspond pas";
    return e;
  }, [first, last, phone, city, role, modes, pwd, pwd2]);

  const valid = Object.keys(errors).length === 0;

  const toggleMode = (id: string) => {
    setModes((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  };

  const showErr = (k: keyof Errors) => (touched[k] || touched.__submit) && errors[k];

  const submit = async () => {
    setTouched((t) => ({ ...t, __submit: true }));
    setServerError(null);
    if (!valid) {
      // scroll to first error
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
          modes,
          role,
          password: pwd,
          source: hasRef ? "whatsapp_partner" : "beta_landing",
        },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const session = (data as any)?.session;
      if (session?.access_token && session?.refresh_token) {
        await supabase.auth.setSession(session);
      }
      setResultRef((data as any)?.gp_ref || refClean.toUpperCase().slice(0, 4) || "XXXX");
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setServerError(e?.message || "Une erreur est survenue. Réessayez dans un instant.");
    } finally {
      setSubmitting(false);
    }
  };

  /* Auto-redirect after success */
  useEffect(() => {
    if (!done) return;
    if (redirectIn <= 0) {
      navigate("/t/dashboard");
      return;
    }
    const t = setTimeout(() => setRedirectIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [done, redirectIn, navigate]);

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
            Bêta
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
                  Recevez plus de missions.<br />
                  <span className="text-primary">Partout au Sénégal.</span>
                </h1>
                <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">
                  Konnekt connecte les transporteurs vérifiés aux particuliers et entreprises qui ont besoin d'eux.
                </p>
                <div className="flex items-center justify-center gap-4 mt-5 text-xs text-muted-foreground">
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

                {/* Zone */}
                <Field label="Zone d'activité" required error={showErr("city") ? errors.city : undefined}>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, city: true }))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
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

                {/* Mot de passe */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Mot de passe" required hint="Min. 6 caractères" error={showErr("pwd") ? errors.pwd : undefined}>
                    <KInput value={pwd} onChange={setPwd} onBlur={() => setTouched((t) => ({ ...t, pwd: true }))} type="password" placeholder="••••••" invalid={!!showErr("pwd")} />
                  </Field>
                  <Field label="Confirmer" required error={showErr("pwd2") ? errors.pwd2 : undefined}>
                    <KInput value={pwd2} onChange={setPwd2} onBlur={() => setTouched((t) => ({ ...t, pwd2: true }))} type="password" placeholder="••••••" invalid={!!showErr("pwd2")} />
                  </Field>
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
                  {hasRef ? "Activer mon compte Konnekt" : "Rejoindre la bêta"}
                  {!submitting && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-center text-xs text-muted-foreground mt-6">
                Déjà inscrit ?{" "}
                <Link to="/auth" className="text-primary hover:underline font-medium">Se connecter</Link>
              </p>
            </>
          ) : (
            <SuccessBlock firstName={first} gpRef={resultRef} hasRef={hasRef} redirectIn={redirectIn} onSkip={() => navigate("/t/dashboard")} />
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

function SuccessBlock({
  firstName, gpRef, hasRef, redirectIn, onSkip,
}: {
  firstName: string;
  gpRef: string;
  hasRef: boolean;
  redirectIn: number;
  onSkip: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-7 text-center shadow-sm">
      <div className="flex justify-center mb-5">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 grid place-items-center">
          <Check className="w-8 h-8 text-primary" strokeWidth={2.5} />
        </div>
      </div>
      <h2 className="text-2xl font-bold tracking-tight">
        {hasRef ? `Bienvenue, ${firstName} !` : "Inscription confirmée !"}
      </h2>
      <p className="text-sm text-muted-foreground mt-3 max-w-sm mx-auto leading-relaxed">
        {hasRef
          ? "Votre compte Konnekt est actif. Retrouvez vos missions Yobbanté directement dans l'application."
          : "Vous êtes parmi les premiers transporteurs sur la plateforme. Bienvenue !"}
      </p>

      {gpRef && (
        <div className="mt-5 inline-flex items-center gap-2 bg-muted border border-border rounded-full px-3 py-1.5 text-xs">
          <span className="text-muted-foreground">Réf.</span>
          <span className="font-mono font-semibold text-foreground">GP{gpRef}</span>
        </div>
      )}

      <button
        onClick={onSkip}
        className="w-full mt-6 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg py-3.5 font-semibold text-sm shadow-md transition-colors"
      >
        Accéder à mon tableau de bord <ArrowRight className="w-4 h-4" />
      </button>

      <p className="text-xs text-muted-foreground mt-4">
        Redirection automatique dans <span className="font-semibold text-foreground">{redirectIn}s</span>…
      </p>
    </div>
  );
}
