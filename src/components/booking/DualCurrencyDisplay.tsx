/**
 * Dual Currency Display Component V1.2
 * 
 * RÈGLE UI: FCFA toujours affiché entre parenthèses, jamais masqué, jamais optionnel.
 * Format: "45 USD (≈ 27 900 FCFA)"
 */

import { useMemo } from "react";
import { getCurrencySymbol } from "@/components/ui/currency-selector";
import { cn } from "@/lib/utils";

interface DualCurrencyDisplayProps {
  amount: number;
  currency: string;
  fcfaEquivalent?: number;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showFCFA?: boolean; // Default true - FCFA always shown
  inline?: boolean;
  variant?: "default" | "primary" | "muted";
}

export function DualCurrencyDisplay({
  amount,
  currency,
  fcfaEquivalent,
  className,
  size = "md",
  showFCFA = true,
  inline = false,
  variant = "default",
}: DualCurrencyDisplayProps) {
  const symbol = getCurrencySymbol(currency);
  const isFCFA = currency === "XOF" || currency === "FCFA";
  
  const formattedAmount = useMemo(() => {
    return amount.toLocaleString('fr-FR');
  }, [amount]);
  
  const formattedFCFA = useMemo(() => {
    if (!fcfaEquivalent) return null;
    return fcfaEquivalent.toLocaleString('fr-FR');
  }, [fcfaEquivalent]);

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg font-semibold",
    xl: "text-2xl font-bold",
  };

  const variantClasses = {
    default: "",
    primary: "text-primary",
    muted: "text-muted-foreground",
  };

  // If already FCFA, just show FCFA
  if (isFCFA) {
    return (
      <span className={cn(sizeClasses[size], variantClasses[variant], className)}>
        {formattedAmount} FCFA
      </span>
    );
  }

  // Dual display
  if (inline) {
    return (
      <span className={cn(sizeClasses[size], variantClasses[variant], className)}>
        {formattedAmount} {symbol}
        {showFCFA && formattedFCFA && (
          <span className="text-muted-foreground text-sm ml-1">
            (≈ {formattedFCFA} FCFA)
          </span>
        )}
      </span>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <span className={cn(sizeClasses[size], variantClasses[variant])}>
        {formattedAmount} {symbol}
      </span>
      {showFCFA && formattedFCFA && (
        <span className="text-xs text-muted-foreground">
          ≈ {formattedFCFA} FCFA
        </span>
      )}
    </div>
  );
}

/**
 * Compact version for tables and lists
 */
export function DualCurrencyCompact({
  amount,
  currency,
  fcfaEquivalent,
  className,
}: {
  amount: number;
  currency: string;
  fcfaEquivalent?: number;
  className?: string;
}) {
  const symbol = getCurrencySymbol(currency);
  const isFCFA = currency === "XOF" || currency === "FCFA";
  
  const formattedAmount = amount.toLocaleString('fr-FR');
  const formattedFCFA = fcfaEquivalent?.toLocaleString('fr-FR');

  if (isFCFA) {
    return <span className={className}>{formattedAmount} FCFA</span>;
  }

  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      <span className="font-medium">{formattedAmount} {symbol}</span>
      {formattedFCFA && (
        <span className="text-xs text-muted-foreground">(≈{formattedFCFA}F)</span>
      )}
    </span>
  );
}

/**
 * Info banner explaining currency system
 */
export function CurrencyInfoBanner({ className }: { className?: string }) {
  return (
    <div className={cn(
      "text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg",
      className
    )}>
      <span>
        Tous les montants sont calculés en FCFA (XOF) puis convertis automatiquement selon la devise du transporteur.
      </span>
    </div>
  );
}
