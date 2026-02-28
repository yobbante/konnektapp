/**
 * ProfileHeader — Identity & KYC badge
 */
import { User, Camera } from "lucide-react";
import { getKonnektId } from "@/lib/konnektId";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export type ClientKYCLevel = 0 | 1 | 2;

const KYC_CONFIG: Record<ClientKYCLevel, { label: string; badge: string; color: string; bg: string }> = {
  0: { label: "Starter", badge: "🔘", color: "text-muted-foreground", bg: "bg-muted" },
  1: { label: "Vérifié", badge: "✅", color: "text-emerald-600", bg: "bg-emerald-500/10" },
  2: { label: "Confirmé", badge: "🏆", color: "text-amber-600", bg: "bg-amber-500/10" },
};

interface ProfileHeaderProps {
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  memberSince: string;
  kycLevel: ClientKYCLevel;
  protectionScore: number;
  userId?: string;
}

export function ProfileHeader({
  fullName, email, avatarUrl, memberSince, kycLevel, protectionScore, userId
}: ProfileHeaderProps) {
  const cfg = KYC_CONFIG[kycLevel];
  const shortId = getKonnektId(userId);

  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-start gap-4 mb-3">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border-2 border-primary/20">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-2xl object-cover" />
            ) : (
              <User className="w-8 h-8 text-primary" />
            )}
          </div>
          <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
            <Camera className="w-3 h-3 text-primary-foreground" />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg truncate">{fullName || "Utilisateur"}</h2>
          <p className="text-sm text-muted-foreground truncate">{email}</p>
          <div className="flex items-center gap-2 mt-1">
            {shortId && <span className="text-xs text-muted-foreground font-mono">{shortId}</span>}
            <Badge variant="outline" className={`text-[10px] px-2 py-0 ${cfg.color} ${cfg.bg} border-transparent`}>
              {cfg.badge} {cfg.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Protection Score */}
      <div className="pt-3 border-t border-border">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Compte sécurisé</span>
          <span className={protectionScore >= 100 ? "text-emerald-500 font-medium" : "text-primary font-medium"}>
            {protectionScore}%
          </span>
        </div>
        <Progress value={protectionScore} className="h-2" />
        {protectionScore < 100 && (
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Complétez votre profil pour débloquer plus d'avantages
          </p>
        )}
      </div>
    </div>
  );
}
