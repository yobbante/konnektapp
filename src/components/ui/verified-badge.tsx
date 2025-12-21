import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showTooltip?: boolean;
}

export function VerifiedBadge({ size = "md", className, showTooltip = true }: VerifiedBadgeProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <div 
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
      title={showTooltip ? "Profil vérifié" : undefined}
    >
      <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm animate-pulse" />
      <BadgeCheck 
        className={cn(
          sizeClasses[size],
          "text-primary relative z-10 drop-shadow-sm"
        )} 
      />
    </div>
  );
}
