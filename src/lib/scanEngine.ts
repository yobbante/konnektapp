/**
 * KONNEKT SCAN ENGINE — Frontend Module
 * 
 * Central client-side interface to the unified scan-engine backend.
 * All scan interactions go through this module.
 * 
 * Usage:
 *   import { KonnektScanEngine } from "@/lib/scanEngine";
 *   const result = await KonnektScanEngine.resolve(scannedData);
 *   KonnektScanEngine.executeAction(result);
 */

import { supabase } from "@/integrations/supabase/client";

// ═══════════════ TYPES ═══════════════

export type QRType =
  | "QR_COLIS"
  | "QR_USER"
  | "QR_GP"
  | "QR_PAYMENT"
  | "QR_ADJUSTMENT"
  | "QR_CONFIRMATION"
  | "QR_EXTERNAL"
  | "QR_ADMIN"
  | "QR_MISSION";

export type EngineStatus = "scanned" | "validated" | "authorized" | "executed" | "failed";

export type ScanScenario =
  // GP scenarios
  | "gp_deposit"
  | "gp_transit"
  | "gp_delivery"
  | "gp_completed"
  | "gp_cancelled"
  | "gp_view"
  | "gp_adjust_weight"
  | "gp_verify_payment"
  | "gp_client_with_orders"
  | "gp_client_no_orders"
  // Client scenarios
  | "client_view"
  | "client_confirm_reception"
  | "client_view_gp"
  | "client_pay"
  | "client_payment_status"
  | "client_pay_supplement"
  // Admin scenarios
  | "admin_full_access"
  | "admin_user_view"
  | "admin_payment"
  | "admin_adjustment"
  // External scenarios
  | "external_view"
  | "external_discovery"
  | "external_url"
  | "external_text"
  // Error scenarios
  | "order_not_found"
  | "user_not_found"
  | "gp_not_found"
  | "unauthorized"
  | "invalid"
  | "invalid_input"
  | "rate_limited"
  | "engine_error"
  | "no_escrow"
  | string;

export interface ScanEngineResponse {
  status: EngineStatus;
  qr_type: QRType;
  scenario: ScanScenario;
  next_action: string;
  message: string;
  financial_impact?: {
    amount?: number;
    currency?: string;
    type?: string;
  } | null;
  data?: Record<string, any>;
  error?: string;
}

export interface ScanEngineAction {
  type: "navigate" | "sheet" | "toast" | "external" | "none";
  target?: string;
  data?: Record<string, any>;
}

// ═══════════════ CORE ENGINE ═══════════════

export const KonnektScanEngine = {
  /**
   * Resolve a scanned QR code through the backend engine.
   * This is the SINGLE entry point for all scan operations.
   */
  async resolve(scannedData: string, role?: string): Promise<ScanEngineResponse> {
    try {
      const { data, error } = await supabase.functions.invoke("scan-engine", {
        body: { scanned_data: scannedData, role },
      });

      if (error) {
        console.error("Scan engine invocation error:", error);
        return {
          status: "failed",
          qr_type: "QR_EXTERNAL",
          scenario: "engine_error",
          next_action: "none",
          message: "Erreur de communication avec le moteur de scan.",
        };
      }

      return data as ScanEngineResponse;
    } catch (err) {
      console.error("Scan engine error:", err);
      return {
        status: "failed",
        qr_type: "QR_EXTERNAL",
        scenario: "engine_error",
        next_action: "none",
        message: "Erreur inattendue. Réessayez.",
      };
    }
  },

  /**
   * Determine the frontend action to take based on engine response.
   * Maps backend scenarios to UI actions.
   */
  getAction(response: ScanEngineResponse): ScanEngineAction {
    // Failed states
    if (response.status === "failed") {
      return { type: "toast", data: { title: "❌ Erreur", description: response.message, variant: "destructive" } };
    }

    // Redirect scenarios
    if (response.data?.redirect) {
      return { type: "navigate", target: response.data.redirect };
    }

    // External URL
    if (response.scenario === "external_url" && response.data?.raw) {
      return { type: "external", target: response.data.raw };
    }

    // Scenarios that open a sheet/modal with order data
    const sheetScenarios = new Set([
      "gp_deposit", "gp_transit", "gp_delivery", "gp_completed",
      "gp_view", "gp_adjust_weight", "gp_client_with_orders",
      "client_view", "client_confirm_reception",
      "admin_full_access", "admin_user_view",
    ]);

    if (sheetScenarios.has(response.scenario)) {
      return { type: "sheet", data: response.data };
    }

    // Payment scenarios
    if (response.scenario === "client_pay" || response.scenario === "client_pay_supplement") {
      const orderId = response.data?.order?.id || response.data?.escrow?.order_id;
      if (response.scenario === "client_pay_supplement") {
        return { type: "navigate", target: `/pay-supplement?orderId=${orderId}` };
      }
      return { type: "sheet", data: response.data };
    }

    // GP verify payment
    if (response.scenario === "gp_verify_payment") {
      return { type: "sheet", data: response.data };
    }

    // External discovery
    if (response.scenario === "external_discovery") {
      return { type: "navigate", target: response.data?.redirect || "/" };
    }

    // External text — propose manual
    if (response.scenario === "external_text") {
      return { type: "sheet", data: { ...response.data, show_manual_options: true } };
    }

    // Default: show as toast
    return { type: "toast", data: { title: "ℹ️ Scan", description: response.message } };
  },

  /**
   * Quick check: is the scan result actionable (not just informational)?
   */
  isActionable(response: ScanEngineResponse): boolean {
    return response.status === "authorized" && response.next_action !== "none" && response.next_action !== "view";
  },

  /**
   * Get a user-friendly label for a QR type
   */
  getQRTypeLabel(qrType: QRType): string {
    const labels: Record<QRType, string> = {
      QR_COLIS: "Colis",
      QR_USER: "Utilisateur",
      QR_GP: "Transporteur",
      QR_PAYMENT: "Paiement",
      QR_ADJUSTMENT: "Ajustement",
      QR_CONFIRMATION: "Confirmation",
      QR_EXTERNAL: "Externe",
      QR_ADMIN: "Admin",
      QR_MISSION: "Mission",
    };
    return labels[qrType] || "Inconnu";
  },

  /**
   * Get a color class for a QR type
   */
  getQRTypeColor(qrType: QRType): string {
    const colors: Record<QRType, string> = {
      QR_COLIS: "bg-primary/10 text-primary",
      QR_USER: "bg-secondary/10 text-secondary",
      QR_GP: "bg-accent/10 text-accent",
      QR_PAYMENT: "bg-success/10 text-success",
      QR_ADJUSTMENT: "bg-warning/10 text-warning",
      QR_CONFIRMATION: "bg-success/10 text-success",
      QR_EXTERNAL: "bg-muted text-muted-foreground",
      QR_ADMIN: "bg-destructive/10 text-destructive",
      QR_MISSION: "bg-primary/10 text-primary",
    };
    return colors[qrType] || "bg-muted text-muted-foreground";
  },

  /**
   * Get icon name for scenario (for UI rendering)
   */
  getScenarioIcon(scenario: ScanScenario): string {
    if (scenario.startsWith("gp_deposit")) return "Package";
    if (scenario.startsWith("gp_transit")) return "Truck";
    if (scenario.startsWith("gp_delivery")) return "CheckCircle";
    if (scenario.startsWith("gp_adjust")) return "Scale";
    if (scenario.startsWith("client_confirm")) return "CheckCircle";
    if (scenario.startsWith("client_pay")) return "CreditCard";
    if (scenario.startsWith("client_view")) return "Eye";
    if (scenario.startsWith("admin")) return "Shield";
    if (scenario.startsWith("external")) return "Globe";
    return "QrCode";
  },
};
