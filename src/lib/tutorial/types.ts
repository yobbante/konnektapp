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
  rate: number; // percentage
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
  // Mock data mutations for this step
  mockAction?: () => TutorialMockState;
  // Visual highlight target (CSS selector or element ID)
  highlightTarget?: string;
}

export interface TutorialScenario {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
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
