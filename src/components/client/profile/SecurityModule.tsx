/**
 * SecurityModule — Progressive KYC verification display
 */
import { Shield, CheckCircle2, Circle, ChevronRight, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import type { ClientKYCLevel } from "./ProfileHeader";

interface SecurityModuleProps {
  kycLevel: ClientKYCLevel;
  phoneVerified: boolean;
  emailVerified: boolean;
  idVerified: boolean;
  addressConfirmed: boolean;
  onUpgradeClick?: () => void;
}

export function SecurityModule({
  kycLevel, phoneVerified, emailVerified, idVerified, addressConfirmed, onUpgradeClick
}: SecurityModuleProps) {
  const checks = [
    { label: "Téléphone vérifié", done: phoneVerified },
    { label: "Email vérifié", done: emailVerified },
    { label: "Identité vérifiée", done: idVerified },
    { label: "Adresse confirmée", done: addressConfirmed },
  ];

  const doneCount = checks.filter(c => c.done).length;
  const allDone = doneCount === checks.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-card rounded-2xl border border-border p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm">Taux de protection</h3>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {doneCount}/{checks.length}
        </span>
      </div>

      <div className="space-y-2.5">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center gap-2.5">
            {check.done ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
            )}
            <span className={`text-sm ${check.done ? "text-foreground" : "text-muted-foreground"}`}>
              {check.label}
            </span>
          </div>
        ))}
      </div>

      {!allDone && (
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-4 gap-2"
          onClick={onUpgradeClick}
        >
          <Upload className="w-4 h-4" />
          Activer la protection complète
          <ChevronRight className="w-4 h-4 ml-auto" />
        </Button>
      )}

      {/* Benefits teaser */}
      {kycLevel < 2 && (
        <div className="mt-3 p-3 rounded-xl bg-muted/50 border border-border">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Avantages niveau supérieur :</span>
            {" "}Assurance maximale • Remboursement prioritaire • Traitement accéléré
          </p>
        </div>
      )}
    </motion.div>
  );
}
