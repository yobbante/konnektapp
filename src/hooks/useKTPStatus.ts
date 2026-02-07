/**
 * Konnekt Travel Pass (KTP) — Core Hook
 * 
 * Fetches KTP status, trust score, and financial effects for a GP.
 * Supports real-time updates via Supabase channel subscription.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type KTPLevel = "inactive" | "basic" | "verified" | "pro";

export type PaymentReleaseRule = "after_delivery" | "after_arrival" | "after_transit" | "instant";

export interface KTPData {
  id: string;
  gp_id: string;
  ktp_level: KTPLevel;
  trust_score: number;
  
  // Score breakdown
  scan_compliance_score: number;
  delivery_punctuality_score: number;
  delivery_history_score: number;
  client_satisfaction_score: number;
  platform_discipline_score: number;
  
  // Financial effects
  commission_rate: number;
  payment_release_rule: PaymentReleaseRule;
  insurance_coefficient: number;
  
  // Suspension
  suspended_at: string | null;
  suspension_reason: string | null;
  
  // Metrics
  total_scans: number;
  total_expected_scans: number;
  total_deliveries_evaluated: number;
  total_on_time_deliveries: number;
  
  last_evaluated_at: string;
}

export interface KTPLevelConfig {
  level: KTPLevel;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  gradient: string;
}

export const KTP_LEVELS: Record<KTPLevel, KTPLevelConfig> = {
  inactive: {
    level: "inactive",
    label: "Inactif",
    description: "Pass non activé",
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
    borderColor: "border-muted",
    icon: "🔒",
    gradient: "from-slate-400 to-slate-500",
  },
  basic: {
    level: "basic",
    label: "Basic",
    description: "Pass d'entrée — accès standard",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    icon: "🟢",
    gradient: "from-emerald-400 to-emerald-600",
  },
  verified: {
    level: "verified",
    label: "Verified",
    description: "Pass vérifié — paiement accéléré",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    icon: "🔵",
    gradient: "from-blue-400 to-blue-600",
  },
  pro: {
    level: "pro",
    label: "Pro",
    description: "Pass élite — paiement instantané",
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    icon: "🟣",
    gradient: "from-violet-400 to-purple-600",
  },
};

// Payment rule labels
export const PAYMENT_RULE_LABELS: Record<PaymentReleaseRule, string> = {
  after_delivery: "Après livraison confirmée",
  after_arrival: "Après arrivée à destination",
  after_transit: "Dès mise en transit",
  instant: "Dès paiement client",
};

// Trust score color utility
export function getTrustScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-destructive";
}

export function getTrustScoreBgColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-destructive";
}

export function getTrustScoreLabel(score: number): string {
  if (score >= 80) return "Très fiable";
  if (score >= 60) return "Fiable";
  return "À améliorer";
}

interface UseKTPStatusOptions {
  gpId?: string;
  realtime?: boolean;
}

export function useKTPStatus({ gpId, realtime = false }: UseKTPStatusOptions = {}) {
  const [ktpData, setKtpData] = useState<KTPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKTP = useCallback(async () => {
    if (!gpId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("ktp_status")
        .select("*")
        .eq("gp_id", gpId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setKtpData(data as unknown as KTPData);
      } else {
        // Auto-create basic KTP for existing GPs
        const { data: newKtp, error: insertError } = await supabase
          .from("ktp_status")
          .insert({ gp_id: gpId, ktp_level: "basic", trust_score: 50 })
          .select()
          .single();

        if (!insertError && newKtp) {
          setKtpData(newKtp as unknown as KTPData);
        }
      }
    } catch (err) {
      console.error("Error fetching KTP status:", err);
      setError("Impossible de charger le Travel Pass");
    } finally {
      setLoading(false);
    }
  }, [gpId]);

  useEffect(() => {
    fetchKTP();
  }, [fetchKTP]);

  // Real-time subscription
  useEffect(() => {
    if (!realtime || !gpId) return;

    const channel = supabase
      .channel(`ktp-${gpId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ktp_status",
          filter: `gp_id=eq.${gpId}`,
        },
        (payload) => {
          if (payload.new) {
            setKtpData(payload.new as unknown as KTPData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gpId, realtime]);

  const levelConfig = ktpData ? KTP_LEVELS[ktpData.ktp_level] : KTP_LEVELS.inactive;

  const isSuspended = !!ktpData?.suspended_at;

  const scanComplianceRate = ktpData && ktpData.total_expected_scans > 0
    ? Math.round((ktpData.total_scans / ktpData.total_expected_scans) * 100)
    : 100;

  const onTimeRate = ktpData && ktpData.total_deliveries_evaluated > 0
    ? Math.round((ktpData.total_on_time_deliveries / ktpData.total_deliveries_evaluated) * 100)
    : 100;

  // Next level info
  const getNextLevelInfo = () => {
    if (!ktpData) return null;
    const score = ktpData.trust_score;
    if (score >= 90) return null; // Already Pro
    if (score >= 75) return { target: 90, label: "Pro", remaining: 90 - score };
    return { target: 75, label: "Verified", remaining: 75 - score };
  };

  return {
    ktpData,
    loading,
    error,
    levelConfig,
    isSuspended,
    scanComplianceRate,
    onTimeRate,
    nextLevel: getNextLevelInfo(),
    refetch: fetchKTP,
  };
}

/**
 * Lightweight hook for client-facing KTP display (just level + score)
 */
export function useKTPPublic(gpId: string | undefined) {
  const [data, setData] = useState<{ ktp_level: KTPLevel; trust_score: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gpId) { setLoading(false); return; }

    supabase
      .from("ktp_status")
      .select("ktp_level, trust_score")
      .eq("gp_id", gpId)
      .maybeSingle()
      .then(({ data: result }) => {
        if (result) setData(result as unknown as { ktp_level: KTPLevel; trust_score: number });
        setLoading(false);
      });
  }, [gpId]);

  return { data, loading, levelConfig: data ? KTP_LEVELS[data.ktp_level] : null };
}
