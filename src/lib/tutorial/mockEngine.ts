// ═══════════════════════════════════════════════
// KONNEKT TUTORIAL ENGINE — Mock Financial Engine
// Follows real business rules but in sandbox mode
// ═══════════════════════════════════════════════

import type { TutorialMockState, MockLedgerEntry } from "./types";

const createId = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

export function getInitialMockState(): TutorialMockState {
  return {
    clientWallet: { balance: 50000, escrow_balance: 0, currency: "XOF" },
    gpWallet: { balance: 15000, escrow_balance: 0, currency: "XOF" },
    escrow: { amount: 0, status: "pending" },
    ledger: [],
    commission: { rate: 5, amount: 0, type: "progressive" },
    debt: { balance: 0, auto_deducted: 0 },
    orderStatus: "pending",
    scanResult: undefined,
  };
}

// ── Mock Operations (mirror real business logic) ──

export function mockEscrowLock(state: TutorialMockState, amount: number): TutorialMockState {
  const entry: MockLedgerEntry = {
    id: createId(),
    type: "escrow_lock",
    amount,
    description: `Fonds bloqués en escrow : ${amount.toLocaleString()} FCFA`,
    timestamp: now(),
  };
  return {
    ...state,
    clientWallet: {
      ...state.clientWallet,
      balance: state.clientWallet.balance - amount,
      escrow_balance: state.clientWallet.escrow_balance + amount,
    },
    escrow: { amount, status: "locked", locked_at: now() },
    ledger: [...state.ledger, entry],
    orderStatus: "accepted",
  };
}

export function mockEscrowRelease(state: TutorialMockState): TutorialMockState {
  const amount = state.escrow.amount;
  const commissionAmount = Math.round(amount * state.commission.rate / 100);
  const debtDeduction = Math.min(state.debt.balance, amount - commissionAmount);
  const netPayout = amount - commissionAmount - debtDeduction;

  const entries: MockLedgerEntry[] = [
    {
      id: createId(),
      type: "escrow_release",
      amount,
      description: `Escrow libéré : ${amount.toLocaleString()} FCFA`,
      timestamp: now(),
    },
    {
      id: createId(),
      type: "commission",
      amount: commissionAmount,
      description: `Commission Konnekt (${state.commission.rate}%) : ${commissionAmount.toLocaleString()} FCFA`,
      timestamp: now(),
    },
  ];

  if (debtDeduction > 0) {
    entries.push({
      id: createId(),
      type: "debt_deduction",
      amount: debtDeduction,
      description: `Déduction dette automatique : ${debtDeduction.toLocaleString()} FCFA`,
      timestamp: now(),
    });
  }

  entries.push({
    id: createId(),
    type: "payout",
    amount: netPayout,
    description: `Payout net GP : ${netPayout.toLocaleString()} FCFA`,
    timestamp: now(),
  });

  return {
    ...state,
    clientWallet: {
      ...state.clientWallet,
      escrow_balance: 0,
    },
    gpWallet: {
      ...state.gpWallet,
      balance: state.gpWallet.balance + netPayout,
    },
    escrow: { ...state.escrow, status: "released", released_at: now() },
    ledger: [...state.ledger, ...entries],
    commission: { ...state.commission, amount: commissionAmount },
    debt: {
      balance: state.debt.balance - debtDeduction,
      auto_deducted: state.debt.auto_deducted + debtDeduction,
    },
    orderStatus: "delivered",
  };
}

export function mockWeightAdjustment(state: TutorialMockState, originalWeight: number, actualWeight: number, pricePerKg: number): TutorialMockState {
  const diff = actualWeight - originalWeight;
  const supplementAmount = Math.round(diff * pricePerKg);

  if (diff > 0) {
    // Supplement required
    const entry: MockLedgerEntry = {
      id: createId(),
      type: "supplement",
      amount: supplementAmount,
      description: `Supplément poids (+${diff}kg) : ${supplementAmount.toLocaleString()} FCFA`,
      timestamp: now(),
    };
    return {
      ...state,
      clientWallet: {
        ...state.clientWallet,
        balance: state.clientWallet.balance - supplementAmount,
        escrow_balance: state.clientWallet.escrow_balance + supplementAmount,
      },
      escrow: { ...state.escrow, amount: state.escrow.amount + supplementAmount },
      ledger: [...state.ledger, entry],
    };
  } else {
    // Refund
    const refundAmount = Math.abs(supplementAmount);
    const entry: MockLedgerEntry = {
      id: createId(),
      type: "refund",
      amount: refundAmount,
      description: `Remboursement poids (${diff}kg) : ${refundAmount.toLocaleString()} FCFA`,
      timestamp: now(),
    };
    return {
      ...state,
      clientWallet: {
        ...state.clientWallet,
        balance: state.clientWallet.balance + refundAmount,
        escrow_balance: state.clientWallet.escrow_balance - refundAmount,
      },
      escrow: { ...state.escrow, amount: state.escrow.amount - refundAmount },
      ledger: [...state.ledger, entry],
    };
  }
}

export function mockManualParcelCommission(state: TutorialMockState, parcelAmount: number): TutorialMockState {
  const fixedRate = 3; // 3% for manual parcels
  const commissionAmount = Math.round(parcelAmount * fixedRate / 100);
  const canDeduct = state.gpWallet.balance >= commissionAmount;

  const entry: MockLedgerEntry = {
    id: createId(),
    type: "commission",
    amount: commissionAmount,
    description: `Commission colis manuel (3%) : ${commissionAmount.toLocaleString()} FCFA${!canDeduct ? " → ajouté en dette" : ""}`,
    timestamp: now(),
  };

  if (canDeduct) {
    return {
      ...state,
      gpWallet: { ...state.gpWallet, balance: state.gpWallet.balance - commissionAmount },
      commission: { rate: fixedRate, amount: commissionAmount, type: "manual_fixed" },
      ledger: [...state.ledger, entry],
    };
  } else {
    return {
      ...state,
      debt: { ...state.debt, balance: state.debt.balance + commissionAmount },
      commission: { rate: fixedRate, amount: commissionAmount, type: "manual_fixed" },
      ledger: [...state.ledger, entry],
    };
  }
}

export function mockScanAction(state: TutorialMockState, scanType: "deposit" | "transit" | "arrival" | "delivery"): TutorialMockState {
  const statusMap: Record<string, string> = {
    deposit: "collected",
    transit: "in_transit",
    arrival: "in_transit",
    delivery: "delivered",
  };

  const labelMap: Record<string, string> = {
    deposit: "Scan dépôt — colis réceptionné",
    transit: "Scan transit — colis en route",
    arrival: "Scan arrivée — colis au point de livraison",
    delivery: "Scan livraison — colis remis au destinataire",
  };

  return {
    ...state,
    orderStatus: statusMap[scanType] || state.orderStatus,
    scanResult: labelMap[scanType],
  };
}
