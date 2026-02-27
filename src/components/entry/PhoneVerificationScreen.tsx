import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, ArrowRight, ChevronLeft, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface PhoneVerificationScreenProps {
  country: { code: string; name: string; flag: string; dialCode: string; currency: string };
  onVerified: (phone: string) => void;
  onBack: () => void;
}

const SIMULATED_OTP = "123456";

export function PhoneVerificationScreen({ country, onVerified, onBack }: PhoneVerificationScreenProps) {
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isValidPhone = phone.length >= 6;
  const fullPhone = `${country.dialCode} ${phone}`.trim();

  const handleSendOTP = () => {
    if (!isValidPhone) return;
    setSending(true);
    // Simulate OTP send
    setTimeout(() => {
      setSending(false);
      setStep("otp");
    }, 800);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpError(false);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits entered
    if (newOtp.every(d => d !== "") && newOtp.join("") === SIMULATED_OTP) {
      onVerified(fullPhone);
    } else if (newOtp.every(d => d !== "") && newOtp.join("") !== SIMULATED_OTP) {
      setOtpError(true);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    if (step === "otp") {
      inputRefs.current[0]?.focus();
    }
  }, [step]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ChevronLeft className="w-4 h-4" />
          Retour
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6">
        {step === "phone" ? (
          <motion.div
            key="phone-step"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-1">Votre numéro</h1>
              <p className="text-sm text-muted-foreground">
                Ce numéro sera votre identifiant principal
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Numéro de téléphone</Label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 h-12 px-3 rounded-xl border border-input bg-muted/30 text-sm font-medium shrink-0">
                  <span className="text-lg">{country.flag}</span>
                  <span>{country.dialCode}</span>
                </div>
                <Input
                  type="tel"
                  placeholder="77 123 45 67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                  className="h-12 rounded-xl text-base flex-1"
                  onKeyDown={(e) => { if (e.key === "Enter") handleSendOTP(); }}
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {country.flag} {country.name} · {country.currency}
              </p>
            </div>

            <Button
              className="w-full h-12 rounded-xl text-base"
              disabled={!isValidPhone || sending}
              onClick={handleSendOTP}
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Recevoir le code
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="otp-step"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-1">Vérification</h1>
              <p className="text-sm text-muted-foreground">
                Entrez le code envoyé au <span className="font-medium text-foreground">{fullPhone}</span>
              </p>
            </div>

            {/* OTP Input */}
            <div className="flex justify-center gap-2.5">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 bg-background transition-all focus:outline-none focus:ring-0 ${
                    otpError
                      ? "border-destructive text-destructive animate-shake"
                      : digit
                      ? "border-primary"
                      : "border-input focus:border-primary"
                  }`}
                />
              ))}
            </div>

            {otpError && (
              <p className="text-center text-sm text-destructive">
                Code incorrect. Réessayez.
              </p>
            )}

            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                Code prototype : <span className="font-mono font-bold text-foreground">123456</span>
              </p>
              <button
                onClick={() => { setStep("phone"); setOtp(["", "", "", "", "", ""]); setOtpError(false); }}
                className="text-xs text-primary hover:underline"
              >
                Changer de numéro
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
