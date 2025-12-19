import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground border-border",
        success: "border-transparent bg-success text-success-foreground",
        warning: "border-transparent bg-warning text-warning-foreground",
        pending: "border-transparent bg-warning/20 text-warning",
        gold: "border-transparent bg-secondary text-secondary-foreground",
        // Transport type badges
        express: "border-transparent bg-transport-express/15 text-transport-express border border-transport-express/30",
        routier: "border-transparent bg-transport-routier/15 text-transport-routier border border-transport-routier/30",
        maritime: "border-transparent bg-transport-maritime/15 text-transport-maritime border border-transport-maritime/30",
        aerien: "border-transparent bg-transport-aerien/15 text-transport-aerien border border-transport-aerien/30",
        voyageur: "border-transparent bg-transport-voyageur/15 text-transport-voyageur border border-transport-voyageur/30",
        // Status badges
        available: "bg-success/10 text-success border border-success/20",
        complete: "bg-muted text-muted-foreground border border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
