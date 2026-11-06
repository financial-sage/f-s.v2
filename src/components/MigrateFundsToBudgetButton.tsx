"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { useBudget } from "@/hooks/useBudget";
import { useSimpleMode } from "@/hooks/useSimpleMode";
import { toast } from "@/hooks/useToast";
import {
  isLiquidityAccount,
  listPayableAccountsForUser,
  listVisibleAccountsForUser,
} from "@/lib/accounts";
import {
  readMonthEnvelopePlan,
  writeMonthEnvelopePlan,
} from "@/lib/budgetEnvelopes";
import { getMonthKey } from "@/lib/budget";
import { monthlyEquivalent } from "@/lib/fixed-expenses/frequency";
import {
  FUNDS_TO_ENVELOPES_MIGRATION_DONE_KEY,
  migrateFundsToEnvelopes,
} from "@/lib/migration";
import { useAccountsStore } from "@/store/useAccountsStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useFixedExpensesStore } from "@/store/useFixedExpensesStore";
import { useFundsStore } from "@/store/useFundsStore";

type Props = {
  /** Compact row for empty budget state (always offer until plan has groups). */
  embedded?: boolean;
};

/**
 * Temporary control: align spending pockets → Simple Mode envelope plan
 * (flat budgets + Gastos fijos with segments). Local device only.
 */
export function MigrateFundsToBudgetButton({ embedded = false }: Props) {
  const { enabled, hydrated } = useSimpleMode();
  const userId = useExpenseStore((s) => s.userId);
  const familyId = useExpenseStore((s) => s.familyId);
  const expenses = useExpenseStore((s) => s.expenses);
  const refreshData = useExpenseStore((s) => s.refreshData);
  const loadFunds = useFundsStore((s) => s.load);
  const accounts = useAccountsStore((s) => s.accounts);
  const loadAccounts = useAccountsStore((s) => s.load);
  const loadFixedMonth = useFixedExpensesStore((s) => s.loadMonth);
  const { setMonthLimits } = useBudget(familyId ?? "");

  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const liquidAccountIds = useMemo(() => {
    if (!userId) return [] as string[];
    return listVisibleAccountsForUser(accounts, userId)
      .filter((a) => isLiquidityAccount(a))
      .map((a) => a.id);
  }, [accounts, userId]);

  useEffect(() => {
    if (typeof window === "undefined" || !familyId) return;
    const monthKey = getMonthKey();
    const plan = readMonthEnvelopePlan(familyId, monthKey);
    const flagged =
      window.localStorage.getItem(FUNDS_TO_ENVELOPES_MIGRATION_DONE_KEY) ===
      "1";
    if (flagged && (!plan || plan.groups.length === 0)) {
      window.localStorage.removeItem(FUNDS_TO_ENVELOPES_MIGRATION_DONE_KEY);
      setDone(false);
      return;
    }
    setDone(flagged);
  }, [familyId]);

  useEffect(() => {
    if (!enabled || !familyId) return;
    const monthKey = getMonthKey();
    void loadFunds();
    void loadAccounts();
    void loadFixedMonth(monthKey);
  }, [enabled, familyId, loadFunds, loadAccounts, loadFixedMonth]);

  if (!hydrated || !enabled) return null;
  if (done) return null;

  async function runMigration() {
    if (!userId || !familyId || busy) return;
    setBusy(true);
    try {
      const monthKey = getMonthKey();
      await Promise.all([
        loadFunds({ force: true }),
        loadAccounts({ force: true }),
        loadFixedMonth(monthKey, { force: true }),
        refreshData(),
      ]);

      const freshFunds = useFundsStore.getState().funds;
      const freshAccounts = useAccountsStore.getState().accounts;
      const freshExpenses = useExpenseStore.getState().expenses;

      const payable = listPayableAccountsForUser(freshAccounts, userId);
      const liquidIds = listVisibleAccountsForUser(freshAccounts, userId)
        .filter((a) => isLiquidityAccount(a))
        .map((a) => a.id);
      const sharedAccountId =
        payable.find((a) => a.scope === "shared")?.id ?? null;
      const personalAccountId =
        payable.find((a) => a.scope === "personal")?.id ??
        payable[0]?.id ??
        null;

      const snapshot = useFixedExpensesStore.getState().snapshot;
      const fixedExpenses = (snapshot?.items ?? [])
        .filter((item) => item.template.is_active)
        .map((item) => ({
          id: item.template.id,
          name: item.template.name,
          scope:
            item.template.scope === "personal"
              ? ("personal" as const)
              : ("shared" as const),
          dueDay: item.template.due_day,
          amount:
            Math.round(
              (Number(item.payment.base_value_snapshot) > 0
                ? Number(item.payment.base_value_snapshot)
                : monthlyEquivalent(
                    item.template.base_value,
                    item.template.frequency,
                  )) * 100,
            ) / 100,
        }));

      const existingPlan = readMonthEnvelopePlan(familyId, monthKey);
      const accountIds =
        existingPlan?.accountIds?.length
          ? existingPlan.accountIds
          : liquidIds.length > 0
            ? liquidIds
            : liquidAccountIds;

      const result = migrateFundsToEnvelopes({
        funds: freshFunds,
        expenses: freshExpenses.length > 0 ? freshExpenses : expenses,
        fixedExpenses,
        defaultAccountByScope: {
          shared: sharedAccountId ?? personalAccountId,
          personal: personalAccountId ?? sharedAccountId,
        },
        accountIds,
        existingPlan:
          existingPlan && existingPlan.groups.length > 0
            ? existingPlan
            : null,
        userId,
      });

      if (result.plan.groups.length === 0) {
        toast({
          title: "Nada que migrar",
          description:
            "No hay bolsillos variables ni gastos fijos activos en este hogar.",
        });
        return;
      }

      writeMonthEnvelopePlan(familyId, monthKey, result.plan);
      setMonthLimits(monthKey, result.limits);
      window.localStorage.setItem(FUNDS_TO_ENVELOPES_MIGRATION_DONE_KEY, "1");
      setDone(true);

      const noticeText =
        result.notices.length > 0 ? ` ${result.notices.join(" · ")}.` : "";
      toast({
        title: `✅ ${result.migratedVariable} presupuesto${
          result.migratedVariable === 1 ? "" : "s"
        }`,
        description:
          result.migratedVariable === 0 && result.fixedSegments === 0
            ? `Plan actualizado.${noticeText}`
            : `Compartidos y personales listos.${noticeText}`,
      });
    } catch (err) {
      toast({
        title: "No se pudo migrar",
        description:
          err instanceof Error ? err.message : "Error inesperado.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={embedded ? "px-0 py-1" : "px-4 py-3"}>
      <button
        type="button"
        disabled={busy || !userId}
        onClick={() => void runMigration()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-800/35 bg-amber-800/[0.08] px-4 py-3 text-[13px] font-medium text-amber-900/90 transition-colors hover:bg-amber-800/[0.12] disabled:opacity-60 dark:border-amber-200/25 dark:bg-amber-200/[0.08] dark:text-amber-100/90"
      >
        <ArrowRightLeft size={15} strokeWidth={1.75} aria-hidden />
        {busy ? "Migrando…" : "Migrar bolsillos a presupuestos"}
      </button>
      {!embedded ? (
        <p className="mt-1.5 text-[10px] font-light text-on-surface-variant">
          Temporal · crea presupuestos compartidos y personales + Gastos fijos.
          No archiva bolsillos ni toca Ahorro.
        </p>
      ) : (
        <p className="mt-1.5 text-center text-[10px] font-light text-on-surface-variant">
          Trae tus bolsillos (familia y míos) como presupuestos
        </p>
      )}
    </div>
  );
}
