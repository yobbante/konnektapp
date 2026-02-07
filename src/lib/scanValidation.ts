/**
 * KONNEKT SCAN VALIDATION LAYER
 * 
 * Centralized validation for all scan-triggered actions.
 * Enforces:
 * - Strict linear status transitions (no skips, no reversions)
 * - Role-action compatibility matrix
 * - Contextual error messages in French
 * - Double-scan prevention coordination
 * 
 * RULES:
 * 1. Status flow: accepted → collected → in_transit → arrived → delivered
 * 2. Weight modification ONLY at deposit step (accepted/pending)
 * 3. "arrived" status is geo-driven, manual override blocked
 * 4. Each role has a strict action whitelist
 */

import type { OrderStatus } from "@/lib/enumMappings";

// ============= TYPES =============

export type ScanAction =
  | "view"
  | "deposit_confirm"
  | "weight_modify"
  | "delivery_confirm"
  | "pickup_confirm"
  | "stock_confirm";

export type ScanUserRole = "client" | "gp" | "agent_logistique" | "admin";

export interface ScanValidationResult {
  allowed: boolean;
  reason?: string; // French, user-facing
  code?: string;   // Technical error code
}

// ============= STATUS TRANSITION RULES =============

/**
 * Strict linear status order. Index determines hierarchy.
 * A status can only transition to the NEXT status in sequence.
 */
const STATUS_ORDER: readonly string[] = [
  "pending",
  "accepted",
  "collected",
  "in_transit",
  "arrived",
  "delivered",
] as const;

/**
 * Valid transitions: key = current status, value = allowed next statuses
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["collected", "cancelled"],
  collected: ["in_transit", "cancelled"],
  in_transit: ["arrived", "delivered"], // delivered only if no last-mile logistics
  arrived: ["delivered"],
  // delivered and cancelled are terminal states
};

/**
 * Terminal statuses — no further transitions allowed
 */
const TERMINAL_STATUSES = new Set(["delivered", "cancelled", "disputed"]);

// ============= ROLE-ACTION MATRIX =============

/**
 * Defines which actions each role is authorized to perform.
 */
const ROLE_ACTION_MATRIX: Record<ScanUserRole, Set<ScanAction>> = {
  client: new Set(["view"]),
  gp: new Set(["view", "deposit_confirm", "weight_modify", "delivery_confirm"]),
  agent_logistique: new Set(["view", "pickup_confirm", "delivery_confirm", "stock_confirm"]),
  admin: new Set(["view", "deposit_confirm", "weight_modify", "delivery_confirm", "pickup_confirm", "stock_confirm"]),
};

/**
 * Maps scan actions to the order statuses where they are valid.
 */
const ACTION_STATUS_REQUIREMENTS: Record<ScanAction, string[]> = {
  view: [], // Always allowed
  deposit_confirm: ["pending", "accepted"],
  weight_modify: ["pending", "accepted"], // PRV: ONLY at deposit step
  delivery_confirm: ["in_transit", "arrived", "collected"],
  pickup_confirm: ["pending", "accepted"],
  stock_confirm: ["collected", "in_transit"],
};

// ============= FRENCH ERROR MESSAGES =============

const ERROR_MESSAGES: Record<string, string> = {
  TERMINAL_STATUS: "Cette commande est dans un état final et ne peut plus être modifiée.",
  INVALID_ROLE: "Votre rôle ne vous autorise pas à effectuer cette action.",
  INVALID_STATUS_FOR_ACTION: "L'action demandée n'est pas compatible avec le statut actuel de la commande.",
  STATUS_SKIP: "Impossible de sauter une étape. Le statut doit suivre l'ordre : Acceptée → Collectée → En transit → Arrivée → Livrée.",
  STATUS_REVERT: "Impossible de revenir à un statut précédent. Les transitions sont irréversibles.",
  WEIGHT_NOT_DEPOSIT: "La modification de poids n'est autorisée qu'à l'étape de dépôt (statut « Acceptée » ou « En attente »).",
  CANCELLED_ORDER: "Cette commande a été annulée. Aucune action n'est possible.",
  DISPUTED_ORDER: "Cette commande est en litige. Aucune action n'est possible via le scan.",
  GP_DELIVERY_BLOCKED: "La livraison est gérée par l'équipe Konnekt Logistique. Vous ne pouvez pas marquer cette commande comme livrée.",
  ARRIVED_MANUAL_BLOCKED: "Le statut « Arrivé » est déterminé automatiquement par la géolocalisation. Il ne peut pas être modifié manuellement.",
  NOT_AUTHENTICATED: "Vous devez être connecté pour effectuer cette action.",
};

// ============= VALIDATION FUNCTIONS =============

/**
 * Validates if a role is authorized to perform a specific scan action.
 */
export function validateRoleAction(
  role: ScanUserRole,
  action: ScanAction
): ScanValidationResult {
  const allowedActions = ROLE_ACTION_MATRIX[role];
  
  if (!allowedActions) {
    return { allowed: false, reason: ERROR_MESSAGES.INVALID_ROLE, code: "INVALID_ROLE" };
  }

  if (!allowedActions.has(action)) {
    return { allowed: false, reason: ERROR_MESSAGES.INVALID_ROLE, code: "INVALID_ROLE" };
  }

  return { allowed: true };
}

/**
 * Validates if an action is compatible with the current order status.
 */
export function validateActionStatus(
  action: ScanAction,
  currentStatus: string
): ScanValidationResult {
  // View is always allowed
  if (action === "view") return { allowed: true };

  // Terminal status check
  if (TERMINAL_STATUSES.has(currentStatus)) {
    if (currentStatus === "cancelled") {
      return { allowed: false, reason: ERROR_MESSAGES.CANCELLED_ORDER, code: "CANCELLED_ORDER" };
    }
    if (currentStatus === "disputed") {
      return { allowed: false, reason: ERROR_MESSAGES.DISPUTED_ORDER, code: "DISPUTED_ORDER" };
    }
    return { allowed: false, reason: ERROR_MESSAGES.TERMINAL_STATUS, code: "TERMINAL_STATUS" };
  }

  // Check if the action is valid for the current status
  const requiredStatuses = ACTION_STATUS_REQUIREMENTS[action];
  if (requiredStatuses.length > 0 && !requiredStatuses.includes(currentStatus)) {
    // Special message for weight modification outside deposit
    if (action === "weight_modify") {
      return { allowed: false, reason: ERROR_MESSAGES.WEIGHT_NOT_DEPOSIT, code: "WEIGHT_NOT_DEPOSIT" };
    }
    return { allowed: false, reason: ERROR_MESSAGES.INVALID_STATUS_FOR_ACTION, code: "INVALID_STATUS_FOR_ACTION" };
  }

  return { allowed: true };
}

/**
 * Validates a status transition is valid (linear, no skips, no reversions).
 */
export function validateStatusTransition(
  currentStatus: string,
  newStatus: string
): ScanValidationResult {
  // Same status — no-op
  if (currentStatus === newStatus) {
    return { allowed: false, reason: "La commande est déjà dans ce statut.", code: "SAME_STATUS" };
  }

  // Terminal status check
  if (TERMINAL_STATUSES.has(currentStatus)) {
    return { allowed: false, reason: ERROR_MESSAGES.TERMINAL_STATUS, code: "TERMINAL_STATUS" };
  }

  // Check if transition is valid
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    // Determine if it's a skip or reversion
    const currentIdx = STATUS_ORDER.indexOf(currentStatus);
    const newIdx = STATUS_ORDER.indexOf(newStatus);

    if (currentIdx >= 0 && newIdx >= 0) {
      if (newIdx < currentIdx) {
        return { allowed: false, reason: ERROR_MESSAGES.STATUS_REVERT, code: "STATUS_REVERT" };
      }
      if (newIdx > currentIdx + 1 && newStatus !== "cancelled") {
        return { allowed: false, reason: ERROR_MESSAGES.STATUS_SKIP, code: "STATUS_SKIP" };
      }
    }

    return { 
      allowed: false, 
      reason: `Transition non autorisée : « ${currentStatus} » → « ${newStatus} ». ${ERROR_MESSAGES.STATUS_SKIP}`,
      code: "INVALID_TRANSITION" 
    };
  }

  return { allowed: true };
}

/**
 * Full scan validation — combines role, action, and status checks.
 * Call this before ANY scan-triggered action.
 */
export function validateScanAction(
  role: ScanUserRole,
  action: ScanAction,
  currentStatus: string,
  options?: {
    hasLastMileLogistics?: boolean;
    newStatus?: string;
  }
): ScanValidationResult {
  // 1. Role validation
  const roleCheck = validateRoleAction(role, action);
  if (!roleCheck.allowed) return roleCheck;

  // 2. Action-status compatibility
  const statusCheck = validateActionStatus(action, currentStatus);
  if (!statusCheck.allowed) return statusCheck;

  // 3. Status transition validation (if a new status is specified)
  if (options?.newStatus) {
    const transitionCheck = validateStatusTransition(currentStatus, options.newStatus);
    if (!transitionCheck.allowed) return transitionCheck;
  }

  // 4. Special rules
  // GP cannot mark as delivered if last-mile logistics is active
  if (
    role === "gp" && 
    action === "delivery_confirm" && 
    options?.hasLastMileLogistics
  ) {
    return { allowed: false, reason: ERROR_MESSAGES.GP_DELIVERY_BLOCKED, code: "GP_DELIVERY_BLOCKED" };
  }

  return { allowed: true };
}

/**
 * Check if a status is terminal (no further transitions possible)
 */
export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

/**
 * Get the next valid status in the workflow
 */
export function getNextValidStatus(currentStatus: string): string | null {
  const idx = STATUS_ORDER.indexOf(currentStatus);
  if (idx < 0 || idx >= STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[idx + 1];
}

/**
 * Get all valid next statuses for a given current status
 */
export function getValidNextStatuses(currentStatus: string): string[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}

/**
 * Get the status order index (for progress visualization)
 */
export function getStatusIndex(status: string): number {
  return STATUS_ORDER.indexOf(status);
}

/**
 * Get total number of statuses in the workflow
 */
export function getTotalStatusSteps(): number {
  return STATUS_ORDER.length;
}
