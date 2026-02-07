/**
 * KTP Trust Score Evaluation Engine
 * 
 * Calculates the composite trust score from:
 * - Scan compliance (40%)
 * - Delivery punctuality (20%)
 * - Delivery history / disputes (20%)
 * - Client satisfaction (10%)
 * - Platform discipline (10%)
 * 
 * Called periodically or after key events (scan, delivery, dispute resolution).
 */

import { supabase } from "@/integrations/supabase/client";

interface EvaluationResult {
  trust_score: number;
  scan_compliance_score: number;
  delivery_punctuality_score: number;
  delivery_history_score: number;
  client_satisfaction_score: number;
  platform_discipline_score: number;
  ktp_level: string;
  commission_rate: number;
  payment_release_rule: string;
  insurance_coefficient: number;
  total_scans: number;
  total_expected_scans: number;
  total_deliveries_evaluated: number;
  total_on_time_deliveries: number;
}

/**
 * Evaluate and update KTP for a GP
 * This runs entirely client-side using existing data.
 * In production, this would be a server-side cron/trigger.
 */
export async function evaluateKTPForGP(gpId: string): Promise<EvaluationResult | null> {
  try {
    // Fetch all required data in parallel
    const [scanData, orderData, reviewData, reputationData] = await Promise.all([
      // Scan logs for this GP
      supabase
        .from("scan_logs" as any)
        .select("scan_type, created_at")
        .eq("scanned_by", gpId)
        .order("created_at", { ascending: false })
        .limit(200) as any,

      // Orders handled by this GP
      supabase
        .from("orders")
        .select("id, status, created_at, updated_at")
        .eq("gp_id", gpId)
        .in("status", ["delivered", "collected", "in_transit", "pending"] as any[])
        .limit(100),

      // Reviews for this GP
      supabase
        .from("reviews")
        .select("rating")
        .eq("gp_id", gpId)
        .limit(100),

      // Existing reputation data
      supabase
        .from("transporter_reputation")
        .select("*")
        .eq("gp_id", gpId)
        .maybeSingle(),
    ]);

    const orders = orderData.data || [];
    const scans = scanData.data || [];
    const reviews = reviewData.data || [];
    const reputation = reputationData.data;

    // Also fetch disputes for these specific orders
    const orderIds = orders.map(o => o.id);
    let disputes: any[] = [];
    if (orderIds.length > 0) {
      const { data: disputeResults } = await supabase
        .from("disputes")
        .select("id, status, category")
        .in("order_id", orderIds);
      disputes = disputeResults || [];
    }

    // =========================================
    // 1. SCAN COMPLIANCE (40%)
    // =========================================
    const deliveredOrders = orders.filter(o => o.status === "delivered").length;
    // Each delivery should have ~3 scans (collect, transit/arrive, deliver)
    const expectedScans = Math.max(deliveredOrders * 3, 1);
    const gpScans = scans.length;
    const scanRate = Math.min(gpScans / expectedScans, 1);
    const scanComplianceScore = Math.round(scanRate * 100);

    // =========================================
    // 2. DELIVERY PUNCTUALITY (20%)
    // =========================================
    // Based on orders completed vs total active
    const totalEvaluated = orders.length;
    const completedOrders = orders.filter(o => o.status === "delivered").length;
    const completionRate = totalEvaluated > 0 ? completedOrders / totalEvaluated : 1;
    const deliveryPunctualityScore = Math.round(completionRate * 100);

    // =========================================
    // 3. DELIVERY HISTORY / DISPUTES (20%)
    // =========================================
    const activeDisputes = disputes.filter(d => d.status !== "closed").length;
    const totalDisputes = disputes.length;
    // Penalize based on dispute ratio
    const disputeRatio = totalEvaluated > 0 ? totalDisputes / totalEvaluated : 0;
    const deliveryHistoryScore = Math.round(Math.max(0, (1 - disputeRatio * 5)) * 100);

    // =========================================
    // 4. CLIENT SATISFACTION (10%)
    // =========================================
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 3; // Default neutral
    const clientSatisfactionScore = Math.round((avgRating / 5) * 100);

    // =========================================
    // 5. PLATFORM DISCIPLINE (10%)
    // =========================================
    // Based on reputation incidents
    const warnings = reputation?.total_warnings || 0;
    const suspensions = reputation?.total_suspensions || 0;
    const disciplinePenalty = Math.min((warnings * 10) + (suspensions * 30), 100);
    const platformDisciplineScore = Math.max(0, 100 - disciplinePenalty);

    // =========================================
    // COMPOSITE TRUST SCORE
    // =========================================
    const trustScore = Math.round(
      scanComplianceScore * 0.4 +
      deliveryPunctualityScore * 0.2 +
      deliveryHistoryScore * 0.2 +
      clientSatisfactionScore * 0.1 +
      platformDisciplineScore * 0.1
    );

    // Derive KTP effects from trust score
    const ktpLevel = trustScore >= 90 ? "pro" : trustScore >= 75 ? "verified" : "basic";
    const commissionRate = trustScore >= 90 ? 2 : trustScore >= 85 ? 3 : trustScore >= 75 ? 4 : 5;
    const paymentRule = trustScore >= 90 ? "instant" : trustScore >= 85 ? "after_transit" : trustScore >= 75 ? "after_arrival" : "after_delivery";
    const insuranceCoeff = trustScore >= 90 ? 0.6 : trustScore >= 85 ? 0.8 : trustScore >= 75 ? 0.9 : 1.0;

    const result: EvaluationResult = {
      trust_score: trustScore,
      scan_compliance_score: scanComplianceScore,
      delivery_punctuality_score: deliveryPunctualityScore,
      delivery_history_score: deliveryHistoryScore,
      client_satisfaction_score: clientSatisfactionScore,
      platform_discipline_score: platformDisciplineScore,
      ktp_level: ktpLevel,
      commission_rate: commissionRate,
      payment_release_rule: paymentRule,
      insurance_coefficient: insuranceCoeff,
      total_scans: gpScans,
      total_expected_scans: expectedScans,
      total_deliveries_evaluated: totalEvaluated,
      total_on_time_deliveries: completedOrders,
    };

    // Get current KTP to check for level changes
    const { data: currentKtp } = await supabase
      .from("ktp_status")
      .select("ktp_level, trust_score")
      .eq("gp_id", gpId)
      .maybeSingle();

    // Update KTP status
    const { error: updateError } = await supabase
      .from("ktp_status")
      .upsert({
        gp_id: gpId,
        ...result,
        last_evaluated_at: new Date().toISOString(),
      }, { onConflict: "gp_id" });

    if (updateError) {
      console.error("Error updating KTP:", updateError);
      return null;
    }

    // Log level change if applicable
    if (currentKtp && currentKtp.ktp_level !== ktpLevel) {
      await supabase.from("ktp_history").insert({
        gp_id: gpId,
        old_level: currentKtp.ktp_level,
        new_level: ktpLevel,
        old_trust_score: currentKtp.trust_score,
        new_trust_score: trustScore,
        reason: trustScore > currentKtp.trust_score ? "Score amélioré" : "Score dégradé",
        triggered_by: "system",
      });
    }

    return result;
  } catch (error) {
    console.error("KTP evaluation error:", error);
    return null;
  }
}
