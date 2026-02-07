/**
 * Konnekt Travel Pass — GP Dashboard Card
 * 
 * Shows KTP status, trust score breakdown, financial effects,
 * and action recommendations to improve the score.
 */

import { motion } from "framer-motion";
import {
  Shield, TrendingUp, Zap, Clock, AlertTriangle,
  ChevronRight, ScanLine, Package, Star, Award,
  Ban, DollarSign, Percent, Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  useKTPStatus,
  KTP_LEVELS,
  PAYMENT_RULE_LABELS,
  getTrustScoreColor,
  getTrustScoreBgColor,
  getTrustScoreLabel,
  type KTPLevel,
} from "@/hooks/useKTPStatus";
import { cn } from "@/lib/utils";

interface KTPDashboardCardProps {
  gpId: string;
  className?: string;
}

// Score category display config
const SCORE_CATEGORIES = [
  { key: "scan_compliance_score", label: "Scan", icon: ScanLine, weight: "40%", maxLabel: "100% scans" },
  { key: "delivery_punctuality_score", label: "Ponctualité", icon: Clock, weight: "20%", maxLabel: "Délais respectés" },
  { key: "delivery_history_score", label: "Historique", icon: Package, weight: "20%", maxLabel: "0 litige" },
  { key: "client_satisfaction_score", label: "Clients", icon: Star, weight: "10%", maxLabel: "Avis positifs" },
  { key: "platform_discipline_score", label: "Discipline", icon: Shield, weight: "10%", maxLabel: "Règles respectées" },
] as const;

export function KTPDashboardCard({ gpId, className }: KTPDashboardCardProps) {
  const { ktpData, loading, levelConfig, isSuspended, scanComplianceRate, nextLevel } = useKTPStatus({
    gpId,
    realtime: true,
  });

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="p-6">
          <div className="h-32 bg-muted rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!ktpData) return null;

  const trustScore = ktpData.trust_score;
  const level = ktpData.ktp_level as KTPLevel;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={cn(
        "overflow-hidden border-2 transition-all",
        isSuspended ? "border-destructive/50" : `${levelConfig.borderColor}`,
        className
      )}>
        {/* Header with gradient */}
        <div className={cn(
          "relative p-5 text-white bg-gradient-to-r",
          isSuspended ? "from-destructive to-destructive/80" : levelConfig.gradient
        )}>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{isSuspended ? "🔴" : levelConfig.icon}</span>
                <div>
                  <h3 className="font-bold text-lg">Konnekt Travel Pass</h3>
                  <p className="text-sm text-white/80">
                    {isSuspended ? "Suspendu" : levelConfig.label}
                  </p>
                </div>
              </div>
              <Badge className="bg-white/20 text-white border-white/30 text-xs backdrop-blur-sm">
                KTP™
              </Badge>
            </div>

            {/* Trust Score circle */}
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="3"
                  />
                  <motion.path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "0, 100" }}
                    animate={{ strokeDasharray: `${trustScore}, 100` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold">{trustScore}</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white/90">{getTrustScoreLabel(trustScore)}</p>
                <p className="text-xs text-white/70 mt-0.5">Trust Score™</p>
                {nextLevel && (
                  <p className="text-xs text-white/60 mt-1">
                    +{nextLevel.remaining} pts → {nextLevel.label}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-1/2 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />
        </div>

        <CardContent className="p-4 space-y-4">
          {/* Suspension alert */}
          {isSuspended && (
            <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
              <Ban className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">KTP Suspendu</p>
                <p className="text-xs text-destructive/80 mt-0.5">
                  {ktpData.suspension_reason || "Règle violée. Résolvez le problème pour réactiver."}
                </p>
              </div>
            </div>
          )}

          {/* Financial effects */}
          <div className="grid grid-cols-3 gap-2">
            <EffectPill
              icon={<Percent className="w-3.5 h-3.5" />}
              label="Commission"
              value={`${ktpData.commission_rate}%`}
              highlight={ktpData.commission_rate < 5}
            />
            <EffectPill
              icon={<DollarSign className="w-3.5 h-3.5" />}
              label="Paiement"
              value={
                ktpData.payment_release_rule === "instant" ? "Immédiat" :
                ktpData.payment_release_rule === "after_transit" ? "Transit" :
                ktpData.payment_release_rule === "after_arrival" ? "Arrivée" : "Livraison"
              }
              highlight={ktpData.payment_release_rule !== "after_delivery"}
            />
            <EffectPill
              icon={<Shield className="w-3.5 h-3.5" />}
              label="Assurance"
              value={`x${ktpData.insurance_coefficient}`}
              highlight={ktpData.insurance_coefficient < 1}
            />
          </div>

          <Separator />

          {/* Score breakdown */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Détail du score
            </p>
            {SCORE_CATEGORIES.map(({ key, label, icon: Icon, weight }) => {
              const score = ktpData[key] as number;
              return (
                <div key={key} className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{label}</span>
                  <Progress value={score} className="flex-1 h-1.5" />
                  <span className={cn("text-xs font-mono w-8 text-right", getTrustScoreColor(score))}>
                    {score}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 w-8">{weight}</span>
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Action recommendation */}
          {nextLevel && (
            <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Prochain objectif</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {getRecommendation(ktpData)}
              </p>
            </div>
          )}

          {/* Last evaluation */}
          <p className="text-[10px] text-muted-foreground text-center">
            Dernière évaluation : {new Date(ktpData.last_evaluated_at).toLocaleDateString("fr-FR")}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Effect pill sub-component
function EffectPill({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight: boolean;
}) {
  return (
    <div className={cn(
      "flex flex-col items-center gap-1 p-2 rounded-xl border text-center",
      highlight
        ? "bg-primary/5 border-primary/20"
        : "bg-muted/30 border-border"
    )}>
      <div className={cn("flex items-center gap-1", highlight ? "text-primary" : "text-muted-foreground")}>
        {icon}
      </div>
      <span className={cn("text-sm font-bold", highlight ? "text-primary" : "text-foreground")}>
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

// Get personalized action recommendation
function getRecommendation(ktp: KTPDashboardCardProps extends never ? never : any): string {
  if (ktp.scan_compliance_score < 70) {
    return "Effectuez le scan à chaque étape pour augmenter votre score et débloquer le paiement accéléré.";
  }
  if (ktp.delivery_punctuality_score < 60) {
    return "Respectez les délais estimés pour améliorer votre ponctualité et monter de niveau.";
  }
  if (ktp.client_satisfaction_score < 50) {
    return "Améliorez la communication avec vos clients pour obtenir de meilleurs avis.";
  }
  if (ktp.trust_score < 75) {
    return "Continuez vos livraisons avec scan pour atteindre le niveau Verified et le paiement J+1.";
  }
  if (ktp.trust_score < 90) {
    return "Vous êtes proche du niveau Pro ! Maintenez votre scan à 100% et zéro litige.";
  }
  return "Excellent ! Maintenez votre performance pour garder vos avantages Pro.";
}
