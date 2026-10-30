import {
  isInvestmentAccountMovement,
  type AccountKindLookup,
  type FamilyAccount,
} from "@/lib/accounts";
import {
  isHiddenFundBalanceAdjustment,
  personalFundDisplayName,
  type FamilyFund,
} from "@/lib/funds";

/** Internal settle rows — count in balances, never in Historial / home preview. */
export function isFundSettlementConcept(concept?: string | null) {
  return String(concept ?? "").startsWith("Liquidación de deuda");
}

export type MovementHistoryExpenseLike = {
  id?: string;
  concept?: string | null;
  category?: string | null;
  account_id?: string | null;
  fund_id?: string | null;
  transfer_group_id?: string | null;
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
 *
 * Transfer pairs (`transfer_group_id`) stay in the ledger as two rows for balances;
 * lists collapse them via `isPreferredTransferHistoryLeg` / `collapseTransferPairsForHistory`.
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

type TransferLeg = MovementHistoryExpenseLike & { id: string };

function fundLabel(
  fundId: string | null | undefined,
  funds: FamilyFund[],
  currentUserId?: string
): string | null {
  if (!fundId) return null;
  const fund = funds.find((f) => f.id === fundId) ?? null;
  if (!fund) return "Bolsillo";
  if (fund.scope === "personal") {
    return personalFundDisplayName(fund, {
      primaryId: currentUserId
        ? funds.find(
            (f) =>
              f.scope === "personal" &&
              f.owner_profile_id === currentUserId &&
              f.is_default
          )?.id
        : null,
    });
  }
  return fund.name;
}

function accountLabel(
  accountId: string | null | undefined,
  accounts: Pick<FamilyAccount, "id" | "name">[]
): string | null {
  if (!accountId) return null;
  return accounts.find((a) => a.id === accountId)?.name?.trim() || "Cuenta";
}

/** Prefer the destination (deposit) leg — “se sumó a…”. */
export function pickPreferredTransferLeg<T extends TransferLeg>(
  legs: readonly T[]
): T {
  const deposit = legs.find((leg) => leg.category === "deposit");
  if (deposit) return deposit;
  return legs[0];
}

export function isPreferredTransferHistoryLeg<T extends TransferLeg>(
  expense: T,
  siblings: readonly T[]
): boolean {
  if (!expense.transfer_group_id) return true;
  if (siblings.length <= 1) return true;
  return pickPreferredTransferLeg(siblings).id === expense.id;
}

export type TransferHistoryPresentation = {
  title: string;
  detail: string | null;
};

/**
 * Single-line story for a linked transfer pair shown as one history row.
 * Ledger still has two rows; this is display-only.
 */
export function formatTransferHistoryPresentation(
  legs: TransferLeg[],
  funds: FamilyFund[],
  accounts: Pick<FamilyAccount, "id" | "name">[],
  currentUserId?: string
): TransferHistoryPresentation {
  const preferred = pickPreferredTransferLeg(legs);
  if (legs.length <= 1) {
    return { title: String(preferred.concept ?? "Transferencia"), detail: null };
  }

  const out = legs.find((leg) => leg.category === "withdrawal") ?? null;
  const inn = legs.find((leg) => leg.category === "deposit") ?? null;

  const fromName =
    accountLabel(out?.account_id, accounts) ??
    fundLabel(out?.fund_id, funds, currentUserId);
  const toName =
    accountLabel(inn?.account_id, accounts) ??
    fundLabel(inn?.fund_id, funds, currentUserId);

  if (toName && fromName) {
    return {
      title: `A ${toName}`,
      detail: `Desde ${fromName}`,
    };
  }
  if (toName) {
    return { title: `A ${toName}`, detail: fromName ? `Desde ${fromName}` : null };
  }
  return {
    title: String(preferred.concept ?? "Transferencia"),
    detail: fromName ? `Desde ${fromName}` : null,
  };
}

/**
 * Collapse linked transfer pairs to one row each (preferred leg).
 * Order of `expenses` is preserved for the kept legs.
 */
export function collapseTransferPairsForHistory<T extends TransferLeg>(
  expenses: readonly T[]
): T[] {
  const byGroup = new Map<string, T[]>();
  for (const expense of expenses) {
    const groupId = expense.transfer_group_id;
    if (!groupId) continue;
    const list = byGroup.get(groupId);
    if (list) list.push(expense);
    else byGroup.set(groupId, [expense]);
  }

  const hidden = new Set<string>();
  for (const legs of byGroup.values()) {
    if (legs.length < 2) continue;
    const preferred = pickPreferredTransferLeg(legs);
    for (const leg of legs) {
      if (leg.id !== preferred.id) hidden.add(leg.id);
    }
  }

  return expenses.filter((expense) => !hidden.has(expense.id));
}
