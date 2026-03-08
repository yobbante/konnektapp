import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, Lock, Eye, EyeOff, User, Phone, ArrowRight, 
  Package, Truck, Users, CheckCircle2, ChevronLeft, AlertCircle, Globe, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRY_PHONE_CODES } from "@/lib/phoneCountryCodes";

import { ALL_COUNTRIES } from "@/components/gp/SearchableCountrySelect";

const COUNTRY_OPTIONS = ALL_COUNTRIES;

interface InteractiveAuthFormProps {
  mode: "login" | "register";
  onModeChange: (mode: "login" | "register") => void;
  onSubmit: (data: AuthFormData) => Promise<void>;
  onTransporterSelect: () => void;
  loading?: boolean;
  prefillPhone?: string;
  prefillCountry?: string;
}

export interface AuthFormData {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
  country?: string;
  city?: string;
}

// Login steps: phone → password (or fallback to email → password)
type LoginStep = "phone" | "password" | "email-fallback";
// Register steps: country → city → phone → type → credentials
type RegisterStep = "country" | "city" | "phone" | "type" | "credentials";

export function InteractiveAuthForm({
  mode,
  onModeChange,
  onSubmit,
  onTransporterSelect,
  loading = false,
  prefillPhone = "",
  prefillCountry = "SN",
}: InteractiveAuthFormProps) {
  // If phone is pre-filled from entry flow, skip to credentials for register
  const hasEntryPhone = !!prefillPhone;
  
  const [registerStep, setRegisterStep] = useState<RegisterStep>(hasEntryPhone ? "credentials" : "country");
  const [loginStep, setLoginStep] = useState<LoginStep>("phone");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<AuthFormData>({
    email: "",
    password: "",
    fullName: "",
    phone: prefillPhone || "",
    country: prefillCountry,
    city: "",
  });
  const [cityInput, setCityInput] = useState("");

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [phoneLoginLookup, setPhoneLoginLookup] = useState<string | null>(null);
  const [loginPhone, setLoginPhone] = useState("");

  const [selectedCountry, setSelectedCountry] = useState(prefillCountry);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [loginSelectedCountry, setLoginSelectedCountry] = useState(prefillCountry);
  const [showLoginCountryDropdown, setShowLoginCountryDropdown] = useState(false);

  const selectedDialCode = COUNTRY_PHONE_CODES[selectedCountry] || "+221";
  const loginDialCode = COUNTRY_PHONE_CODES[loginSelectedCountry] || "+221";
  const selectedFlag = COUNTRY_OPTIONS.find(c => c.code === selectedCountry)?.flag || "🇸🇳";
  const loginFlag = COUNTRY_OPTIONS.find(c => c.code === loginSelectedCountry)?.flag || "🇸🇳";

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  const hasMinLength = formData.password.length >= 8;
  const hasDigit = /\d/.test(formData.password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password);
  const isValidPassword = hasMinLength && hasDigit && hasSpecial;
  const isValidName = (formData.fullName?.length || 0) >= 2;
  const isValidPhone = (formData.phone?.length || 0) >= 6;
  const isValidLoginPhone = loginPhone.length >= 6;

  const getProgress = () => {
    if (mode === "login") return loginStep === "phone" ? 50 : 100;
    switch (registerStep) {
      case "country": return 20;
      case "city": return 40;
      case "phone": return 60;
      case "type": return 80;
      case "credentials": return 100;
      default: return 0;
    }
  };

  // Check phone duplicate for registration
  const checkPhoneDuplicate = async (phone: string): Promise<boolean> => {
    const fullPhone = `${selectedDialCode} ${phone}`.trim();
    if (phone.length < 6) return false;
    setCheckingPhone(true);
    setPhoneError(null);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("phone", fullPhone)
        .maybeSingle();
      if (data) {
        setPhoneError(`Ce numéro est déjà associé au compte ${data.email || data.full_name || "existant"}. Connectez-vous plutôt.`);
        setCheckingPhone(false);
        return true;
      }
      setCheckingPhone(false);
      return false;
    } catch {
      setCheckingPhone(false);
      return false;
    }
  };

  // Login: lookup email from phone
  const lookupAndProceed = async () => {
    if (!isValidLoginPhone) return;
    const fullPhone = `${loginDialCode} ${loginPhone}`.trim();
    setCheckingPhone(true);
    setPhoneLoginLookup(null);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("email, user_id, full_name")
        .eq("phone", fullPhone)
        .maybeSingle();
      if (data?.email) {
        setPhoneLoginLookup(data.full_name || "Utilisateur");
        setFormData(prev => ({ ...prev, email: data.email || "" }));
        setLoginStep("password");
      } else {
        setPhoneLoginLookup(null);
        setPhoneError("Aucun compte trouvé avec ce numéro.");
      }
    } catch {
      setPhoneLoginLookup(null);
      setPhoneError("Erreur de recherche. Essayez avec votre email.");
    } finally {
      setCheckingPhone(false);
    }
  };

  const handlePhoneNext = async () => {
    if (!isValidPhone) return;
    const isDuplicate = await checkPhoneDuplicate(formData.phone || "");
    if (!isDuplicate) {
      setFormData(prev => ({ ...prev, phone: `${selectedDialCode} ${prev.phone}` }));
      setRegisterStep("type");
    }
  };

  // Country dropdown component
  const [countrySearch, setCountrySearch] = useState("");

  const CountryCodeDropdown = ({ 
    selected, onSelect, show, setShow, flag, dialCode 
  }: { 
    selected: string; onSelect: (code: string) => void; show: boolean; setShow: (v: boolean) => void; flag: string; dialCode: string;
  }) => {
    const filtered = COUNTRY_OPTIONS.filter(c => 
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.toLowerCase().includes(countrySearch.toLowerCase())
    );
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => { setShow(!show); setCountrySearch(""); }}
          className="flex items-center gap-1 h-12 px-3 rounded-l-lg border border-r-0 border-input bg-muted/50 hover:bg-muted transition-colors text-sm font-medium"
        >
          <span className="text-base">{flag}</span>
          <span className="text-xs text-muted-foreground">{dialCode}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
        {show && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-popover border border-border rounded-xl shadow-lg z-50">
            <div className="p-2 border-b border-border">
              <input
                type="text"
                placeholder="Rechercher un pays..."
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                className="w-full h-8 px-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { onSelect(c.code); setShow(false); setCountrySearch(""); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors ${selected === c.code ? "bg-primary/10 font-medium" : ""}`}
                >
                  <span>{c.flag}</span>
                  <span className="flex-1 text-left">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{COUNTRY_PHONE_CODES[c.code]}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">Aucun pays trouvé</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login" && isValidEmail && isValidPassword) {
      await onSubmit(formData);
    } else if (mode === "register" && isValidEmail && isValidPassword && isValidName && isValidPhone) {
      await onSubmit(formData);
    }
  };

  const resetToLogin = () => {
    onModeChange("login");
    setLoginStep("phone");
    setPhoneError(null);
    setPhoneLoginLookup(null);
    setLoginPhone("");
    setFormData(prev => ({ ...prev, email: "", password: "" }));
  };

  const resetToRegister = () => {
    onModeChange("register");
    setRegisterStep("country");
    setPhoneError(null);
    setFormData({ email: "", password: "", fullName: "", phone: "", country: "SN", city: "" });
    setSelectedCountry("SN");
    setCityInput("");
    setTouched({});
    setCheckingPhone(false);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Progress */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Progress value={getProgress()} className="h-1.5" />
      </motion.div>

      {/* Mode Toggle - always visible */}
      <div className="flex rounded-xl bg-muted p-1 mb-6">
        <button
          onClick={resetToLogin}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            mode === "login" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Connexion
        </button>
        <button
          onClick={resetToRegister}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            mode === "register" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Inscription
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* ═══════════════ LOGIN FLOW ═══════════════ */}

        {/* Login Step 1: Phone number */}
        {mode === "login" && loginStep === "phone" && (
          <motion.div
            key="login-phone"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-4"
          >
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Phone className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Connexion</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Entrez votre numéro de téléphone
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Numéro de téléphone</Label>
              <div className="flex">
                <CountryCodeDropdown
                  selected={loginSelectedCountry}
                  onSelect={setLoginSelectedCountry}
                  show={showLoginCountryDropdown}
                  setShow={setShowLoginCountryDropdown}
                  flag={loginFlag}
                  dialCode={loginDialCode}
                />
                <Input
                  type="tel"
                  placeholder="77 123 45 67"
                  className="rounded-l-none h-12 text-base flex-1"
                  value={loginPhone}
                  onChange={(e) => {
                    setLoginPhone(e.target.value);
                    setPhoneError(null);
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookupAndProceed(); } }}
                />
              </div>
              {phoneError && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20"
                >
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-destructive font-medium">{phoneError}</p>
                    <div className="flex gap-3 mt-1.5">
                      <button
                        type="button"
                        onClick={() => { setPhoneError(null); setLoginStep("email-fallback"); }}
                        className="text-xs text-primary font-semibold hover:underline"
                      >
                        → Utiliser mon email
                      </button>
                      <button
                        type="button"
                        onClick={resetToRegister}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        Créer un compte
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <Button
              className="w-full h-12"
              disabled={!isValidLoginPhone || checkingPhone}
              onClick={lookupAndProceed}
            >
              {checkingPhone ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Continuer
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-2">
              <button
                type="button"
                onClick={() => setLoginStep("email-fallback")}
                className="text-primary hover:underline"
              >
                Se connecter avec mon email
              </button>
            </p>
          </motion.div>
        )}

        {/* Login Step 2: Password (after phone lookup success) */}
        {mode === "login" && loginStep === "password" && (
          <motion.div
            key="login-password"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Button variant="ghost" size="icon" onClick={() => { setLoginStep("phone"); setFormData(prev => ({ ...prev, password: "" })); }}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-xl font-bold">Mot de passe</h2>
                <p className="text-sm text-muted-foreground">
                  Entrez votre mot de passe pour continuer
                </p>
              </div>
            </div>

            {/* Show found account info */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{phoneLoginLookup}</p>
                <p className="text-xs text-muted-foreground">{loginDialCode} {loginPhone}</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-11 pr-11 h-12 text-base"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => {
                    if (!formData.email || !isValidEmail) return;
                    supabase.auth.resetPasswordForEmail(formData.email, {
                      redirectTo: `${window.location.origin}/auth`,
                    }).then(({ error }) => {
                      if (error) alert("Erreur: " + error.message);
                      else alert("Un email de réinitialisation a été envoyé à " + formData.email);
                    });
                  }}
                >
                  Mot de passe oublié ?
                </button>
              </div>

              <Button type="submit" className="w-full h-12" disabled={loading || !isValidPassword}>
                {loading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <>Se connecter <ArrowRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </form>
          </motion.div>
        )}

        {/* Login: Email fallback */}
        {mode === "login" && loginStep === "email-fallback" && (
          <motion.div
            key="login-email"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Button variant="ghost" size="icon" onClick={() => { setLoginStep("phone"); setPhoneError(null); }}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-xl font-bold">Connexion par email</h2>
                <p className="text-sm text-muted-foreground">
                  Utilisez votre adresse email
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="votre@email.com"
                    className="pl-11 h-12 text-base"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    autoFocus
                    required
                  />
                  {isValidEmail && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-11 pr-11 h-12 text-base"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => {
                    if (!formData.email || !isValidEmail) { alert("Entrez votre email d'abord"); return; }
                    supabase.auth.resetPasswordForEmail(formData.email, {
                      redirectTo: `${window.location.origin}/auth`,
                    }).then(({ error }) => {
                      if (error) alert("Erreur: " + error.message);
                      else alert("Email de réinitialisation envoyé à " + formData.email);
                    });
                  }}
                >
                  Mot de passe oublié ?
                </button>
              </div>

              <Button type="submit" className="w-full h-12" disabled={loading || !isValidEmail || !isValidPassword}>
                {loading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <>Se connecter <ArrowRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </form>
          </motion.div>
        )}

        {/* ═══════════════ REGISTER FLOW ═══════════════ */}

        {/* Register Step 0: Choose country */}
        {mode === "register" && registerStep === "country" && (
          <motion.div
            key="register-country"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Globe className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Votre pays</h2>
              <p className="text-sm text-muted-foreground mt-1">Sélectionnez votre pays de résidence</p>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Rechercher un pays..."
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-xl border border-input bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="max-h-64 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                {COUNTRY_OPTIONS.filter(c =>
                  c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.toLowerCase().includes(countrySearch.toLowerCase())
                ).map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setSelectedCountry(c.code);
                      setFormData(prev => ({ ...prev, country: c.code }));
                      setCountrySearch("");
                      setRegisterStep("city");
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors ${selectedCountry === c.code ? "bg-primary/10 font-medium" : ""}`}
                  >
                    <span className="text-lg">{c.flag}</span>
                    <span className="flex-1 text-left font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{COUNTRY_PHONE_CODES[c.code]}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Register Step 1: City */}
        {mode === "register" && registerStep === "city" && (
          <motion.div
            key="register-city"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 mb-6">
              <Button variant="ghost" size="icon" onClick={() => setRegisterStep("country")}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-xl font-bold">Votre ville</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {COUNTRY_OPTIONS.find(c => c.code === selectedCountry)?.flag}{" "}
                  {COUNTRY_OPTIONS.find(c => c.code === selectedCountry)?.name}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Ville de résidence *</Label>
              <div className="relative">
                <Input
                  placeholder="Ex: Dakar, Abidjan, Paris..."
                  className="h-12 text-base"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  autoFocus
                />
                {cityInput.length >= 2 && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Cela nous aide à vous proposer les services disponibles dans votre zone
              </p>
            </div>

            <Button
              className="w-full h-12 mt-4"
              disabled={cityInput.length < 2}
              onClick={() => {
                setFormData(prev => ({ ...prev, city: cityInput }));
                setRegisterStep("phone");
              }}
            >
              Continuer <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Register Step 2: Choose profile type */}
        {mode === "register" && registerStep === "type" && (
          <motion.div
            key="register-type"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 mb-6">
              <Button variant="ghost" size="icon" onClick={() => setRegisterStep("phone")}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-xl font-bold">Je suis...</h2>
                <p className="text-sm text-muted-foreground mt-1">Choisissez votre profil</p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setRegisterStep("phone")}
              className="w-full p-5 rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-7 h-7 text-primary" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-lg">Client</h3>
                  <p className="text-sm text-muted-foreground">Je veux envoyer des colis</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { window.location.href = "/transporteur/inscription"; }}
              className="w-full p-5 rounded-2xl border-2 border-border bg-card hover:border-secondary hover:bg-secondary/5 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <Truck className="w-7 h-7 text-secondary" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-lg">Transporteur</h3>
                  <p className="text-sm text-muted-foreground">Je propose mes services</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </motion.button>
          </motion.div>
        )}

        {/* Register Step 2: Phone */}
        {mode === "register" && registerStep === "phone" && (
          <motion.div
            key="register-phone"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 mb-6">
              <Button variant="ghost" size="icon" onClick={() => setRegisterStep("type")}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-xl font-bold">Votre téléphone</h2>
                <p className="text-sm text-muted-foreground">Numéro unique pour votre compte</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Pays & Numéro de téléphone *</Label>
              <div className="flex">
                <CountryCodeDropdown
                  selected={selectedCountry}
                  onSelect={setSelectedCountry}
                  show={showCountryDropdown}
                  setShow={setShowCountryDropdown}
                  flag={selectedFlag}
                  dialCode={selectedDialCode}
                />
                <div className="relative flex-1">
                  <Input
                    type="tel"
                    placeholder="77 123 45 67"
                    className={`rounded-l-none h-12 text-base ${phoneError ? "border-destructive" : ""}`}
                    value={formData.phone}
                    onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); setPhoneError(null); }}
                    onBlur={() => setTouched({ ...touched, phone: true })}
                  />
                  {checkingPhone && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {touched.phone && isValidPhone && !phoneError && !checkingPhone && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                  )}
                </div>
              </div>
              {phoneError && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20"
                >
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-destructive font-medium">{phoneError}</p>
                    <button
                      type="button"
                      onClick={resetToLogin}
                      className="text-xs text-primary font-semibold hover:underline mt-1 block"
                    >
                      → Se connecter
                    </button>
                  </div>
                </motion.div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Ce numéro servira à vous identifier et retrouver votre compte
              </p>
            </div>

            <Button
              className="w-full h-12 mt-6"
              disabled={!isValidPhone || checkingPhone}
              onClick={handlePhoneNext}
            >
              {checkingPhone ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Continuer <ArrowRight className="w-4 h-4 ml-1" /></>
              )}
            </Button>
          </motion.div>
        )}

        {/* Register Step 3: Name + Email + Password */}
        {mode === "register" && registerStep === "credentials" && (
          <motion.div
            key="register-credentials"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Button variant="ghost" size="icon" onClick={() => { setRegisterStep("phone"); setFormData(prev => ({ ...prev, phone: prev.phone?.replace(selectedDialCode + " ", "") || "" })); }}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-xl font-bold">Créer votre compte</h2>
                <p className="text-sm text-muted-foreground">Dernière étape !</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Nom complet</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Votre nom complet"
                    className="pl-11 h-12 text-base"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    onBlur={() => setTouched({ ...touched, fullName: true })}
                  />
                  {touched.fullName && isValidName && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                  )}
                </div>
              </div>

              {/* Phone — read-only badge from entry flow */}
              {formData.phone && (
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border border-border">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{formData.phone}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">Numéro vérifié</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
              )}

              {/* Country is pre-filled from entry flow — show read-only badge */}
              {formData.country && (
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border border-border">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {COUNTRY_OPTIONS.find(c => c.code === formData.country)?.flag}{" "}
                    {COUNTRY_OPTIONS.find(c => c.code === formData.country)?.name || formData.country}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">Pays de résidence</span>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="votre@email.com"
                    className="pl-11 h-12 text-base"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    onBlur={() => setTouched({ ...touched, email: true })}
                    required
                  />
                  {touched.email && isValidEmail && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-11 pr-11 h-12 text-base"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="space-y-0.5">
                  <p className={`text-xs ${hasMinLength ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {hasMinLength ? '✓' : '○'} 8 caractères minimum
                  </p>
                  <p className={`text-xs ${hasDigit ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {hasDigit ? '✓' : '○'} Au moins un chiffre
                  </p>
                  <p className={`text-xs ${hasSpecial ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {hasSpecial ? '✓' : '○'} Au moins un caractère spécial (!@#$...)
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12"
                disabled={loading || !isValidEmail || !isValidPassword || !isValidName}
              >
                {loading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <>Créer mon compte <ArrowRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
