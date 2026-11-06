import type { BudgetLimits } from "@/lib/budget";

export type BudgetScope = "shared" | "personal";

export type BudgetSegment = {
  id: string;
  name: string;
  amount: number;
  /** Habitual billing day of month (1–31). */
  dueDay?: number;
};

export type BudgetGroup = {
  id: string;
  name: string;
  amount: number;
  segments: BudgetSegment[];
  /** Debit account for this group and all its segments. */
  defaultAccountId?: string | null;
  /** Shared family budget vs personal (mine). Defaults to shared. */
  scope?: BudgetScope;
  /** Set when scope = personal; null/omit for shared. */
  ownerProfileId?: string | null;
  /** Habitual billing day when the group has no segments (1–31). */
  dueDay?: number;
};

/** Clamp to 1–31 or omit when empty/invalid. */
export function normalizeDueDay(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1 || n > 31) return undefined;
  return n;
}

export function normalizeBudgetScope(value: unknown): BudgetScope {
  return value === "personal" ? "personal" : "shared";
}

export function normalizeBudgetGroup(group: BudgetGroup): BudgetGroup {
  const scope = normalizeBudgetScope(group.scope);
  return {
    ...group,
    scope,
    ownerProfileId:
      scope === "personal" ? group.ownerProfileId ?? null : null,
    dueDay: normalizeDueDay(group.dueDay),
    segments: (group.segments ?? []).map((s) => ({
      ...s,
      dueDay: normalizeDueDay(s.dueDay),
    })),
  };
}

/** Groups visible for a scope tab (personal = only the viewer's). */
export function filterBudgetGroupsForScope(
  groups: BudgetGroup[],
  scope: BudgetScope,
  userId: string | null | undefined,
): BudgetGroup[] {
  return groups.filter((raw) => {
    const g = normalizeBudgetGroup(raw);
    if (g.scope !== scope) return false;
    if (scope === "shared") return true;
    if (!userId) return true;
    return !g.ownerProfileId || g.ownerProfileId === userId;
  });
}

export type MonthEnvelopePlan = {
  accountIds: string[];
  groups: BudgetGroup[];
};

export type EnvelopeStore = Record<string, MonthEnvelopePlan>;

/** Hierarchical envelopes alongside flat v3 limits. */
export function envelopeStorageKey(familyId: string) {
  return `fsage:budget-envelopes:v1:${familyId}`;
}

/** Fired after envelope plan writes so SimpleDashboard re-reads. */
export const ENVELOPE_CHANGE_EVENT = "fsage:budget-envelopes";

export function newEnvelopeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `env_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function groupEffectiveAmount(group: BudgetGroup): number {
  if (group.segments.length > 0) {
    const sum = group.segments.reduce(
      (acc, seg) => acc + (Number(seg.amount) || 0),
      0,
    );
    return Math.round(sum * 100) / 100;
  }
  return Math.round((Number(group.amount) || 0) * 100) / 100;
}

export function totalBudgeted(groups: BudgetGroup[]): number {
  const sum = groups.reduce((acc, g) => acc + groupEffectiveAmount(g), 0);
  return Math.round(sum * 100) / 100;
}

/** Leaf amounts for SimpleDashboard / useBudget flat map. */
export function flattenEnvelopeGroups(groups: BudgetGroup[]): BudgetLimits {
  const limits: BudgetLimits = {};
  for (const group of groups) {
    if (group.segments.length > 0) {
      for (const seg of group.segments) {
        const amount = Math.round((Number(seg.amount) || 0) * 100) / 100;
        if (amount > 0) limits[seg.id] = amount;
      }
    } else {
      const amount = Math.round((Number(group.amount) || 0) * 100) / 100;
      if (amount > 0) limits[group.id] = amount;
    }
  }
  return limits;
}

/** Flat leafId → group's defaultAccountId (segments inherit the group). */
export function flattenEnvelopeAccountDefaults(
  groups: BudgetGroup[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const group of groups) {
    if (!group.defaultAccountId) continue;
    if (group.segments.length > 0) {
      for (const seg of group.segments) {
        map[seg.id] = group.defaultAccountId;
      }
    } else {
      map[group.id] = group.defaultAccountId;
    }
  }
  return map;
}

function normalizeEnvelopeLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Resolve which account to debit for an AI-classified category.
 * Always uses the parent group's defaultAccountId (segments inherit).
 */
export function resolveDefaultAccountIdForCategory(
  plan: MonthEnvelopePlan | null | undefined,
  opts: { categoryId?: string | null; categoryName?: string | null },
): string | null {
  if (!plan?.groups?.length) return null;

  const categoryId = opts.categoryId?.trim() || null;
  if (categoryId) {
    for (const group of plan.groups) {
      if (group.id === categoryId) {
        return group.defaultAccountId ?? null;
      }
      if (group.segments.some((seg) => seg.id === categoryId)) {
        return group.defaultAccountId ?? null;
      }
    }
  }

  const needle = opts.categoryName
    ? normalizeEnvelopeLabel(opts.categoryName)
    : "";
  if (!needle) return null;

  for (const group of plan.groups) {
    if (normalizeEnvelopeLabel(group.name) === needle) {
      return group.defaultAccountId ?? null;
    }
    if (
      group.segments.some(
        (seg) => normalizeEnvelopeLabel(seg.name) === needle,
      )
    ) {
      return group.defaultAccountId ?? null;
    }
  }

  return null;
}

export function groupsFromFlatLimits(
  limits: BudgetLimits,
  parents: Array<{ id: string; name: string }>,
): BudgetGroup[] {
  const groups: BudgetGroup[] = [];
  const used = new Set<string>();

  for (const parent of parents) {
    const amount = Math.round((Number(limits[parent.id]) || 0) * 100) / 100;
    if (amount <= 0) continue;
    groups.push({
      id: parent.id,
      name: parent.name,
      amount,
      segments: [],
      scope: "shared",
      ownerProfileId: null,
    });
    used.add(parent.id);
  }

  for (const [id, raw] of Object.entries(limits)) {
    if (used.has(id)) continue;
    const amount = Math.round((Number(raw) || 0) * 100) / 100;
    if (amount <= 0) continue;
    groups.push({
      id,
      name: "Sobre",
      amount,
      segments: [],
      scope: "shared",
      ownerProfileId: null,
    });
  }

  return groups;
}

export function safeParseEnvelopeStore(raw: string | null): EnvelopeStore {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as EnvelopeStore;
  } catch {
    return {};
  }
}

export function readMonthEnvelopePlan(
  familyId: string,
  monthKey: string,
): MonthEnvelopePlan | null {
  if (typeof window === "undefined" || !familyId) return null;
  const store = safeParseEnvelopeStore(
    window.localStorage.getItem(envelopeStorageKey(familyId)),
  );
  const plan = store[monthKey];
  if (!plan || !Array.isArray(plan.groups)) return null;
  return {
    accountIds: Array.isArray(plan.accountIds) ? plan.accountIds : [],
    groups: plan.groups.map((g) => normalizeBudgetGroup(g)),
  };
}

export function writeMonthEnvelopePlan(
  familyId: string,
  monthKey: string,
  plan: MonthEnvelopePlan,
) {
  if (typeof window === "undefined" || !familyId) return;
  const key = envelopeStorageKey(familyId);
  const store = safeParseEnvelopeStore(window.localStorage.getItem(key));
  store[monthKey] = {
    accountIds: [...plan.accountIds],
    groups: plan.groups.map((raw) => {
      const g = normalizeBudgetGroup(raw);
      const dueDay = normalizeDueDay(g.dueDay);
      return {
        id: g.id,
        name: g.name.trim() || "Grupo",
        amount: Math.round((Number(g.amount) || 0) * 100) / 100,
        defaultAccountId: g.defaultAccountId || null,
        scope: g.scope ?? "shared",
        ownerProfileId: g.ownerProfileId ?? null,
        ...(dueDay != null ? { dueDay } : {}),
        segments: g.segments.map((s) => {
          const segDue = normalizeDueDay(s.dueDay);
          return {
            id: s.id,
            name: s.name.trim() || "Segmento",
            amount: Math.round((Number(s.amount) || 0) * 100) / 100,
            ...(segDue != null ? { dueDay: segDue } : {}),
          };
        }),
      };
    }),
  };
  window.localStorage.setItem(key, JSON.stringify(store));
  window.dispatchEvent(new Event(ENVELOPE_CHANGE_EVENT));
}
