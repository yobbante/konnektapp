// ═══════════════════════════════════════════════
// KONNEKT TUTORIAL ENGINE — Types & Interfaces
// ═══════════════════════════════════════════════

export type TutorialRole = "client" | "gp";

export type StepStatus = "locked" | "active" | "completed";
export type ScenarioStatus = "locked" | "available" | "in_progress" | "completed";

export type TutorialState = "INIT" | "STEP_ACTIVE" | "STEP_COMPLETED" | "SCENARIO_COMPLETED" | "EXIT";

export interface MockWallet {
  balance: number;
  escrow_balance: number;
  currency: string;
}

export interface MockEscrow {
  amount: number;
  status: "pending" | "locked" | "released" | "refunded";
  locked_at?: string;
  released_at?: string;
}

export interface MockLedgerEntry {
  id: string;
  type: "escrow_lock" | "escrow_release" | "commission" | "debt_deduction" | "payout" | "refund" | "supplement";
  amount: number;
  description: string;
  timestamp: string;
}

export interface MockCommission {
  rate: number;
  amount: number;
  type: "progressive" | "manual_fixed";
}

export interface MockDebt {
  balance: number;
  auto_deducted: number;
}

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  instruction: string;
  status: StepStatus;
  mockAction?: () => TutorialMockState;
  highlightTarget?: string;
  /** The emoji/icon for the simulated action button */
  actionIcon?: string;
  /** Label for the simulated action the user "performs" */
  actionLabel?: string;
  /** Visual mock screen to show during this step */
  mockScreen?: "search" | "offer-detail" | "weight-input" | "payment" | "scan-deposit" | "scan-delivery" | "tracking" | "confirm-reception" | "ledger-result" | "wallet-overview" | "escrow-detail" | "supplement-alert" | "dispute-form" | "badge-info" | "declare-flight" | "accept-mission" | "commission-calc" | "debt-calc" | "manual-parcel" | "kyc-upload" | "qr-scan" | "withdrawal";
  /** Mock data mutation key for this step */
  mockMutation?: "escrow_lock" | "escrow_release" | "weight_adjust_up" | "weight_adjust_down" | "scan_deposit" | "scan_delivery" | "commission_split" | "debt_deduct" | "supplement_pay" | "refund";
}

export interface TutorialScenario {
  id: string;
  title: string;
  description: string;
  icon: string;
  role: TutorialRole;
  status: ScenarioStatus;
  steps: TutorialStep[];
  category: "envoi" | "wallet" | "escrow" | "scan" | "livraison" | "litige" | "badges" | "mission" | "commission" | "dette" | "colis_manuel" | "kyc" | "ajustement";
}

export interface TutorialMockState {
  clientWallet: MockWallet;
  gpWallet: MockWallet;
  escrow: MockEscrow;
  ledger: MockLedgerEntry[];
  commission: MockCommission;
  debt: MockDebt;
  orderStatus: string;
  scanResult?: string;
}

export interface TutorialEngineState {
  tutorialMode: boolean;
  currentRole: TutorialRole | null;
  currentScenario: TutorialScenario | null;
  currentStepIndex: number;
  stateMachine: TutorialState;
  mockState: TutorialMockState;
  completedScenarios: string[];
}
