/**
 * CENTRALIZED ENUM MAPPINGS
 * 
 * This file contains ALL enum mappings used across the application.
 * - Database values: lowercase, snake_case, English only
 * - Display labels: French for UI
 * 
 * IMPORTANT RULES:
 * 1. NEVER send display labels to the database
 * 2. Always use the enum key when interacting with Supabase
 * 3. Use helper functions to get labels for display
 * 4. Validate values before any database operation
 */

// ============= ORDER STATUS =============
export const ORDER_STATUS = {
  pending: "pending",
  accepted: "accepted",
  collected: "collected",
  in_transit: "in_transit",
  delivered: "delivered",
  cancelled: "cancelled",
  disputed: "disputed",
} as const;

export type OrderStatus = keyof typeof ORDER_STATUS;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  collected: "Collectée",
  in_transit: "En transit",
  delivered: "Livrée",
  cancelled: "Annulée",
  disputed: "En litige",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "warning",
  accepted: "default",
  collected: "secondary",
  in_transit: "secondary",
  delivered: "success",
  cancelled: "destructive",
  disputed: "destructive",
};

export const ORDER_STATUS_WORKFLOW: Partial<Record<OrderStatus, { nextStatus: OrderStatus; nextLabel: string }>> = {
  pending: { nextStatus: "accepted", nextLabel: "Accepter" },
  accepted: { nextStatus: "collected", nextLabel: "Marquer collecté" },
  collected: { nextStatus: "in_transit", nextLabel: "En livraison" },
  in_transit: { nextStatus: "delivered", nextLabel: "Marquer livré" },
};

// ============= GP STATUS =============
export const GP_STATUS = {
  pending: "pending",
  verified: "verified",
  suspended: "suspended",
  rejected: "rejected",
} as const;

export type GpStatus = keyof typeof GP_STATUS;

export const GP_STATUS_LABELS: Record<GpStatus, string> = {
  pending: "En attente",
  verified: "Vérifié",
  suspended: "Suspendu",
  rejected: "Rejeté",
};

export const GP_STATUS_COLORS: Record<GpStatus, string> = {
  pending: "warning",
  verified: "success",
  suspended: "destructive",
  rejected: "destructive",
};

// ============= OFFER STATUS =============
export const OFFER_STATUS = {
  active: "active",
  paused: "paused",
  expired: "expired",
  completed: "completed",
} as const;

export type OfferStatus = keyof typeof OFFER_STATUS;

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  active: "Active",
  paused: "En pause",
  expired: "Expirée",
  completed: "Terminée",
};

export const OFFER_STATUS_COLORS: Record<OfferStatus, string> = {
  active: "success",
  paused: "warning",
  expired: "secondary",
  completed: "default",
};

// ============= GP TYPE (Transport Type) =============
export const GP_TYPE = {
  express: "express",
  routier: "routier",
  maritime: "maritime",
  aerien: "aerien",
  voyageur: "voyageur",
  agence: "agence",
} as const;

export type GpType = keyof typeof GP_TYPE;

export const GP_TYPE_LABELS: Record<GpType, string> = {
  express: "Express",
  routier: "Transport Routier",
  maritime: "Transport Maritime",
  aerien: "Transport Aérien",
  voyageur: "Voyageur / GP",
  agence: "Agence de Voyage",
};

// ============= DISPUTE STATUS =============
export const DISPUTE_STATUS = {
  open: "open",
  under_review: "under_review",
  awaiting_response: "awaiting_response",
  provisional_decision: "provisional_decision",
  closed: "closed",
} as const;

export type DisputeStatus = keyof typeof DISPUTE_STATUS;

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  open: "Ouvert",
  under_review: "En cours d'examen",
  awaiting_response: "En attente de réponse",
  provisional_decision: "Décision provisoire",
  closed: "Fermé",
};

export const DISPUTE_STATUS_COLORS: Record<DisputeStatus, string> = {
  open: "warning",
  under_review: "secondary",
  awaiting_response: "default",
  provisional_decision: "primary",
  closed: "success",
};

// ============= DISPUTE CATEGORY =============
export const DISPUTE_CATEGORY = {
  delay_unjustified: "delay_unjustified",
  partial_loss: "partial_loss",
  total_loss: "total_loss",
  deterioration: "deterioration",
  non_conformity: "non_conformity",
  transporter_silence: "transporter_silence",
  client_fault: "client_fault",
} as const;

export type DisputeCategory = keyof typeof DISPUTE_CATEGORY;

export const DISPUTE_CATEGORY_LABELS: Record<DisputeCategory, string> = {
  delay_unjustified: "Retard injustifié",
  partial_loss: "Perte partielle",
  total_loss: "Perte totale",
  deterioration: "Détérioration",
  non_conformity: "Non-conformité",
  transporter_silence: "Silence du transporteur",
  client_fault: "Faute du client",
};

// ============= REPUTATION STATUS =============
export const REPUTATION_STATUS = {
  verified: "verified",
  under_observation: "under_observation",
  suspended: "suspended",
  excluded: "excluded",
} as const;

export type ReputationStatus = keyof typeof REPUTATION_STATUS;

export const REPUTATION_STATUS_LABELS: Record<ReputationStatus, string> = {
  verified: "Vérifié",
  under_observation: "Sous observation",
  suspended: "Suspendu",
  excluded: "Exclu",
};

export const REPUTATION_STATUS_COLORS: Record<ReputationStatus, string> = {
  verified: "success",
  under_observation: "warning",
  suspended: "destructive",
  excluded: "destructive",
};

// ============= SANCTION TYPE =============
export const SANCTION_TYPE = {
  warning: "warning",
  financial_compensation: "financial_compensation",
  full_refund: "full_refund",
  temporary_suspension: "temporary_suspension",
  permanent_exclusion: "permanent_exclusion",
} as const;

export type SanctionType = keyof typeof SANCTION_TYPE;

export const SANCTION_TYPE_LABELS: Record<SanctionType, string> = {
  warning: "Avertissement",
  financial_compensation: "Compensation financière",
  full_refund: "Remboursement complet",
  temporary_suspension: "Suspension temporaire",
  permanent_exclusion: "Exclusion permanente",
};

// ============= TRANSACTION TYPE =============
export const TRANSACTION_TYPE = {
  earning: "earning",
  withdrawal: "withdrawal",
  commission: "commission",
  refund: "refund",
  bonus: "bonus",
} as const;

export type TransactionType = keyof typeof TRANSACTION_TYPE;

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  earning: "Gain",
  withdrawal: "Retrait",
  commission: "Commission",
  refund: "Remboursement",
  bonus: "Bonus",
};

// ============= GP SUBSCRIPTION =============
export const GP_SUBSCRIPTION = {
  free: "free",
  premium: "premium",
} as const;

export type GpSubscription = keyof typeof GP_SUBSCRIPTION;

export const GP_SUBSCRIPTION_LABELS: Record<GpSubscription, string> = {
  free: "Gratuit",
  premium: "Premium",
};

// ============= APP ROLE =============
export const APP_ROLE = {
  admin: "admin",
  moderator: "moderator",
  user: "user",
} as const;

export type AppRole = keyof typeof APP_ROLE;

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrateur",
  moderator: "Modérateur",
  user: "Utilisateur",
};

// ============= VALIDATION HELPERS =============

/**
 * Validates if a value is a valid OrderStatus enum
 */
export function isValidOrderStatus(value: string): value is OrderStatus {
  return Object.keys(ORDER_STATUS).includes(value);
}

/**
 * Validates if a value is a valid GpStatus enum
 */
export function isValidGpStatus(value: string): value is GpStatus {
  return Object.keys(GP_STATUS).includes(value);
}

/**
 * Validates if a value is a valid OfferStatus enum
 */
export function isValidOfferStatus(value: string): value is OfferStatus {
  return Object.keys(OFFER_STATUS).includes(value);
}

/**
 * Validates if a value is a valid GpType enum
 */
export function isValidGpType(value: string): value is GpType {
  return Object.keys(GP_TYPE).includes(value);
}

/**
 * Validates if a value is a valid DisputeStatus enum
 */
export function isValidDisputeStatus(value: string): value is DisputeStatus {
  return Object.keys(DISPUTE_STATUS).includes(value);
}

/**
 * Validates if a value is a valid ReputationStatus enum
 */
export function isValidReputationStatus(value: string): value is ReputationStatus {
  return Object.keys(REPUTATION_STATUS).includes(value);
}

/**
 * Validates if a value is a valid SanctionType enum
 */
export function isValidSanctionType(value: string): value is SanctionType {
  return Object.keys(SANCTION_TYPE).includes(value);
}

// ============= GETTER HELPERS =============

/**
 * Get the French label for an OrderStatus
 */
export function getOrderStatusLabel(status: string): string {
  if (isValidOrderStatus(status)) {
    return ORDER_STATUS_LABELS[status];
  }
  console.warn(`Invalid order status: ${status}`);
  return status;
}

/**
 * Get the color variant for an OrderStatus
 */
export function getOrderStatusColor(status: string): string {
  if (isValidOrderStatus(status)) {
    return ORDER_STATUS_COLORS[status];
  }
  return "default";
}

/**
 * Get the next status in the workflow for an OrderStatus
 */
export function getNextOrderStatus(status: string): { nextStatus?: OrderStatus; nextLabel?: string } {
  if (isValidOrderStatus(status)) {
    const workflow = ORDER_STATUS_WORKFLOW[status];
    return workflow || {};
  }
  return {};
}

/**
 * Get the French label for a GpStatus
 */
export function getGpStatusLabel(status: string): string {
  if (isValidGpStatus(status)) {
    return GP_STATUS_LABELS[status];
  }
  console.warn(`Invalid GP status: ${status}`);
  return status;
}

/**
 * Get the French label for an OfferStatus
 */
export function getOfferStatusLabel(status: string): string {
  if (isValidOfferStatus(status)) {
    return OFFER_STATUS_LABELS[status];
  }
  console.warn(`Invalid offer status: ${status}`);
  return status;
}

/**
 * Get the French label for a GpType
 */
export function getGpTypeLabel(type: string): string {
  if (isValidGpType(type)) {
    return GP_TYPE_LABELS[type];
  }
  console.warn(`Invalid GP type: ${type}`);
  return type;
}

/**
 * Get the French label for a DisputeStatus
 */
export function getDisputeStatusLabel(status: string): string {
  if (isValidDisputeStatus(status)) {
    return DISPUTE_STATUS_LABELS[status];
  }
  console.warn(`Invalid dispute status: ${status}`);
  return status;
}

/**
 * Get the French label for a ReputationStatus
 */
export function getReputationStatusLabel(status: string): string {
  if (isValidReputationStatus(status)) {
    return REPUTATION_STATUS_LABELS[status];
  }
  console.warn(`Invalid reputation status: ${status}`);
  return status;
}

/**
 * Get the French label for a SanctionType
 */
export function getSanctionTypeLabel(type: string): string {
  if (isValidSanctionType(type)) {
    return SANCTION_TYPE_LABELS[type];
  }
  console.warn(`Invalid sanction type: ${type}`);
  return type;
}

// ============= SELECT OPTIONS GENERATORS =============

/**
 * Generate options for a Select component from an enum
 */
export function generateSelectOptions<T extends Record<string, string>>(
  enumObj: T,
  labels: Record<keyof T, string>
): Array<{ value: keyof T; label: string }> {
  return Object.keys(enumObj).map((key) => ({
    value: key as keyof T,
    label: labels[key as keyof T],
  }));
}

export const ORDER_STATUS_OPTIONS = generateSelectOptions(ORDER_STATUS, ORDER_STATUS_LABELS);
export const GP_STATUS_OPTIONS = generateSelectOptions(GP_STATUS, GP_STATUS_LABELS);
export const OFFER_STATUS_OPTIONS = generateSelectOptions(OFFER_STATUS, OFFER_STATUS_LABELS);
export const GP_TYPE_OPTIONS = generateSelectOptions(GP_TYPE, GP_TYPE_LABELS);
export const DISPUTE_STATUS_OPTIONS = generateSelectOptions(DISPUTE_STATUS, DISPUTE_STATUS_LABELS);
export const DISPUTE_CATEGORY_OPTIONS = generateSelectOptions(DISPUTE_CATEGORY, DISPUTE_CATEGORY_LABELS);
export const REPUTATION_STATUS_OPTIONS = generateSelectOptions(REPUTATION_STATUS, REPUTATION_STATUS_LABELS);
export const SANCTION_TYPE_OPTIONS = generateSelectOptions(SANCTION_TYPE, SANCTION_TYPE_LABELS);
