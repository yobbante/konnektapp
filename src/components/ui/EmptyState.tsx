import { Package, Search, Plane, MapPin, Wallet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyVariant = "orders" | "search" | "trips" | "wallet" | "documents" | "generic";

const VARIANT_CONFIG: Record<EmptyVariant, { icon: typeof Package; defaultTitle: string; defaultDesc: string }> = {
  orders: { icon: Package, defaultTitle: "Aucune commande", defaultDesc: "Vos commandes apparaîtront ici" },
  search: { icon: Search, defaultTitle: "Aucun résultat", defaultDesc: "Essayez de modifier vos critères" },
  trips: { icon: Plane, defaultTitle: "Aucun voyage", defaultDesc: "Publiez un trajet pour commencer" },
  wallet: { icon: Wallet, defaultTitle: "Aucune transaction", defaultDesc: "Vos transactions apparaîtront ici" },
  documents: { icon: FileText, defaultTitle: "Aucun document", defaultDesc: "Vos documents apparaîtront ici" },
  generic: { icon: MapPin, defaultTitle: "Rien à afficher", defaultDesc: "Revenez plus tard" },
};

interface EmptyStateProps {
  variant?: EmptyVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  variant = "generic",
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground/40" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">
        {title || config.defaultTitle}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-4">
        {description || config.defaultDesc}
      </p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="text-xs">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
