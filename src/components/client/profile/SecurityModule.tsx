/**
 * SecurityModule — Collapsible security bar (sits below header)
 */
import { Shield, CheckCircle2, Circle, ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const checks = [
    { label: "Téléphone vérifié", done: phoneVerified },
    { label: "Email vérifié", done: emailVerified },
    { label: "Identité vérifiée", done: idVerified },
    { label: "Adresse confirmée", done: addressConfirmed },
  ];

  const doneCount = checks.filter(c => c.done).length;
  const allDone = doneCount === checks.length;
  const percentage = Math.round((doneCount / checks.length) * 100);

  const handleCTA = () => {
    navigate("/profil/complet");
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Compact bar — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
      >
        <Shield className={`w-4 h-4 flex-shrink-0 ${allDone ? "text-emerald-500" : "text-primary"}`} />
        
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-foreground">Protection</span>
          
          {/* Mini progress bar */}
          <div className="flex-1 max-w-[80px] h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${allDone ? "bg-emerald-500" : "bg-primary"}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          
          <span className={`text-[11px] font-medium ${allDone ? "text-emerald-500" : "text-muted-foreground"}`}>
            {doneCount}/{checks.length}
          </span>
        </div>

        {!allDone && !expanded && (
          <span className="text-[10px] text-primary font-medium px-2 py-0.5 rounded-full bg-primary/10">
            Compléter
          </span>
        )}

        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-border/50">
          <div className="grid grid-cols-2 gap-1.5 py-2.5">
            {checks.map((check, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {check.done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                )}
                <span className={`text-[11px] ${check.done ? "text-foreground" : "text-muted-foreground"}`}>
                  {check.label}
                </span>
              </div>
            ))}
          </div>

          {!allDone && (
            <button
              onClick={handleCTA}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              <span className="text-xs font-medium text-primary">Compléter mon profil</span>
              <ChevronRight className="w-3.5 h-3.5 text-primary" />
            </button>
          )}

          {kycLevel < 2 && allDone && (
            <p className="text-[10px] text-muted-foreground text-center">
              Protection complète activée ✓
            </p>
          )}
        </div>
      )}
    </div>
  );
}
