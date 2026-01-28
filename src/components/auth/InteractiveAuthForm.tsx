import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, Lock, Eye, EyeOff, User, Phone, ArrowRight, 
  Package, Truck, Users, CheckCircle2, ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface InteractiveAuthFormProps {
  mode: "login" | "register";
  onModeChange: (mode: "login" | "register") => void;
  onSubmit: (data: AuthFormData) => Promise<void>;
  onTransporterSelect: () => void;
  loading?: boolean;
}

export interface AuthFormData {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
}

type Step = "type" | "info" | "credentials";

export function InteractiveAuthForm({
  mode,
  onModeChange,
  onSubmit,
  onTransporterSelect,
  loading = false,
}: InteractiveAuthFormProps) {
  const [step, setStep] = useState<Step>(mode === "login" ? "credentials" : "type");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<AuthFormData>({
    email: "",
    password: "",
    fullName: "",
    phone: "",
  });

  // Validation states
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  const isValidPassword = formData.password.length >= 6;
  const isValidName = (formData.fullName?.length || 0) >= 2;
  const isValidPhone = (formData.phone?.length || 0) >= 8;

  const getProgress = () => {
    if (mode === "login") return 100;
    switch (step) {
      case "type": return 33;
      case "info": return 66;
      case "credentials": return 100;
      default: return 0;
    }
  };

  const handleClientSelect = () => {
    setStep("info");
  };

  const handleInfoNext = () => {
    if (isValidName && isValidPhone) {
      setStep("credentials");
    }
  };

  const handleBack = () => {
    if (step === "credentials" && mode === "register") {
      setStep("info");
    } else if (step === "info") {
      setStep("type");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login" && isValidEmail && isValidPassword) {
      await onSubmit(formData);
    } else if (mode === "register" && isValidEmail && isValidPassword && isValidName && isValidPhone) {
      await onSubmit(formData);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Progress Bar - Only for registration */}
      {mode === "register" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Progress value={getProgress()} className="h-1.5" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span className={step === "type" ? "text-primary font-medium" : ""}>Profil</span>
            <span className={step === "info" ? "text-primary font-medium" : ""}>Infos</span>
            <span className={step === "credentials" ? "text-primary font-medium" : ""}>Compte</span>
          </div>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {/* Step 1: Choose Type (Register only) */}
        {mode === "register" && step === "type" && (
          <motion.div
            key="type"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold">Je suis...</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choisissez votre profil
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleClientSelect}
              className="w-full p-5 rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-7 h-7 text-primary" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg">Client</h3>
                  <p className="text-sm text-muted-foreground">
                    Je veux envoyer des colis
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground ml-auto" />
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onTransporterSelect}
              className="w-full p-5 rounded-2xl border-2 border-border bg-card hover:border-secondary hover:bg-secondary/5 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <Truck className="w-7 h-7 text-secondary" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg">Transporteur</h3>
                  <p className="text-sm text-muted-foreground">
                    Je propose mes services
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground ml-auto" />
              </div>
            </motion.button>

            <div className="pt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Déjà inscrit ?{" "}
                <button 
                  onClick={() => onModeChange("login")} 
                  className="text-primary font-medium hover:underline"
                >
                  Se connecter
                </button>
              </p>
            </div>
          </motion.div>
        )}

        {/* Step 2: Personal Info (Register only) */}
        {mode === "register" && step === "info" && (
          <motion.div
            key="info"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 mb-6">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-xl font-bold">Vos informations</h2>
                <p className="text-sm text-muted-foreground">
                  Comment vous joindre ?
                </p>
              </div>
            </div>

            <div className="space-y-4">
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

              <div className="space-y-2">
                <Label className="text-sm">Téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="+221 77 123 45 67"
                    className="pl-11 h-12 text-base"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    onBlur={() => setTouched({ ...touched, phone: true })}
                  />
                  {touched.phone && isValidPhone && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                  )}
                </div>
              </div>
            </div>

            <Button 
              className="w-full h-12 mt-6"
              disabled={!isValidName || !isValidPhone}
              onClick={handleInfoNext}
            >
              Continuer
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {/* Step 3: Credentials (Both modes) */}
        {(mode === "login" || step === "credentials") && (
          <motion.div
            key="credentials"
            initial={{ opacity: 0, x: mode === "login" ? 0 : 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            {mode === "register" && (
              <div className="flex items-center gap-2 mb-6">
                <Button variant="ghost" size="icon" onClick={handleBack}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h2 className="text-xl font-bold">Créer votre compte</h2>
                  <p className="text-sm text-muted-foreground">
                    Dernière étape !
                  </p>
                </div>
              </div>
            )}

            {mode === "login" && (
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Package className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Connexion</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Accédez à votre espace
                </p>
              </div>
            )}

            {/* Mode Toggle */}
            <div className="flex rounded-xl bg-muted p-1 mb-6">
              <button
                onClick={() => {
                  onModeChange("login");
                  setStep("credentials");
                }}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  mode === "login" 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground"
                }`}
              >
                Connexion
              </button>
              <button
                onClick={() => {
                  onModeChange("register");
                  setStep("type");
                }}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  mode === "register" 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground"
                }`}
              >
                Inscription
              </button>
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
                    onBlur={() => setTouched({ ...touched, password: true })}
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
                {mode === "register" && (
                  <p className={`text-xs ${isValidPassword ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {isValidPassword ? '✓ Mot de passe valide' : 'Minimum 6 caractères'}
                  </p>
                )}
              </div>

              {mode === "login" && (
                <div className="text-right">
                  <button type="button" className="text-sm text-primary hover:underline">
                    Mot de passe oublié ?
                  </button>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12"
                disabled={loading || !isValidEmail || !isValidPassword}
              >
                {loading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <>
                    {mode === "login" ? "Se connecter" : "Créer mon compte"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
