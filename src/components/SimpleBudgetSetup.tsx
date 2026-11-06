"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Landmark, Plus, Trash2 } from "lucide-react";
import { FormattedCurrency } from "@/components/FormattedCurrency";
import { NumericKeypadSheet } from "@/components/NumericKeypadSheet";
import SimpleBudgetCreateSheet from "@/components/SimpleBudgetCreateSheet";
import SimpleBudgetDetailSheet from "@/components/SimpleBudgetDetailSheet";
import { PageHeader } from "@/components/ui/PageHeader";
import { Progress } from "@/components/ui/Progress";
import { toast } from "@/hooks/useToast";
import { useBudget } from "@/hooks/useBudget";
import {
  calculateAccountCashBalance,
  DEFAULT_PERSONAL_ACCOUNT_COLOR,
  isLiquidityAccount,
  listPayableAccountsForUser,
  listVisibleAccountsForUser,
  type FamilyAccount,
} from "@/lib/accounts";
import { formatMonthLabel, getMonthKey } from "@/lib/budget";
import {
  ENVELOPE_CHANGE_EVENT,
  filterBudgetGroupsForScope,
  flattenEnvelopeGroups,
  groupEffectiveAmount,
  groupsFromFlatLimits,
  normalizeBudgetGroup,
  normalizeDueDay,
  newEnvelopeId,
  readMonthEnvelopePlan,
  totalBudgeted,
  writeMonthEnvelopePlan,
  type BudgetGroup,
  type BudgetScope,
  type BudgetSegment,
} from "@/lib/budgetEnvelopes";
import { fundIconChipStyle } from "@/lib/funds";
import { tintedGlassGradient } from "@/lib/glass";
import { isIndividualHousehold } from "@/lib/household";
import { listParentCategories } from "@/lib/familyCategories";
import { MigrateFundsToBudgetButton } from "@/components/MigrateFundsToBudgetButton";
import { useAccountsStore } from "@/store/useAccountsStore";
import { useCategoriesStore } from "@/store/useCategoriesStore";
import { useExpenseStore } from "@/store/useExpenseStore";

const HERO_ACCENT = DEFAULT_PERSONAL_ACCOUNT_COLOR;

type AmountTarget =
  | { kind: "group"; groupId: string }
  | { kind: "segment"; groupId: string; segmentId: string };

function dueDayLabel(dueDay?: number | null) {
  return dueDay != null ? `día ${dueDay}` : "día —";
}

type SimpleBudgetSetupProps = {
  familyMemberCount?: number;
};

export default function SimpleBudgetSetup({
  familyMemberCount = 1,
}: SimpleBudgetSetupProps) {
  const userId = useExpenseStore((s) => s.userId);
  const familyId = useExpenseStore((s) => s.familyId);
  const expenses = useExpenseStore((s) => s.expenses);

  const accounts = useAccountsStore((s) => s.accounts);
  const loadAccounts = useAccountsStore((s) => s.load);

  const categories = useCategoriesStore((s) => s.categories);
  const loadCategories = useCategoriesStore((s) => s.load);

  const { getLimits, setMonthLimits, currentMonthKey } = useBudget(
    familyId ?? "",
  );
  const monthKey = currentMonthKey || getMonthKey();

  const isIndividual = isIndividualHousehold(familyMemberCount);
  const showScopeTabs = !isIndividual;

  const [scopeTab, setScopeTab] = useState<BudgetScope>("shared");
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<BudgetGroup[]>([]);
  const [accountsOpen, setAccountsOpen] = useState(false);
  /** Group ids whose segments panel is expanded. Collapsed by default. */
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [amountTarget, setAmountTarget] = useState<AmountTarget | null>(null);
  const [draftValue, setDraftValue] = useState("0");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailGroupId, setDetailGroupId] = useState<string | null>(null);
  const [envelopeTick, setEnvelopeTick] = useState(0);
  const groupsRef = useRef<BudgetGroup[]>([]);
  const selectedAccountIdsRef = useRef<string[]>([]);
  /** Only seed empty/flat defaults once per family+month; storage always wins. */
  const emptySeededKeyRef = useRef<string | null>(null);

  const activeScope: BudgetScope = showScopeTabs ? scopeTab : "shared";

  const liquidAccounts = useMemo(() => {
    if (!userId) return [] as FamilyAccount[];
    return listVisibleAccountsForUser(accounts, userId).filter((a) =>
      isLiquidityAccount(a),
    );
  }, [accounts, userId]);

  const scopedLiquidAccounts = useMemo(() => {
    if (!showScopeTabs) return liquidAccounts;
    return liquidAccounts.filter((a) => a.scope === activeScope);
  }, [liquidAccounts, showScopeTabs, activeScope]);

  const payableAccounts = useMemo(() => {
    if (!userId) return [] as FamilyAccount[];
    return listPayableAccountsForUser(accounts, userId);
  }, [accounts, userId]);

  const scopedPayableAccounts = useMemo(() => {
    if (!showScopeTabs) return payableAccounts;
    return payableAccounts.filter((a) => a.scope === activeScope);
  }, [payableAccounts, showScopeTabs, activeScope]);

  const primaryAccountId = useMemo(() => {
    const pool = scopedPayableAccounts.length
      ? scopedPayableAccounts
      : payableAccounts;
    if (activeScope === "personal") {
      return (
        pool.find((a) => a.scope === "personal")?.id ?? pool[0]?.id ?? null
      );
    }
    return pool.find((a) => a.scope === "shared")?.id ?? pool[0]?.id ?? null;
  }, [scopedPayableAccounts, payableAccounts, activeScope]);

  const parents = useMemo(() => {
    if (!userId) return [];
    return listParentCategories(categories, userId);
  }, [categories, userId]);

  const visibleGroups = useMemo(
    () =>
      showScopeTabs
        ? filterBudgetGroupsForScope(groups, activeScope, userId)
        : groups,
    [groups, showScopeTabs, activeScope, userId],
  );

  const scopedSelectedAccountIds = useMemo(() => {
    const allowed = new Set(scopedLiquidAccounts.map((a) => a.id));
    return selectedAccountIds.filter((id) => allowed.has(id));
  }, [selectedAccountIds, scopedLiquidAccounts]);

  const saldoTotal = useMemo(() => {
    const selected = new Set(
      scopedSelectedAccountIds.length > 0
        ? scopedSelectedAccountIds
        : scopedLiquidAccounts.map((a) => a.id),
    );
    const total = scopedLiquidAccounts
      .filter((a) => selected.has(a.id))
      .reduce(
        (sum, account) =>
          sum + calculateAccountCashBalance(expenses, account.id),
        0,
      );
    return Math.round(total * 100) / 100;
  }, [scopedLiquidAccounts, scopedSelectedAccountIds, expenses]);

  const totalPresupuestado = useMemo(
    () => totalBudgeted(visibleGroups),
    [visibleGroups],
  );
  const dineroRestante =
    Math.round((saldoTotal - totalPresupuestado) * 100) / 100;
  const assignedPercent =
    saldoTotal > 0
      ? Math.min(
          100,
          Math.round((totalPresupuestado / saldoTotal) * 1000) / 10,
        )
      : 0;

  useEffect(() => {
    void loadAccounts();
    void loadCategories();
  }, [loadAccounts, loadCategories]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const bump = () => setEnvelopeTick((n) => n + 1);
    window.addEventListener(ENVELOPE_CHANGE_EVENT, bump);
    return () => window.removeEventListener(ENVELOPE_CHANGE_EVENT, bump);
  }, []);

  useEffect(() => {
    if (!userId || !familyId) return;
    if (liquidAccounts.length === 0 && parents.length === 0) return;

    const saved = readMonthEnvelopePlan(familyId, monthKey);
    const defaultAccountIds = liquidAccounts.map((a) => a.id);
    const scopeKey = `${familyId}:${monthKey}`;

    // Storage is source of truth (migration / other screens write here).
    if (saved && saved.groups.length > 0) {
      const validIds = new Set(defaultAccountIds);
      const restoredAccounts =
        saved.accountIds.length > 0
          ? saved.accountIds.filter((id) => validIds.has(id))
          : defaultAccountIds;
      const accountIds =
        restoredAccounts.length > 0 ? restoredAccounts : defaultAccountIds;
      selectedAccountIdsRef.current = accountIds;
      groupsRef.current = saved.groups;
      setSelectedAccountIds(accountIds);
      setGroups(saved.groups);
      emptySeededKeyRef.current = null;
      return;
    }

    if (emptySeededKeyRef.current === scopeKey) return;
    emptySeededKeyRef.current = scopeKey;

    const seededGroups = groupsFromFlatLimits(getLimits(monthKey), parents).map(
      (g) => ({
        ...g,
        defaultAccountId: primaryAccountId,
      }),
    );
    selectedAccountIdsRef.current = defaultAccountIds;
    groupsRef.current = seededGroups;
    setSelectedAccountIds(defaultAccountIds);
    setGroups(seededGroups);
    // getLimits is intentionally omitted (new fn each render); emptySeededKeyRef gates once.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- envelopeTick + accounts/parents drive re-read
  }, [
    userId,
    familyId,
    monthKey,
    liquidAccounts,
    parents,
    primaryAccountId,
    envelopeTick,
  ]);

  function sanitizeGroups(raw: BudgetGroup[]): BudgetGroup[] {
    return raw.map((rawGroup) => {
      const g = normalizeBudgetGroup(rawGroup);
      const dueDay = normalizeDueDay(g.dueDay);
      return {
        ...g,
        name: g.name.trim() || "Presupuesto",
        defaultAccountId: g.defaultAccountId || null,
        scope: g.scope ?? "shared",
        ownerProfileId:
          g.scope === "personal"
            ? g.ownerProfileId ?? userId ?? null
            : null,
        dueDay,
        segments: g.segments.map((s) => ({
          ...s,
          name: s.name.trim(),
          amount: Math.round((Number(s.amount) || 0) * 100) / 100,
          dueDay: normalizeDueDay(s.dueDay),
        })),
        amount: Math.round((Number(g.amount) || 0) * 100) / 100,
      };
    });
  }

  function persistPlan(
    nextGroups: BudgetGroup[],
    nextAccountIds: string[] = selectedAccountIdsRef.current,
    notice?: string,
  ) {
    const cleaned = sanitizeGroups(nextGroups);
    groupsRef.current = cleaned;
    selectedAccountIdsRef.current = nextAccountIds;
    setGroups(cleaned);
    setSelectedAccountIds(nextAccountIds);
    if (!familyId) return;
    writeMonthEnvelopePlan(familyId, monthKey, {
      accountIds: nextAccountIds,
      groups: cleaned,
    });
    setMonthLimits(monthKey, flattenEnvelopeGroups(cleaned));
    if (notice) toast({ title: notice });
  }

  function toggleAccount(accountId: string) {
    const current = selectedAccountIdsRef.current;
    const nextIds = current.includes(accountId)
      ? current.filter((id) => id !== accountId)
      : [...current, accountId];
    persistPlan(groupsRef.current, nextIds);
  }

  function handleCreateBudget(group: BudgetGroup) {
    const scoped: BudgetGroup = normalizeBudgetGroup({
      ...group,
      scope: group.scope ?? activeScope,
      ownerProfileId:
        (group.scope ?? activeScope) === "personal"
          ? group.ownerProfileId ?? userId ?? null
          : null,
      defaultAccountId: group.defaultAccountId || primaryAccountId,
    });
    persistPlan(
      [...groupsRef.current, scoped],
      selectedAccountIdsRef.current,
      "Presupuesto añadido",
    );
  }

  function updateGroupName(groupId: string, name: string) {
    const next = groupsRef.current.map((g) =>
      g.id === groupId ? { ...g, name } : g,
    );
    groupsRef.current = next;
    setGroups(next);
  }

  function commitNames() {
    persistPlan(groupsRef.current);
  }

  function updateGroupAccount(groupId: string, defaultAccountId: string) {
    persistPlan(
      groupsRef.current.map((g) =>
        g.id === groupId
          ? { ...g, defaultAccountId: defaultAccountId || null }
          : g,
      ),
    );
  }

  function updateGroupDueDay(groupId: string, raw: string) {
    const dueDay = normalizeDueDay(raw === "" ? undefined : raw);
    persistPlan(
      groupsRef.current.map((g) =>
        g.id === groupId ? { ...g, dueDay } : g,
      ),
    );
  }

  function updateSegmentDueDay(
    groupId: string,
    segmentId: string,
    raw: string,
  ) {
    const dueDay = normalizeDueDay(raw === "" ? undefined : raw);
    persistPlan(
      groupsRef.current.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          segments: g.segments.map((s) =>
            s.id === segmentId ? { ...s, dueDay } : s,
          ),
        };
      }),
    );
  }

  function removeGroup(groupId: string) {
    persistPlan(groupsRef.current.filter((g) => g.id !== groupId));
    if (detailGroupId === groupId) setDetailGroupId(null);
    setExpandedGroupIds((prev) => {
      if (!prev.has(groupId)) return prev;
      const next = new Set(prev);
      next.delete(groupId);
      return next;
    });
  }

  const detailGroup = useMemo(
    () => groups.find((g) => g.id === detailGroupId) ?? null,
    [groups, detailGroupId],
  );

  function toggleGroupExpanded(groupId: string) {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function addSegment(groupId: string) {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      next.add(groupId);
      return next;
    });
    persistPlan(
      groupsRef.current.map((g) => {
        if (g.id !== groupId) return g;
        const segment: BudgetSegment = {
          id: newEnvelopeId(),
          name: "",
          amount: 0,
        };
        return { ...g, segments: [...g.segments, segment] };
      }),
    );
  }

  function updateSegmentName(
    groupId: string,
    segmentId: string,
    name: string,
  ) {
    const next = groupsRef.current.map((g) => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        segments: g.segments.map((s) =>
          s.id === segmentId ? { ...s, name } : s,
        ),
      };
    });
    groupsRef.current = next;
    setGroups(next);
  }

  function removeSegment(groupId: string, segmentId: string) {
    persistPlan(
      groupsRef.current.map((g) => {
        if (g.id !== groupId) return g;
        const segments = g.segments.filter((s) => s.id !== segmentId);
        return {
          ...g,
          segments,
          amount:
            segments.length === 0
              ? groupEffectiveAmount({ ...g, segments })
              : g.amount,
        };
      }),
    );
  }

  function openAmountEditor(target: AmountTarget) {
    let current = 0;
    const group = groupsRef.current.find((g) => g.id === target.groupId);
    if (!group) return;
    if (target.kind === "group") current = Number(group.amount) || 0;
    else {
      current =
        Number(group.segments.find((s) => s.id === target.segmentId)?.amount) ||
        0;
    }
    setDraftValue(current > 0 ? String(current) : "0");
    setAmountTarget(target);
  }

  function confirmAmount(value?: string) {
    if (!amountTarget) return;
    const normalized = Number(String(value ?? draftValue).replace(/,/g, "."));
    if (!Number.isFinite(normalized) || normalized < 0) {
      setAmountTarget(null);
      return;
    }
    const rounded = Math.round(normalized * 100) / 100;
    const target = amountTarget;
    persistPlan(
      groupsRef.current.map((g) => {
        if (g.id !== target.groupId) return g;
        if (target.kind === "group") {
          return { ...g, amount: rounded };
        }
        return {
          ...g,
          segments: g.segments.map((s) =>
            s.id === target.segmentId ? { ...s, amount: rounded } : s,
          ),
        };
      }),
    );
    setAmountTarget(null);
  }

  const amountTitle = (() => {
    if (!amountTarget) return "Importe";
    const group = groups.find((g) => g.id === amountTarget.groupId);
    if (!group) return "Importe";
    if (amountTarget.kind === "group") return group.name;
    return (
      group.segments.find((s) => s.id === amountTarget.segmentId)?.name ??
      "Categoría"
    );
  })();

  const effectiveSelectedCount =
    scopedSelectedAccountIds.length > 0
      ? scopedSelectedAccountIds.length
      : scopedLiquidAccounts.length;
  const liquidityLabel =
    effectiveSelectedCount === 0
      ? "Sin cuentas"
      : effectiveSelectedCount === 1
        ? "1 cuenta"
        : `${effectiveSelectedCount} cuentas`;

  return (
    <>
      <div className="flex h-dvh flex-col overflow-hidden bg-page-gradient text-on-surface">
        <PageHeader
          title="Presupuesto"
          subtitle={formatMonthLabel(monthKey)}
          className="bg-surface/70"
        />

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain no-scrollbar">
          <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-[var(--fab-clearance)] pt-3">
            {showScopeTabs ? (
              <div className="flex shrink-0 rounded-full border border-outline-variant/20 bg-glass-soft p-0.5">
                {(
                  [
                    { id: "shared" as const, label: "Familia" },
                    { id: "personal" as const, label: "Míos" },
                  ] as const
                ).map((tab) => {
                  const active = scopeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setScopeTab(tab.id)}
                      className={`flex-1 rounded-full px-3 py-1.5 text-[12px] transition-colors ${
                        active
                          ? "bg-glass-strong font-medium text-on-surface shadow-sm"
                          : "font-light text-on-surface-variant"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {/* Hero: mismo lenguaje visual que Cuentas */}
            <section>
              <div
                className="relative overflow-hidden rounded-[1.85rem] border border-glass-border p-5 shadow-[0_14px_40px_rgba(43,52,55,0.12)] backdrop-blur-2xl"
                style={{
                  backgroundImage: tintedGlassGradient(HERO_ACCENT, {
                    soft: true,
                    midAlpha: "28",
                    endAlpha: "3D",
                    midStop: 52,
                  }),
                }}
              >
                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-light text-on-surface-variant">
                      Por asignar
                    </p>
                    <p
                      className={`mt-1.5 font-light leading-none tracking-tight tabular-nums text-[2.65rem] ${
                        dineroRestante < 0
                          ? "text-balance-negative"
                          : "text-on-surface"
                      }`}
                    >
                      <FormattedCurrency value={dineroRestante} />
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAccountsOpen((v) => !v)}
                    className="flex max-w-[42%] shrink-0 items-center gap-2 rounded-2xl py-0.5 text-right transition-opacity hover:opacity-80 active:opacity-70"
                    aria-expanded={accountsOpen}
                    aria-label={
                      accountsOpen
                        ? "Ocultar cuentas de liquidez"
                        : "Elegir cuentas de liquidez"
                    }
                  >
                    <div className="min-w-0 text-right">
                      <p className="truncate text-[10px] font-light text-on-surface-variant">
                        Liquidez visible
                      </p>
                      <p className="truncate text-[12px] font-medium text-on-surface">
                        {liquidityLabel}
                      </p>
                    </div>
                    <span
                      className="icon-chip-fund icon-chip-coin flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
                      style={fundIconChipStyle(HERO_ACCENT)}
                      aria-hidden
                    >
                      <Landmark size={16} strokeWidth={1.75} />
                    </span>
                  </button>
                </div>

                <div className="relative z-10 mt-4">
                  <p className="text-[11px] font-light tabular-nums text-on-surface-variant">
                    Asignado{" "}
                    <span className="text-on-surface/80">
                      <FormattedCurrency value={totalPresupuestado} />
                    </span>
                    {" · "}
                    Liquidez{" "}
                    <span className="text-on-surface/80">
                      <FormattedCurrency value={saldoTotal} />
                    </span>
                  </p>
                  <Progress
                    value={assignedPercent}
                    className="mt-2.5 h-1.5 bg-on-surface/[0.07]"
                    indicatorClassName={
                      dineroRestante < 0
                        ? "bg-[color-mix(in_srgb,var(--balance-negative)_88%,transparent)]"
                        : "bg-primary"
                    }
                  />
                </div>

                {accountsOpen ? (
                  <ul className="relative z-10 mt-4 -mx-1 animate-in fade-in slide-in-from-top-1 duration-200 border-t border-outline-variant/15 pt-2">
                    {scopedLiquidAccounts.length === 0 ? (
                      <li className="px-1 py-3 text-[12px] font-light text-on-surface-variant">
                        {showScopeTabs && activeScope === "personal"
                          ? "No hay cuentas personales de liquidez."
                          : "No hay cuentas de liquidez visibles."}
                      </li>
                    ) : (
                      scopedLiquidAccounts.map((account) => {
                        const checked =
                          scopedSelectedAccountIds.length > 0
                            ? scopedSelectedAccountIds.includes(account.id)
                            : true;
                        const balance = calculateAccountCashBalance(
                          expenses,
                          account.id,
                        );
                        return (
                          <li key={account.id}>
                            <label className="flex cursor-pointer items-center gap-2.5 px-1 py-2 transition-colors hover:bg-on-surface/[0.03]">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleAccount(account.id)}
                                className="h-3.5 w-3.5 rounded border-outline-variant/40 text-primary focus:ring-primary/25"
                              />
                              <span className="min-w-0 flex-1 truncate text-[12px] font-light text-on-surface">
                                {account.name}
                              </span>
                              <span className="shrink-0 text-[11px] font-light tabular-nums text-on-surface-variant">
                                <FormattedCurrency value={balance} />
                              </span>
                            </label>
                          </li>
                        );
                      })
                    )}
                  </ul>
                ) : null}
              </div>
            </section>

            {/* Presupuestos */}
            <section className="pt-1">
              <div className="mb-1 flex items-baseline justify-between gap-3 px-0.5">
                <p className="text-[10px] font-light uppercase tracking-[0.14em] text-on-surface-variant/80">
                  {showScopeTabs && activeScope === "personal"
                    ? "Mis presupuestos"
                    : "Presupuestos"}
                </p>
                {visibleGroups.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="text-[11px] font-light text-on-surface-variant transition-colors hover:text-on-surface"
                  >
                    Nuevo
                  </button>
                ) : null}
              </div>

              {visibleGroups.length === 0 ? (
                <div className="px-0.5 py-8 text-center">
                  <p className="text-[13px] font-light text-on-surface-variant/80">
                    {showScopeTabs && activeScope === "personal"
                      ? "Aún no hay presupuestos personales este mes"
                      : "Aún no hay presupuestos este mes"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="mt-2 text-[12px] font-light text-on-surface/70 underline decoration-outline-variant/40 underline-offset-4 transition-colors hover:text-on-surface"
                  >
                    Crear el primero
                  </button>
                  <div className="mt-4 w-full max-w-sm">
                    <MigrateFundsToBudgetButton embedded />
                  </div>
                </div>
              ) : (
                <ul>
                  {visibleGroups.map((group) => {
                    const hasSegments = group.segments.length > 0;
                    const segmentsOpen = expandedGroupIds.has(group.id);
                    const effective = groupEffectiveAmount(group);
                    const accountName =
                      scopedPayableAccounts.find(
                        (a) =>
                          a.id ===
                          (group.defaultAccountId || primaryAccountId),
                      )?.name ?? "Sin cuenta";
                    return (
                      <li
                        key={group.id}
                        className="border-b border-outline-variant/[0.09] last:border-b-0"
                      >
                        <div className="px-0.5 pt-3">
                          <button
                            type="button"
                            onClick={() => setDetailGroupId(group.id)}
                            className="flex w-full items-baseline gap-3 text-left transition-opacity hover:opacity-80 active:opacity-70"
                          >
                            <span className="min-w-0 flex-1 truncate text-[14px] font-light tracking-tight text-on-surface">
                              {group.name.trim() || "Sin nombre"}
                            </span>
                            <span className="shrink-0 text-[13px] font-light tabular-nums tracking-tight text-on-surface/90">
                              {effective > 0 ? (
                                <FormattedCurrency value={effective} />
                              ) : (
                                <span className="text-outline-variant/70">
                                  0,00
                                </span>
                              )}
                            </span>
                          </button>

                          <div className="mt-0.5 flex items-center gap-1.5 pb-3">
                            <button
                              type="button"
                              onClick={() => setDetailGroupId(group.id)}
                              className="flex min-w-0 flex-1 items-center gap-1.5 text-left transition-opacity hover:opacity-80"
                            >
                              <span className="min-w-0 truncate text-[11px] font-light text-on-surface-variant/75">
                                {accountName}
                              </span>
                              {!hasSegments ? (
                                <>
                                  <span
                                    className="text-[11px] font-light text-outline-variant/45"
                                    aria-hidden
                                  >
                                    ·
                                  </span>
                                  <span className="shrink-0 text-[11px] font-light text-on-surface-variant/70">
                                    {dueDayLabel(group.dueDay)}
                                  </span>
                                </>
                              ) : null}
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleGroupExpanded(group.id)}
                              className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-light text-on-surface-variant/75 transition-colors hover:text-on-surface"
                              aria-expanded={segmentsOpen}
                            >
                              {hasSegments
                                ? group.segments.length === 1
                                  ? "1 categoría"
                                  : `${group.segments.length} categorías`
                                : "Categorías"}
                              <ChevronDown
                                size={11}
                                strokeWidth={1.5}
                                className={`opacity-60 transition-transform ${
                                  segmentsOpen ? "rotate-180" : ""
                                }`}
                                aria-hidden
                              />
                            </button>
                          </div>
                        </div>

                        {segmentsOpen ? (
                          <div className="mb-2.5 space-y-0 pl-3">
                            {group.segments.map((seg) => (
                              <div
                                key={seg.id}
                                className="group/seg border-b border-outline-variant/[0.06] py-1.5 last:border-b-0"
                              >
                                <div className="flex items-baseline gap-2">
                                  <input
                                    type="text"
                                    value={seg.name}
                                    onChange={(e) =>
                                      updateSegmentName(
                                        group.id,
                                        seg.id,
                                        e.target.value,
                                      )
                                    }
                                    onBlur={commitNames}
                                    className="min-w-0 flex-1 bg-transparent text-[13px] font-light text-on-surface/85 outline-none placeholder:text-outline-variant/55"
                                    placeholder="Nombre de la categoría"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openAmountEditor({
                                        kind: "segment",
                                        groupId: group.id,
                                        segmentId: seg.id,
                                      })
                                    }
                                    className="shrink-0 text-[13px] font-light tabular-nums text-on-surface/80 transition-opacity hover:opacity-65"
                                  >
                                    {seg.amount > 0 ? (
                                      <FormattedCurrency value={seg.amount} />
                                    ) : (
                                      <span className="text-outline-variant/60">
                                        0,00
                                      </span>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeSegment(group.id, seg.id)
                                    }
                                    className="shrink-0 text-on-surface-variant/20 transition-colors hover:text-on-surface-variant/60 group-hover/seg:text-on-surface-variant/40"
                                    aria-label={`Eliminar ${seg.name || "categoría"}`}
                                  >
                                    <Trash2 size={10} strokeWidth={1.5} />
                                  </button>
                                </div>
                                <label className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-light text-on-surface-variant/65">
                                  <span className="shrink-0">día</span>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min={1}
                                    max={31}
                                    placeholder="—"
                                    value={seg.dueDay ?? ""}
                                    onChange={(e) =>
                                      updateSegmentDueDay(
                                        group.id,
                                        seg.id,
                                        e.target.value,
                                      )
                                    }
                                    aria-label={`Día de ${seg.name || "categoría"}`}
                                    className="w-8 bg-transparent text-center tabular-nums text-on-surface/75 outline-none placeholder:text-outline-variant/45"
                                  />
                                </label>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addSegment(group.id)}
                              className="inline-flex items-center gap-1 pt-0.5 text-[11px] font-light text-on-surface-variant/55 transition-colors hover:text-on-surface-variant"
                            >
                              <Plus size={11} strokeWidth={1.6} aria-hidden />
                              Añadir categoría
                            </button>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>

      <SimpleBudgetCreateSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        accounts={scopedPayableAccounts}
        defaultAccountId={primaryAccountId}
        scope={activeScope}
        ownerProfileId={activeScope === "personal" ? userId : null}
        onCreate={handleCreateBudget}
      />

      <SimpleBudgetDetailSheet
        open={Boolean(detailGroup)}
        group={detailGroup}
        accounts={scopedPayableAccounts}
        onClose={() => setDetailGroupId(null)}
        onChangeName={updateGroupName}
        onCommitName={commitNames}
        onChangeAccount={updateGroupAccount}
        onChangeDueDay={updateGroupDueDay}
        onEditAmount={(groupId) =>
          openAmountEditor({ kind: "group", groupId })
        }
        onDelete={removeGroup}
      />

      <NumericKeypadSheet
        isOpen={Boolean(amountTarget)}
        title={amountTitle}
        subtitle="Importe del presupuesto"
        initialValue={draftValue}
        onClose={() => setAmountTarget(null)}
        onValueChange={setDraftValue}
        onConfirm={confirmAmount}
      />
    </>
  );
}
