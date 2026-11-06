import {
  flattenEnvelopeGroups,
  groupEffectiveAmount,
  normalizeBudgetScope,
  normalizeDueDay,
  newEnvelopeId,
  type BudgetGroup,
  type BudgetScope,
  type BudgetSegment,
  type MonthEnvelopePlan,
} from "@/lib/budgetEnvelopes";
import type { BudgetLimits } from "@/lib/budget";
import {
  calculateFundCashBalance,
  FIXED_EXPENSES_FUND_NAME,
  isFixedExpensesFund,
  isSavingsFund,
  type FamilyFund,
  type FundExpenseLike,
} from "@/lib/funds";

/** Active fixed-expense template row used to seed Gastos fijos segments. */
export type FixedExpenseMigrationItem = {
  id: string;
  name: string;
  /** Monthly planning amount for this item. */
  amount: number;
  scope?: BudgetScope;
  /** Habitual due day of month (1–31) from fixed_expenses. */
  dueDay?: number | null;
};

export type MigrateFundsToEnvelopesResult = {
  plan: MonthEnvelopePlan;
  /** Flat limits derived from the plan (for useBudget / setMonthLimits). */
  limits: BudgetLimits;
  /** Variable pockets turned into flat budgets. */
  migratedVariable: number;
  /** Segments under Gastos fijos (all scopes). */
  fixedSegments: number;
  notices: string[];
  matched: Array<{ fundName: string; amount: number; scope: BudgetScope }>;
};

/** @deprecated Prefer FUNDS_TO_ENVELOPES_MIGRATION_DONE_KEY (v2). */
export const FUNDS_TO_BUDGET_MIGRATION_DONE_KEY =
  "fsage:funds-to-budget-migration-done";

/** v3: shared + personal scopes on envelope groups. */
export const FUNDS_TO_ENVELOPES_MIGRATION_DONE_KEY =
  "fsage:funds-to-envelopes-migration-done-v3";

function normalizeLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function findGroupByNameScope(
  groups: BudgetGroup[],
  name: string,
  scope: BudgetScope,
  ownerProfileId?: string | null,
): BudgetGroup | undefined {
  const needle = normalizeLabel(name);
  return groups.find((g) => {
    if (normalizeLabel(g.name) !== needle) return false;
    if (normalizeBudgetScope(g.scope) !== scope) return false;
    if (scope === "personal" && ownerProfileId) {
      return !g.ownerProfileId || g.ownerProfileId === ownerProfileId;
    }
    return true;
  });
}

function upsertFlatGroup(
  groups: BudgetGroup[],
  opts: {
    name: string;
    amount: number;
    defaultAccountId: string | null;
    scope: BudgetScope;
    ownerProfileId?: string | null;
  },
): { groups: BudgetGroup[]; created: boolean } {
  const existing = findGroupByNameScope(
    groups,
    opts.name,
    opts.scope,
    opts.ownerProfileId,
  );
  if (existing) {
    return {
      groups: groups.map((g) =>
        g.id === existing.id
          ? {
              ...g,
              name: opts.name.trim() || g.name,
              amount: roundMoney(opts.amount),
              segments: [],
              scope: opts.scope,
              ownerProfileId:
                opts.scope === "personal"
                  ? opts.ownerProfileId ?? g.ownerProfileId ?? null
                  : null,
              defaultAccountId:
                g.defaultAccountId || opts.defaultAccountId || null,
            }
          : g,
      ),
      created: false,
    };
  }

  return {
    groups: [
      ...groups,
      {
        id: newEnvelopeId(),
        name: opts.name.trim() || "Presupuesto",
        amount: roundMoney(opts.amount),
        segments: [],
        scope: opts.scope,
        ownerProfileId:
          opts.scope === "personal" ? opts.ownerProfileId ?? null : null,
        defaultAccountId: opts.defaultAccountId,
      },
    ],
    created: true,
  };
}

function upsertFixedExpensesGroup(
  groups: BudgetGroup[],
  opts: {
    items: FixedExpenseMigrationItem[];
    defaultAccountId: string | null;
    scope: BudgetScope;
    ownerProfileId?: string | null;
  },
): { groups: BudgetGroup[]; segmentCount: number; created: boolean } {
  const name = FIXED_EXPENSES_FUND_NAME;
  const segments: BudgetSegment[] = opts.items
    .filter((item) => item.name.trim() && Number(item.amount) >= 0)
    .map((item) => {
      const dueDay = normalizeDueDay(item.dueDay);
      return {
        id: item.id || newEnvelopeId(),
        name: item.name.trim().slice(0, 40) || "Gasto fijo",
        amount: roundMoney(item.amount),
        ...(dueDay != null ? { dueDay } : {}),
      };
    });

  const existing = findGroupByNameScope(
    groups,
    name,
    opts.scope,
    opts.ownerProfileId,
  );
  const amount = roundMoney(
    segments.reduce((sum, s) => sum + s.amount, 0),
  );

  if (existing) {
    const byName = new Map(
      existing.segments.map((s) => [normalizeLabel(s.name), s]),
    );
    const merged = segments.map((seg) => {
      const prev = byName.get(normalizeLabel(seg.name));
      return prev ? { ...seg, id: prev.id } : seg;
    });
    return {
      groups: groups.map((g) =>
        g.id === existing.id
          ? {
              ...g,
              name,
              amount,
              segments: merged,
              scope: opts.scope,
              ownerProfileId:
                opts.scope === "personal"
                  ? opts.ownerProfileId ?? g.ownerProfileId ?? null
                  : null,
              defaultAccountId:
                g.defaultAccountId || opts.defaultAccountId || null,
            }
          : g,
      ),
      segmentCount: merged.length,
      created: false,
    };
  }

  return {
    groups: [
      ...groups,
      {
        id: newEnvelopeId(),
        name,
        amount,
        segments,
        scope: opts.scope,
        ownerProfileId:
          opts.scope === "personal" ? opts.ownerProfileId ?? null : null,
        defaultAccountId: opts.defaultAccountId,
      },
    ],
    segmentCount: segments.length,
    created: true,
  };
}

export type ScopeAccountIds = {
  shared: string | null;
  personal: string | null;
};

/**
 * Align old spending pockets → Simple Mode envelope plan.
 *
 * - Variable funds → flat presupuesto (no segments), amount = cash balance,
 *   scope/owner from the fund.
 * - Gastos fijos → one parent per scope with segments from fixed-expense items.
 * - Ahorro → skipped (stays as savings fund).
 *
 * Does not write storage or mutate the DB — caller persists.
 */
export function migrateFundsToEnvelopes(input: {
  funds: FamilyFund[];
  expenses: FundExpenseLike[];
  fixedExpenses?: FixedExpenseMigrationItem[];
  /** @deprecated Prefer defaultAccountByScope */
  defaultAccountId?: string | null;
  defaultAccountByScope?: ScopeAccountIds;
  accountIds?: string[];
  existingPlan?: MonthEnvelopePlan | null;
  /** Current user — used as owner fallback for personal pockets. */
  userId?: string | null;
}): MigrateFundsToEnvelopesResult {
  const notices: string[] = [];
  const matched: MigrateFundsToEnvelopesResult["matched"] = [];
  const byScope = input.defaultAccountByScope ?? {
    shared: input.defaultAccountId ?? null,
    personal: input.defaultAccountId ?? null,
  };

  let groups: BudgetGroup[] = [...(input.existingPlan?.groups ?? [])];
  const accountIds =
    input.accountIds && input.accountIds.length > 0
      ? [...input.accountIds]
      : [...(input.existingPlan?.accountIds ?? [])];

  let migratedVariable = 0;

  const variableFunds = input.funds.filter(
    (f) =>
      !f.archived_at && !isSavingsFund(f) && !isFixedExpensesFund(f),
  );

  for (const fund of variableFunds) {
    const balance = roundMoney(
      calculateFundCashBalance(input.expenses, fund.id),
    );
    const scope: BudgetScope =
      fund.scope === "personal" ? "personal" : "shared";
    const ownerProfileId =
      scope === "personal"
        ? fund.owner_profile_id ?? input.userId ?? null
        : null;
    const defaultAccountId =
      scope === "personal" ? byScope.personal : byScope.shared;

    const result = upsertFlatGroup(groups, {
      name: fund.name,
      amount: Math.max(0, balance),
      defaultAccountId,
      scope,
      ownerProfileId,
    });
    groups = result.groups;
    if (result.created || balance > 0.009) {
      migratedVariable += 1;
      matched.push({
        fundName: fund.name,
        amount: Math.max(0, balance),
        scope,
      });
    }
  }

  const fixedItems = (input.fixedExpenses ?? []).filter(
    (item) => item.name.trim() && Number.isFinite(Number(item.amount)),
  );

  let fixedSegments = 0;
  for (const scope of ["shared", "personal"] as const) {
    const scopedItems = fixedItems.filter(
      (item) => normalizeBudgetScope(item.scope) === scope,
    );
    // Always ensure a shared Gastos fijos shell; personal only if there are items
    // or a personal fixed-expenses pocket exists in funds.
    const hasPersonalFixedFund = input.funds.some(
      (f) =>
        !f.archived_at &&
        isFixedExpensesFund(f) &&
        f.scope === "personal",
    );
    if (scope === "personal" && scopedItems.length === 0 && !hasPersonalFixedFund) {
      continue;
    }

    const ownerProfileId =
      scope === "personal" ? input.userId ?? null : null;
    const fixedResult = upsertFixedExpensesGroup(groups, {
      items: scopedItems,
      defaultAccountId:
        scope === "personal" ? byScope.personal : byScope.shared,
      scope,
      ownerProfileId,
    });
    groups = fixedResult.groups;
    fixedSegments += fixedResult.segmentCount;

    if (fixedResult.created || fixedResult.segmentCount > 0) {
      const label = scope === "personal" ? "Gastos fijos (míos)" : "Gastos fijos";
      notices.push(
        fixedResult.segmentCount > 0
          ? `${label} · ${fixedResult.segmentCount} categorí${
              fixedResult.segmentCount === 1 ? "a" : "as"
            }`
          : `${label} creado`,
      );
    }
  }

  groups = groups.map((g) =>
    g.segments.length > 0
      ? { ...g, amount: groupEffectiveAmount(g) }
      : g,
  );

  const plan: MonthEnvelopePlan = {
    accountIds,
    groups,
  };

  return {
    plan,
    limits: flattenEnvelopeGroups(groups),
    migratedVariable,
    fixedSegments,
    notices,
    matched,
  };
}

/**
 * @deprecated Use migrateFundsToEnvelopes (v2 → MonthEnvelopePlan).
 */
export function migrateFundsToBudget(input: {
  funds: FamilyFund[];
  expenses: FundExpenseLike[];
  categories?: unknown;
  userId?: string;
  existingLimits?: BudgetLimits;
  fixedExpenses?: FixedExpenseMigrationItem[];
  defaultAccountId?: string | null;
  defaultAccountByScope?: ScopeAccountIds;
  accountIds?: string[];
  existingPlan?: MonthEnvelopePlan | null;
}): MigrateFundsToEnvelopesResult & {
  migrated: number;
  unmatchedFundNames: string[];
} {
  const result = migrateFundsToEnvelopes({
    funds: input.funds,
    expenses: input.expenses,
    fixedExpenses: input.fixedExpenses,
    defaultAccountId: input.defaultAccountId,
    defaultAccountByScope: input.defaultAccountByScope,
    accountIds: input.accountIds,
    existingPlan: input.existingPlan,
    userId: input.userId,
  });
  return {
    ...result,
    migrated: result.migratedVariable,
    unmatchedFundNames: [],
  };
}
