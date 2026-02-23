import { Shield, ShieldCheck, Star, Clock, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface GPKYCBadgeProps {
  status: string;
  kycLevel?: number;
  size?: "sm" | "md";
  showLabel?: boolean;
}

const CONFIG: Record<string, { icon: typeof Shield; label: string; color: string; bg: string }> = {
  starter: { icon: Shield, label: "Starter", color: "text-muted-foreground", bg: "bg-muted/60 border-border" },
  pending: { icon: Clock, label: "En attente", color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/30" },
  verified: { icon: ShieldCheck, label: "Vérifié", color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/30" },
  premium: { icon: Star, label: "Premium", color: "text-amber-500", bg: "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-400/40" },
  suspended: { icon: Ban, label: "Suspendu", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
  rejected: { icon: Ban, label: "Rejeté", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
};

export function GPKYCBadge({ status, kycLevel = 0, size = "md", showLabel = true }: GPKYCBadgeProps) {
  const cfg = CONFIG[status] || CONFIG.starter;
  const Icon = cfg.icon;
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "gap-1 font-medium border",
        cfg.bg, cfg.color,
        size === "sm" ? "text-[9px] px-1.5 py-0" : "text-[10px] px-2 py-0.5"
      )}
    >
      <Icon className={iconSize} />
      {showLabel && cfg.label}
    </Badge>
  );
}

/** Helper to get the effective display status */
export function getGPDisplayStatus(
  status: string, 
  kycLevel: number,
  documents?: {
    id_document_url?: string | null;
    selfie_url?: string | null;
    business_registration_url?: string | null;
    transport_license_url?: string | null;
  }
): string {
  if (status === "suspended" || status === "rejected") return status;
  if (kycLevel >= 2) return "premium";
  
  // Verified requires: status=verified + all core docs uploaded
  if (status === "verified") {
    if (documents) {
      const hasCoreDocs = !!(documents.id_document_url && documents.selfie_url);
      if (!hasCoreDocs) return "pending"; // Docs missing → downgrade display
    }
    return "verified";
  }
  if (kycLevel >= 1) return "verified";
  if (status === "pending") return "pending";
  return "starter";
}
