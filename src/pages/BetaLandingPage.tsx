/**
 * /beta — Konnekt premium beta landing.
 *
 * Accessed via WhatsApp links sent to existing partner GPs.
 * Reads `?ref=GPxxxx` to pre-fill the form from an existing gp_profiles record.
 * Without a ref, the page falls back to a public waitlist registration.
 *
 * Visual system follows the spec exactly (#080808 / #F5C518 / #3B82F6,
 * DM Sans + DM Mono). Self-contained: no app navigation chrome.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Check, Copy, ArrowRight, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PALETTE = {
  bg: "#080808",
  card: "#111111",
  border: "#1E1E1E",
  borderSoft: "#2A2A2A",
  surface: "#161616",
  yellow: "#F5C518",
  blue: "#3B82F6",
  green: "#22C55E",
  text: "#FFFFFF",
  text2: "#AAAAAA",
  muted: "#555555",
};

const CITIES = ["Dakar", "Thiès", "Saint-Louis", "Ziguinchor", "Kaolack", "Touba", "Autre"];
const MODES: Array<{ id: string; label: string }> = [
  { id: "voiture", label: "Voiture" },
  { id: "moto", label: "Moto" },
  { id: "camionnette", label: "Camionnette" },
  { id: "camion", label: "Camion" },
  { id: "van", label: "Van" },
];

function cleanPhone(v: string) {
  const t = v.trim();
  const plus = t.startsWith("+") ? "+" : "";
  return plus + t.replace(/[^\d]/g, "");
}

export default function BetaLandingPage() {
  const [params] = useSearchParams();
  const ref = (params.get("ref") || "").trim();
  const refClean = ref.replace(/^GP/i, "").toLowerCase();
  const hasRef = /^[0-9a-f]{4,8}$/.test(refClean);

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [phone, setPhone] = useState("+221 ");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("Dakar");
  const [modes, setModes] = useState<string[]>(["voiture"]);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [resultRef, setResultRef] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const initialized = useRef(false);

  // Pre-fill from existing GP record when ref is present
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    document.title = hasRef ? "Konnekt Bêta — Bienvenue partenaire" : "Konnekt — Liste d'attente";
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
      }
    })();
  }, [hasRef, refClean]);

  const refLabel = useMemo(() => (hasRef ? `GP${refClean.toUpperCase().slice(0, 4)}` : ""), [hasRef, refClean]);

  const toggleMode = (id: string) => {
    setModes((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  };

  const valid = useMemo(() => {
    return (
      first.trim().length >= 2 &&
      last.trim().length >= 1 &&
      phone.replace(/\D/g, "").length >= 8 &&
      city &&
      modes.length > 0 &&
      pwd.length >= 6 &&
      pwd === pwd2
    );
  }, [first, last, phone, city, modes, pwd, pwd2]);

  const submit = async () => {
    setError(null);
    if (!valid) {
      setError(
        pwd !== pwd2
          ? "Les mots de passe ne correspondent pas."
          : "Vérifiez vos informations (téléphone, mot de passe ≥ 6 caractères, mode de transport).",
      );
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
          password: pwd,
          source: hasRef ? "whatsapp_partner" : "waitlist",
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
      setError(e?.message || "Erreur. Réessayez dans un instant.");
    } finally {
      setSubmitting(false);
    }
  };

  const referralLink = `${typeof window !== "undefined" ? window.location.origin : ""}/beta?ref=GP${resultRef}`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  };

  return (
    <div
      style={{ background: PALETTE.bg, color: PALETTE.text, fontFamily: "'DM Sans', system-ui, sans-serif", minHeight: "100vh" }}
      className="px-5 pt-10 pb-16"
    >
      {/* Inject DM Sans / DM Mono once */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;700;800&display=swap');
        .dm-mono { font-family: 'DM Mono', ui-monospace, monospace; }
      `}</style>

      <div className="max-w-md mx-auto">
        {/* HEADER */}
        <header className="text-center mb-8">
          <div className="flex flex-col items-center">
            <h1
              style={{ letterSpacing: "-0.03em", fontWeight: 800, fontSize: 22 }}
              className="leading-none"
            >
              KONNEKT
            </h1>
            <span className="dm-mono mt-1" style={{ color: PALETTE.muted, fontSize: 11 }}>
              by Yobbanté
            </span>
          </div>
          <div className="flex justify-center mt-4">
            <span
              className="dm-mono"
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                color: PALETTE.blue,
                background: `${PALETTE.blue}15`,
                border: `1px solid ${PALETTE.blue}30`,
                borderRadius: 20,
                padding: "4px 12px",
                letterSpacing: "0.08em",
              }}
            >
              Accès Bêta Exclusif
            </span>
          </div>
        </header>

        {/* HERO */}
        {!done && (
          <section className="text-center mb-8">
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
              Recevez plus de missions.
              <br />
              Partout au Sénégal.
            </h2>
            <p style={{ color: PALETTE.text2, fontSize: 13, maxWidth: 320 }} className="mx-auto mt-3">
              Konnekt connecte les transporteurs de confiance aux particuliers et entreprises qui ont besoin d'eux.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {[
                { i: "📦", t: "Plus de missions" },
                { i: "💰", t: "Paiement rapide" },
                { i: "🛡️", t: "Assuré par défaut" },
              ].map((c) => (
                <span
                  key={c.t}
                  style={{
                    background: PALETTE.surface,
                    border: `0.5px solid ${PALETTE.borderSoft}`,
                    borderRadius: 20,
                    padding: "6px 12px",
                    fontSize: 11,
                    color: PALETTE.text2,
                  }}
                >
                  {c.i} {c.t}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* CARD */}
        <div
          style={{
            background: PALETTE.card,
            border: `0.5px solid ${PALETTE.border}`,
            borderRadius: 16,
            padding: 24,
          }}
        >
          {!done ? (
            <>
              {hasRef && (
                <div
                  className="mb-5"
                  style={{
                    background: "rgba(34,197,94,0.06)",
                    border: "1px solid rgba(34,197,94,0.2)",
                    borderRadius: 10,
                    padding: "10px 14px",
                  }}
                >
                  <div className="dm-mono" style={{ color: PALETTE.green, fontSize: 12 }}>
                    ✅ Partenaire Yobbanté vérifié · {refLabel}
                  </div>
                  <div style={{ color: PALETTE.muted, fontSize: 11 }} className="mt-0.5">
                    Vos informations sont pré-remplies.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="Prénom *">
                  <KInput value={first} onChange={setFirst} placeholder="Ibrahima" />
                </Field>
                <Field label="Nom *">
                  <KInput value={last} onChange={setLast} placeholder="Fall" />
                </Field>
              </div>

              <Field label="Téléphone *" hint="Ce numéro sera votre identifiant Konnekt">
                <KInput value={phone} onChange={(v) => setPhone(cleanPhone(v))} placeholder="+221 77 000 00 00" type="tel" />
              </Field>

              <Field label="WhatsApp (si différent)">
                <KInput value={whatsapp} onChange={(v) => setWhatsapp(cleanPhone(v))} placeholder="+221 76 000 00 00" type="tel" />
              </Field>

              <Field label="Ville principale *">
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={{
                    background: PALETTE.surface,
                    border: `0.5px solid ${PALETTE.borderSoft}`,
                    color: PALETTE.text,
                    borderRadius: 10,
                    padding: "10px 12px",
                    width: "100%",
                    fontSize: 14,
                    appearance: "none",
                  }}
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c} style={{ background: PALETTE.card }}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Modes de transport *">
                <div className="flex flex-wrap gap-2">
                  {MODES.map((m) => {
                    const active = modes.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMode(m.id)}
                        style={{
                          background: active ? `${PALETTE.blue}20` : PALETTE.surface,
                          border: `0.5px solid ${active ? PALETTE.blue : PALETTE.borderSoft}`,
                          color: active ? PALETTE.blue : PALETTE.text2,
                          borderRadius: 10,
                          padding: "8px 12px",
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        {active ? "☑" : "☐"} {m.label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Mot de passe *" hint="Min 6 caractères">
                  <KInput value={pwd} onChange={setPwd} type="password" placeholder="••••••" />
                </Field>
                <Field label="Confirmer *">
                  <KInput value={pwd2} onChange={setPwd2} type="password" placeholder="••••••" />
                </Field>
              </div>

              <p style={{ color: PALETTE.muted, fontSize: 10 }} className="mt-4">
                En vous inscrivant, vous acceptez les{" "}
                <a href="/cgu" style={{ color: PALETTE.yellow }}>
                  conditions d'utilisation
                </a>{" "}
                de Konnekt.
              </p>

              {error && (
                <div
                  className="mt-3 dm-mono"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: 10,
                    padding: "8px 12px",
                    color: "#FCA5A5",
                    fontSize: 11,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                style={{
                  background: PALETTE.yellow,
                  color: "#0A0A0A",
                  borderRadius: 10,
                  padding: "14px",
                  fontSize: 14,
                  fontWeight: 700,
                  width: "100%",
                  marginTop: 16,
                  opacity: submitting ? 0.7 : 1,
                  cursor: submitting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {hasRef ? "Rejoindre Konnekt Bêta" : "Rejoindre la liste d'attente"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <SuccessBlock
              hasRef={hasRef}
              firstName={first}
              referralLink={referralLink}
              onCopy={copyLink}
              copied={copied}
              gpRef={resultRef}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- helpers ----------------------------- */

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <label style={{ color: PALETTE.text2, fontSize: 12, fontWeight: 500 }} className="block mb-1.5">
        {label}
      </label>
      {children}
      {hint && (
        <p
          style={{ color: PALETTE.muted, fontSize: 10 }}
          className="mt-1 flex items-center gap-1"
        >
          <Info className="w-3 h-3" /> {hint}
        </p>
      )}
    </div>
  );
}

function KInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: PALETTE.surface,
        border: `0.5px solid ${PALETTE.borderSoft}`,
        color: PALETTE.text,
        borderRadius: 10,
        padding: "10px 12px",
        width: "100%",
        fontSize: 14,
        outline: "none",
      }}
    />
  );
}

function SuccessBlock({
  hasRef,
  firstName,
  referralLink,
  onCopy,
  copied,
  gpRef,
}: {
  hasRef: boolean;
  firstName: string;
  referralLink: string;
  onCopy: () => void;
  copied: boolean;
  gpRef: string;
}) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-3">
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Check className="w-7 h-7" style={{ color: PALETTE.green }} />
        </div>
      </div>
      {hasRef ? (
        <>
          <h3 style={{ fontSize: 20, fontWeight: 800 }}>
            Bienvenue sur Konnekt, {firstName} !
          </h3>
          <p style={{ color: PALETTE.text2, fontSize: 13 }} className="mt-2">
            Vous êtes parmi les premiers transporteurs sur la plateforme.
          </p>
        </>
      ) : (
        <>
          <h3 style={{ fontSize: 20, fontWeight: 800 }}>Vous êtes sur la liste d'attente</h3>
          <p style={{ color: PALETTE.text2, fontSize: 13 }} className="mt-2">
            Nous vous contactons dès l'ouverture dans votre ville.
          </p>
        </>
      )}

      <div
        className="text-left mt-5"
        style={{
          background: "rgba(245,197,24,0.06)",
          border: "1px solid rgba(245,197,24,0.15)",
          borderRadius: 12,
          padding: 16,
          color: PALETTE.text2,
          fontSize: 13,
        }}
      >
        📱 L'app Konnekt arrive bientôt. Vous serez notifié en avant-première sur votre WhatsApp.
      </div>

      <div className="mt-6 text-left">
        <div style={{ fontSize: 13, fontWeight: 700 }}>Invitez d'autres transporteurs</div>
        <button
          type="button"
          onClick={onCopy}
          className="dm-mono mt-2 w-full flex items-center justify-between"
          style={{
            background: PALETTE.surface,
            border: `0.5px solid ${PALETTE.borderSoft}`,
            borderRadius: 8,
            padding: "10px 14px",
            color: PALETTE.yellow,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          <span className="truncate">{referralLink.replace(/^https?:\/\//, "")}</span>
          {copied ? (
            <span style={{ color: PALETTE.green }}>Copié ✓</span>
          ) : (
            <Copy className="w-4 h-4" style={{ color: PALETTE.text2 }} />
          )}
        </button>
        <p style={{ color: PALETTE.muted, fontSize: 11 }} className="mt-2">
          Chaque transporteur que vous invitez vous rapporte 1 mission offerte.
        </p>
      </div>

      <a
        href="/t/dashboard"
        style={{
          background: PALETTE.yellow,
          color: "#0A0A0A",
          borderRadius: 10,
          padding: "14px",
          fontSize: 14,
          fontWeight: 700,
          marginTop: 20,
          textDecoration: "none",
        }}
        className="flex items-center justify-center gap-2"
      >
        Accéder à mon tableau de bord <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
}
