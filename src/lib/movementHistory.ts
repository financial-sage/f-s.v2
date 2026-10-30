import {
  isInvestmentAccountMovement,
  type AccountKindLookup,
} from "@/lib/accounts";
import { isHiddenFundBalanceAdjustment } from "@/lib/funds";

/** Internal settle rows — count in balances, never in Historial / home preview. */
export function isFundSettlementConcept(concept?: string | null) {
  return String(concept ?? "").startsWith("Liquidación de deuda");
}

export type MovementHistoryExpenseLike = {
  concept?: string | null;
  account_id?: string | null;
};

/**
 * Base visibility for **Historial** (`/history`) and the dashboard recent list.
 *
 * Product rule: home preview must be the same universe as Historial (truncated /
 * UI filters only). Change this helper — not a one-off filter in a screen —
 * when adding or hiding movement types.
 *
 * Still counted in balances when excluded here: silent pocket adjusts, settlements.
 * Investment ledger stays under Cuentas → Inversiones.
 */
export function isVisibleInMovementHistory(
  expense: MovementHistoryExpenseLike,
  accountsById: AccountKindLookup
): boolean {
  if (expense.concept === "Reembolso del fondo") return false;
  if (isFundSettlementConcept(expense.concept)) return false;
  if (isHiddenFundBalanceAdjustment(expense.concept)) return false;
  if (isInvestmentAccountMovement(expense, accountsById)) return false;
  return true;
}
