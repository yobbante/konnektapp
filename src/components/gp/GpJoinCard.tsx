/**
 * GpJoinCard — Formulaire d'inscription GP (transporteur de bagages)
 *
 * Tous les inscrits SONT des GP : on ne demande pas de "mode de transport".
 * On collecte ce qui définit réellement un GP :
 *   1. Identité + WhatsApp (canal de mission)
 *   2. Sa navette : ville de départ → ville d'arrivée (cœur du profil GP)
 *   3. Son tarif indicatif par kg (optionnel, ajustable plus tard)
 *
 * La création du profil se fait via l'edge function `rejoindre-gp`.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageCircle,
  CheckCircle2,
  Loader2,
  Lock,
  ArrowRight,
  ArrowLeftRight,
  Plane,
  User,
  Coins,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableCitySelect } from "@/components/gp/SearchableCitySelect";
import { PHONE_COUNTRIES } from "@/components/ui/PhoneInputWithCode";
import { getFlag } from "@/lib/countryFlags";
import { toast } from "@/hooks/use-toast";
import { ChevronDown } from "lucide-react";

const TEAL = "#0D9488";
const TEAL_DARK = "#0F766E";

/** Devises supportées + exemple de tarif/kg adapté à chaque monnaie. */
const CURRENCIES = [
  { code: "XOF", symbol: "FCFA", placeholder: "5000" },
  { code: "EUR", symbol: "€", placeholder: "8" },
  { code: "USD", symbol: "$", placeholder: "9" },
  { code: "CAD", symbol: "C$", placeholder: "12" },
  { code: "GBP", symbol: "£", placeholder: "7" },
  { code: "MAD", symbol: "DH", placeholder: "80" },
  { code: "AED", symbol: "AED", placeholder: "30" },
];

const WHATSAPP_LINK =
  "https://wa.me/221789269756?text=Bonjour%20Konnekt%2C%20je%20viens%20de%20m%27inscrire%20comme%20GP.%20Je%20souhaite%20activer%20mon%20compte%20et%20recevoir%20mes%20missions.";

const inputStyle: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  border: "1.5px solid #D1D5DB",
  borderRadius: 10,
  height: 48,
  color: "#111827",
  fontSize: 15,
};

const labelStyle: React.CSSProperties = { color: "#374151", fontWeight: 600, fontSize: 14 };

/** Phone input, light theme, with country dial-code selector. */
function StyledPhoneInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const findCountry = () => PHONE_COUNTRIES.find((c) => value.startsWith(c.dial))?.code ?? "SN";
  const [selectedCode, setSelectedCode] = useState(findCountry);
  const [open, setOpen] = useState(false);
  const country = PHONE_COUNTRIES.find((c) => c.code === selectedCode) || PHONE_COUNTRIES[0];
  const local = value.startsWith(country.dial) ? value.slice(country.dial.length).trim() : "";

  return (
    <div className="relative flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2.5 shrink-0"
        style={{
          backgroundColor: "#F9FAFB",
          border: "1.5px solid #D1D5DB",
          borderRight: "none",
          borderTopLeftRadius: 10,
          borderBottomLeftRadius: 10,
          height: 48,
        }}
      >
        <span className="text-base">{country.flag}</span>
        <span className="text-xs font-medium" style={{ color: "#374151" }}>{country.dial}</span>
        <ChevronDown className="w-3 h-3" style={{ color: "#9CA3AF" }} />
      </button>
      <input
        type="tel"
        placeholder="77 123 45 67"
        value={local}
        onChange={(e) => onChange(`${country.dial}${e.target.value.replace(/[^0-9\s]/g, "")}`)}
        onFocus={(e) => (e.currentTarget.style.borderColor = TEAL)}
        onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
        className="flex-1 px-3 outline-none"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1.5px solid #D1D5DB",
          borderTopRightRadius: 10,
          borderBottomRightRadius: 10,
          color: "#111827",
          fontSize: 15,
          height: 48,
        }}
      />
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-full mt-1 z-50 w-64 max-h-60 overflow-auto bg-white"
            style={{ border: "1px solid #E5E7EB", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
          >
            {PHONE_COUNTRIES.map((c) => (
              <button
                key={`${c.code}-${c.dial}`}
                type="button"
                onClick={() => {
                  onChange(`${c.dial}${local}`);
                  setSelectedCode(c.code);
                  setOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50"
                style={{ color: "#111827" }}
              >
                <span className="text-base">{c.flag}</span>
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-xs" style={{ color: "#6B7280" }}>{c.dial}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export interface GpJoinCardProps {
  initialPrenom?: string;
  initialNom?: string;
  initialPhone?: string;
  /** Référence GP (GP1234) pour le suivi d'onboarding. */
  refGp?: string;
  /** Called after a successful registration (for ref tracking). */
  onRegistered?: (konnektUserId: string | null) => void | Promise<void>;
}

export function GpJoinCard({
  initialPrenom = "",
  initialNom = "",
  initialPhone = "+221",
  refGp,
  onRegistered,
}: GpJoinCardProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);

  const [prenom, setPrenom] = useState(initialPrenom);
  const [nom, setNom] = useState(initialNom);
  const [phone, setPhone] = useState(initialPhone);

  const [originCity, setOriginCity] = useState("Dakar");
  const [originCountry, setOriginCountry] = useState("SN");
  const [destCity, setDestCity] = useState("Paris");
  const [destCountry, setDestCountry] = useState("FR");
  const [pricePerKg, setPricePerKg] = useState("");
  const [currencyCode, setCurrencyCode] = useState("XOF");
  const currency = CURRENCIES.find((c) => c.code === currencyCode) || CURRENCIES[0];

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const cleanPhone = phone.replace(/\s/g, "");
  const identityValid =
    prenom.trim().length >= 2 && nom.trim().length >= 2 && /^\+\d{8,15}$/.test(cleanPhone);

  const swapRoute = () => {
    setOriginCity(destCity);
    setOriginCountry(destCountry);
    setDestCity(originCity);
    setDestCountry(originCountry);
  };

  const goNext = () => {
    if (!identityValid) {
      toast({
        title: "Champs requis",
        description: "Prénom, nom et numéro WhatsApp valide (+221…).",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (originCity === destCity) {
      toast({
        title: "Navette invalide",
        description: "La ville de départ et d'arrivée doivent être différentes.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("rejoindre-gp", {
        body: {
          prenom: prenom.trim(),
          nom: nom.trim(),
          phone: cleanPhone,
          originCity,
          originCountry,
          destCity,
          destCountry,
          pricePerKg: pricePerKg ? Number(pricePerKg) : null,
          currency: currencyCode,
        },
      });
      if (error) throw error;
      const konnektUserId = (data as { id?: string } | null)?.id ?? null;
      await onRegistered?.(konnektUserId);
      setSuccess(true);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer votre inscription. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-4"
      >
        <div
          className="w-16 h-16 rounded-full grid place-items-center mx-auto mb-4"
          style={{ backgroundColor: `${TEAL}1A` }}
        >
          <CheckCircle2 className="w-9 h-9" style={{ color: TEAL }} />
        </div>
        <h2 className="text-2xl font-bold" style={{ color: "#111827" }}>
          Dernière étape, {prenom.trim()} !
        </h2>
        <p className="mt-2 text-sm" style={{ color: "#6B7280" }}>
          Confirmez sur WhatsApp pour recevoir vos missions
        </p>

        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-6"
          onClick={() => {
            const ref = (refGp || "").trim().toUpperCase();
            if (/^GP\d{4}$/.test(ref)) {
              supabase.functions
                .invoke("gp-onboarding-track", { body: { ref_gp: ref, event: "whatsapp_clicked" } })
                .catch(() => {/* best-effort */});
            }
          }}
        >
          <Button
            className="w-full text-base text-white gap-2"
            style={{ height: 52, borderRadius: 12, fontWeight: 700, backgroundColor: "#25D366" }}
          >
            <MessageCircle className="w-5 h-5" />
            Activer mon compte sur WhatsApp →
          </Button>
        </a>

        {/* Séparateur "ou" */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ backgroundColor: "#E5E7EB" }} />
          <span className="text-xs font-medium" style={{ color: "#9CA3AF" }}>ou</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "#E5E7EB" }} />
        </div>

        <button
          type="button"
          onClick={() => navigate("/gp/dashboard")}
          className="text-sm font-semibold"
          style={{ color: TEAL_DARK }}
        >
          Accéder à mon espace GP →
        </button>

        <p className="mt-6 text-xs leading-relaxed" style={{ color: "#6B7280" }}>
          L'activation WhatsApp est recommandée pour recevoir vos missions en temps réel.
        </p>
      </motion.div>
    );
  }


  return (
    <div>
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2].map((s) => (
          <div key={s} className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: s <= step ? TEAL : "#E5E7EB" }} />
        ))}
      </div>

      {step === 1 ? (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5" style={{ color: TEAL }} />
            <h2 className="text-xl font-bold" style={{ color: "#111827" }}>
              Qui êtes-vous ?
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label style={labelStyle}>Prénom *</Label>
              <Input
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Aïssatou"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = TEAL)}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
              />
            </div>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Nom *</Label>
              <Input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Diallo"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = TEAL)}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label style={labelStyle}>Numéro WhatsApp *</Label>
            <StyledPhoneInput value={phone} onChange={setPhone} />
            <p className="text-xs" style={{ color: "#6B7280" }}>
              C'est sur ce numéro que vous recevrez vos missions.
            </p>
          </div>

          <Button
            type="button"
            onClick={goNext}
            className="w-full text-base text-white gap-1.5"
            style={{ height: 52, borderRadius: 12, fontWeight: 700, backgroundColor: TEAL }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = TEAL_DARK)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = TEAL)}
          >
            Continuer <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5" style={{ color: TEAL }} />
            <h2 className="text-xl font-bold" style={{ color: "#111827" }}>
              Votre navette
            </h2>
          </div>
          <p className="text-sm -mt-2" style={{ color: "#6B7280" }}>
            Le trajet sur lequel vous transportez régulièrement des bagages.
          </p>

          {/* Route summary */}
          <div
            className="flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl"
            style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB" }}
          >
            <span className="text-xl">{getFlag(originCountry)}</span>
            <span className="font-semibold text-sm" style={{ color: "#111827" }}>{originCity}</span>
            <button type="button" onClick={swapRoute} aria-label="Inverser" className="mx-1">
              <ArrowLeftRight className="w-4 h-4" style={{ color: TEAL }} />
            </button>
            <span className="font-semibold text-sm" style={{ color: "#111827" }}>{destCity}</span>
            <span className="text-xl">{getFlag(destCountry)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label style={labelStyle}>Ville de départ</Label>
              <SearchableCitySelect
                value={originCity}
                countryCode={originCountry}
                onSelect={(c, co) => {
                  setOriginCity(c);
                  setOriginCountry(co);
                }}
                label="Ville de départ"
                placeholder="Rechercher..."
              />
            </div>
            <div className="space-y-1.5">
              <Label style={labelStyle}>Ville d'arrivée</Label>
              <SearchableCitySelect
                value={destCity}
                countryCode={destCountry}
                onSelect={(c, co) => {
                  setDestCity(c);
                  setDestCountry(co);
                }}
                label="Ville d'arrivée"
                placeholder="Rechercher..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label style={labelStyle} className="flex items-center gap-1.5">
              <Coins className="w-4 h-4" style={{ color: TEAL }} />
              Tarif indicatif par kg <span style={{ color: "#9CA3AF", fontWeight: 400 }}>· optionnel</span>
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={pricePerKg}
                  onChange={(e) => setPricePerKg(e.target.value)}
                  placeholder={`Ex : ${currency.placeholder}`}
                  style={{ ...inputStyle, paddingRight: 38 }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = TEAL)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
                />
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                  style={{ color: "#9CA3AF" }}
                >
                  /kg
                </span>
              </div>
              <select
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                aria-label="Devise"
                className="shrink-0 px-2 outline-none"
                style={{
                  backgroundColor: "#F9FAFB",
                  border: "1.5px solid #D1D5DB",
                  borderRadius: 10,
                  height: 48,
                  color: "#111827",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs" style={{ color: "#6B7280" }}>
              Tarif en {currency.symbol}/kg · ajustable à tout moment.
            </p>
          </div>

          <div className="flex gap-2.5">
            <Button
              type="button"
              onClick={() => setStep(1)}
              variant="outline"
              className="shrink-0 px-4"
              style={{ height: 52, borderRadius: 12, fontWeight: 600 }}
            >
              Retour
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 min-w-0 text-sm sm:text-base text-white px-2"
              style={{ height: 52, borderRadius: 12, fontWeight: 700, backgroundColor: TEAL }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = TEAL_DARK)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = TEAL)}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continuer →"}
            </Button>
          </div>

          <p
            className="text-center flex items-center justify-center gap-1.5"
            style={{ color: "#6B7280", fontSize: 13 }}
          >
            <Lock className="w-3.5 h-3.5" />
            Gratuit · Sans engagement · Données sécurisées
          </p>
        </form>
      )}
    </div>
  );
}
