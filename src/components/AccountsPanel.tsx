"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Landmark,
  LoaderCircle,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import {
  archiveAccountAction,
  createAccountAction,
  getAccountsOverviewAction,
  registerAccountIncomeAction,
  registerExternalOutflowAction,
  transferAccountToFundAction,
  transferBetweenAccountsAction,
  transferFundToAccountAction,
  updateAccountVisibilityAction,
} from "@/app/actions/accounts";
import type { AccountScope, AccountVisibility, FamilyAccount } from "@/lib/accounts";
import {
  calculateAccountCashBalance,
  canOperateAccount,
  DEFAULT_PERSONAL_ACCOUNT_COLOR,
  listOperableAccountsForUser,
  listVisibleAccountsForUser,
  resolveAccountColor,
} from "@/lib/accounts";
import type { FamilyFund } from "@/lib/funds";
import { NumericKeypadSheet } from "@/components/NumericKeypadSheet";
import { Sheet } from "@/components/ui/Sheet";
import { useCurrency } from "@/hooks/useCurrency";
import { useAccountsStore } from "@/store/useAccountsStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useFundsStore } from "@/store/useFundsStore";
import { tintedGlassGradient } from "@/lib/glass";

const HERO_ACCENT = DEFAULT_PERSONAL_ACCOUNT_COLOR;

type TransferKind = "account" | "to_fund" | "from_fund" | "external";
type TransferStep = "choose" | "configure";

interface AccountsPanelProps {
  currentUserId: string;
}

function seedFromCaches(userId: string): {
  accounts: FamilyAccount[];
  funds: FamilyFund[];
  balances: Record<string, number>;
  totalLiquidity: number;
} {
  const cachedAccounts = useAccountsStore.getState().accounts;
  const accounts = listVisibleAccountsForUser(cachedAccounts, userId);
  const { expenses, isHydrated } = useExpenseStore.getState();
  const cachedFunds = useFundsStore.getState().funds;
  const funds = cachedFunds.filter(
    (f) => !f.archived_at && (f.scope === "shared" || f.owner_profile_id === userId)
  );

  if (!isHydrated || accounts.length === 0) {
    return { accounts, funds, balances: {}, totalLiquidity: 0 };
  }

  const balances = Object.fromEntries(
    accounts.map((account) => [account.id, calculateAccountCashBalance(expenses, account.id)])
  );
  const totalLiquidity =
    Math.round(Object.values(balances).reduce((s, b) => s + b, 0) * 100) / 100;

  return { accounts, funds, balances, totalLiquidity };
}

const TRANSFER_OPTIONS: Array<{
  id: TransferKind;
  label: string;
  hint: string;
  icon: typeof ArrowLeftRight;
}> = [
  { id: "account", label: "Otra cuenta", hint: "Entre cuentas", icon: ArrowLeftRight },
  { id: "to_fund", label: "Un bolsillo", hint: "Para gastar", icon: ArrowDownToLine },
  { id: "from_fund", label: "Desde bolsillo", hint: "Recuperar", icon: ArrowUpFromLine },
  { id: "external", label: "Fuera", hint: "Sale del sistema", icon: ArrowUpFromLine },
];

export default function AccountsPanel({ currentUserId }: AccountsPanelProps) {
  const router = useRouter();
  const { format: formatCurrency } = useCurrency();
  const setAccountsCache = useAccountsStore((s) => s.setAccounts);
  const setFundsCache = useFundsStore((s) => s.setFunds);

  const [seed] = useState(() => seedFromCaches(currentUserId));
  const [accounts, setAccounts] = useState<FamilyAccount[]>(seed.accounts);
  const [funds, setFunds] = useState<FamilyFund[]>(seed.funds);
  const [balances, setBalances] = useState<Record<string, number>>(seed.balances);
  const [totalLiquidity, setTotalLiquidity] = useState(seed.totalLiquidity);
  const [isLoadingOverview, setIsLoadingOverview] = useState(seed.accounts.length === 0);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [isPending, startTransition] = useTransition();

  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScope, setNewScope] = useState<AccountScope>("personal");
  const [newVisibility, setNewVisibility] = useState<AccountVisibility>("private");
  const [createError, setCreateError] = useState("");

  const [incomeAccountId, setIncomeAccountId] = useState<string | null>(null);
  const [incomeAmount, setIncomeAmount] = useState("0");
  const [showIncomeKeypad, setShowIncomeKeypad] = useState(false);

  const [showTransferSheet, setShowTransferSheet] = useState(false);
  const [transferAccountId, setTransferAccountId] = useState<string | null>(null);
  const [transferStep, setTransferStep] = useState<TransferStep>("choose");
  const [transferKind, setTransferKind] = useState<TransferKind>("account");
  const [counterpartId, setCounterpartId] = useState("");
  const [transferAmount, setTransferAmount] = useState("0");
  const [showTransferKeypad, setShowTransferKeypad] = useState(false);
  const [outflowConcept, setOutflowConcept] = useState("");
  const [transferError, setTransferError] = useState("");
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [menuAccountId, setMenuAccountId] = useState<string | null>(null);

  const operable = useMemo(
    () => listOperableAccountsForUser(accounts, currentUserId),
    [accounts, currentUserId]
  );

  const personalAccounts = useMemo(
    () => accounts.filter((a) => a.scope === "personal"),
    [accounts]
  );
  const sharedAccounts = useMemo(
    () => accounts.filter((a) => a.scope === "shared"),
    [accounts]
  );

  const transferAccount = useMemo(
    () => accounts.find((a) => a.id === transferAccountId) ?? null,
    [accounts, transferAccountId]
  );

  const counterpartOptions = useMemo(() => {
    if (!transferAccountId) return [] as Array<{ id: string; name: string }>;

    if (transferKind === "account") {
      return accounts
        .filter(
          (a) =>
            a.id !== transferAccountId &&
            (a.scope === "shared" || a.owner_profile_id === currentUserId)
        )
        .map((a) => ({ id: a.id, name: a.name }));
    }
    if (transferKind === "to_fund" || transferKind === "from_fund") {
      return funds.map((f) => ({ id: f.id, name: f.name }));
    }
    return [];
  }, [accounts, currentUserId, funds, transferAccountId, transferKind]);

  async function refresh() {
    const overview = await getAccountsOverviewAction();
    setAccounts(overview.accounts);
    setAccountsCache(overview.accounts);
    setFunds(overview.funds);
    setFundsCache(overview.funds);
    setBalances(Object.fromEntries(overview.balances.map((b) => [b.account.id, b.balance])));
    setTotalLiquidity(overview.totalVisibleLiquidity);
    setIsLoadingOverview(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Soft-refresh: paint from Zustand first (seed), then reconcile with server.
        const overview = await getAccountsOverviewAction();
        if (cancelled) return;
        setAccounts(overview.accounts);
        setAccountsCache(overview.accounts);
        setFunds(overview.funds);
        setFundsCache(overview.funds);
        setBalances(
          Object.fromEntries(overview.balances.map((b) => [b.account.id, b.balance]))
        );
        setTotalLiquidity(overview.totalVisibleLiquidity);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "No se pudieron cargar las cuentas."
          );
        }
      } finally {
        if (!cancelled) setIsLoadingOverview(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setAccountsCache, setFundsCache]);

  function showBalanceWarning(flag?: boolean) {
    if (flag) {
      setWarning(
        "Esta cuenta queda en negativo. Puedes seguir; solo tenlo presente al repartir."
      );
    } else {
      setWarning("");
    }
  }

  function openCreateSheet() {
    setCreateError("");
    setNewName("");
    setNewScope("personal");
    setNewVisibility("private");
    setShowCreateSheet(true);
  }

  function closeCreateSheet() {
    setShowCreateSheet(false);
    setCreateError("");
  }

  function handleCreate() {
    const name = newName.trim();
    if (!name) {
      setCreateError("Escribe un nombre para la cuenta.");
      return;
    }
    setCreateError("");
    startTransition(async () => {
      try {
        await createAccountAction({
          name,
          scope: newScope,
          visibility: newScope === "personal" ? newVisibility : "family_visible",
        });
        setNewName("");
        closeCreateSheet();
        await refresh();
        router.refresh();
      } catch (err) {
        setCreateError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
      }
    });
  }

  function openIncome(accountId: string) {
    setIncomeAccountId(accountId);
    setIncomeAmount("0");
    setShowIncomeKeypad(true);
  }

  function confirmIncome(nextValue?: string) {
    const amount = Number((nextValue ?? incomeAmount).replace(/,/g, ".").trim());
    if (!incomeAccountId || !Number.isFinite(amount) || amount <= 0) {
      setError("Ingresa un monto válido.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await registerAccountIncomeAction({ accountId: incomeAccountId, amount });
        setShowIncomeKeypad(false);
        setIncomeAccountId(null);
        setWarning("");
        await refresh();
        const { syncFamilyExpenses } = await import("@/lib/realtimeFamily");
        await syncFamilyExpenses();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo registrar el ingreso.");
      }
    });
  }

  function openTransferSheet(account: FamilyAccount) {
    setTransferAccountId(account.id);
    setTransferStep("choose");
    setTransferKind("account");
    setCounterpartId("");
    setOutflowConcept("");
    setTransferError("");
    setTransferAmount("0");
    setShowTransferSheet(true);
  }

  function closeTransferSheet() {
    setShowTransferSheet(false);
    setTransferAccountId(null);
    setTransferStep("choose");
    setTransferError("");
    setShowTransferKeypad(false);
  }

  function selectTransferKind(kind: TransferKind) {
    if (!transferAccountId) return;
    setTransferKind(kind);
    setTransferError("");
    setOutflowConcept("");

    if (kind === "account") {
      const first =
        sharedAccounts.find((a) => a.id !== transferAccountId)?.id ??
        operable.find((a) => a.id !== transferAccountId)?.id ??
        "";
      setCounterpartId(first);
    } else if (kind === "to_fund" || kind === "from_fund") {
      setCounterpartId(funds[0]?.id ?? "");
    } else {
      setCounterpartId("");
    }

    setTransferStep("configure");
  }

  function proceedToAmount() {
    if (transferKind !== "external" && !counterpartId) {
      setTransferError(
        transferKind === "account"
          ? "Elige la cuenta destino."
          : "Elige un bolsillo."
      );
      return;
    }
    setTransferError("");
    setTransferAmount("0");
    setShowTransferKeypad(true);
  }

  function confirmTransfer(nextValue?: string) {
    const amount = Number((nextValue ?? transferAmount).replace(/,/g, ".").trim());
    if (!transferAccountId || !Number.isFinite(amount) || amount <= 0) {
      setTransferError("Ingresa un importe válido.");
      setShowTransferKeypad(false);
      return;
    }
    setTransferError("");
    setError("");
    startTransition(async () => {
      try {
        let result: { balanceWarning?: boolean } = {};
        if (transferKind === "account") {
          result = await transferBetweenAccountsAction({
            fromAccountId: transferAccountId,
            toAccountId: counterpartId,
            amount,
          });
        } else if (transferKind === "to_fund") {
          result = await transferAccountToFundAction({
            fromAccountId: transferAccountId,
            toFundId: counterpartId,
            amount,
          });
        } else if (transferKind === "from_fund") {
          result = await transferFundToAccountAction({
            fromFundId: counterpartId,
            toAccountId: transferAccountId,
            amount,
          });
        } else {
          result = await registerExternalOutflowAction({
            accountId: transferAccountId,
            amount,
            concept: outflowConcept.trim() || undefined,
          });
        }
        showBalanceWarning(result.balanceWarning);
        setShowTransferKeypad(false);
        closeTransferSheet();
        await refresh();
        const { syncFamilyExpenses } = await import("@/lib/realtimeFamily");
        await syncFamilyExpenses();
        router.refresh();
      } catch (err) {
        setShowTransferKeypad(false);
        setTransferError(
          err instanceof Error ? err.message : "No se pudo completar el movimiento."
        );
      }
    });
  }

  function handleVisibility(account: FamilyAccount) {
    if (account.scope !== "personal" || account.owner_profile_id !== currentUserId) return;
    const next: AccountVisibility =
      account.visibility === "private" ? "family_visible" : "private";
    startTransition(async () => {
      try {
        await updateAccountVisibilityAction({ accountId: account.id, visibility: next });
        await refresh();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cambiar la visibilidad.");
      }
    });
  }

  function handleArchive(account: FamilyAccount) {
    const balance = balances[account.id] ?? 0;
    const needsConfirm = Math.abs(balance) > 0.009;
    if (
      needsConfirm &&
      !window.confirm(
        `«${account.name}» tiene saldo ${formatCurrency(balance)}. ¿Archivarla igual? Dejará de contar como liquidez activa.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await archiveAccountAction({
          accountId: account.id,
          confirmNonZeroBalance: needsConfirm,
        });
        await refresh();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo archivar.");
      }
    });
  }

  function renderAccountGroup(title: string, rows: FamilyAccount[]) {
    if (rows.length === 0) return null;

    return (
      <div className="mb-4">
        <h2 className="mb-2 px-1 text-xs font-medium text-on-surface">{title}</h2>
        <div className="overflow-hidden rounded-[1.5rem] border border-glass-border bg-glass-strong shadow-[0_12px_28px_rgba(43,52,55,0.10)] backdrop-blur-xl">
          {rows.map((account, index) => {
            const balance = balances[account.id] ?? 0;
            const operableForUser = canOperateAccount(account, currentUserId);
            const color = resolveAccountColor(account);
            const isOwnerPersonal =
              account.scope === "personal" && account.owner_profile_id === currentUserId;
            const menuOpen = menuAccountId === account.id;
            const isFirst = index === 0;
            const isLast = index === rows.length - 1;

            return (
              <div
                key={account.id}
                className={`relative px-3 py-3 ${
                  index > 0 ? "border-t border-outline-variant/15" : ""
                } ${isFirst ? "rounded-t-[1.5rem]" : ""} ${isLast ? "rounded-b-[1.5rem]" : ""}`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${color}22`, color }}
                  >
                    <Landmark size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium tracking-tight text-on-surface">
                      {account.name}
                    </p>
                    <p className="mt-0.5 text-[10px] font-light text-on-surface-variant">
                      {account.scope === "shared" ? "Compartida" : "Personal"}
                      {account.scope === "personal"
                        ? account.visibility === "private"
                          ? " · solo tú"
                          : " · visible para la pareja"
                        : ""}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 text-sm font-light tabular-nums tracking-tight ${
                      balance < 0 ? "text-red-600" : "text-on-surface"
                    }`}
                  >
                    {balanceVisible ? formatCurrency(balance) : "••••"}
                  </p>
                </div>

                {balance < 0 && balanceVisible && (
                  <p className="mt-2 text-[11px] font-light text-amber-700 dark:text-amber-400">
                    Saldo en negativo: puedes seguir; revísalo cuando puedas.
                  </p>
                )}

                {operableForUser && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openIncome(account.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-surface-low px-2.5 py-1 text-[11px] font-medium text-on-surface transition-colors hover:bg-surface-container"
                    >
                      <Plus size={12} />
                      Ingreso
                    </button>
                    <button
                      type="button"
                      onClick={() => openTransferSheet(account)}
                      className="inline-flex items-center gap-1 rounded-full bg-surface-low px-2.5 py-1 text-[11px] font-medium text-on-surface transition-colors hover:bg-surface-container"
                    >
                      <ArrowLeftRight size={12} />
                      Transferir
                    </button>
                    <div className="relative ml-auto">
                      <button
                        type="button"
                        onClick={() =>
                          setMenuAccountId((prev) => (prev === account.id ? null : account.id))
                        }
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-glass-soft"
                        aria-label={`Más opciones de ${account.name}`}
                      >
                        <MoreHorizontal size={15} />
                      </button>
                      {menuOpen && (
                        <>
                          <button
                            type="button"
                            aria-label="Cerrar menú"
                            className="fixed inset-0 z-40 cursor-default"
                            onClick={() => setMenuAccountId(null)}
                          />
                          <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-2xl border border-glass-border bg-glass-soft shadow-[0_12px_28px_rgba(43,52,55,0.12)] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
                            {isOwnerPersonal && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuAccountId(null);
                                  handleVisibility(account);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] font-medium text-on-surface hover:bg-glass"
                              >
                                {account.visibility === "private" ? (
                                  <Eye size={13} />
                                ) : (
                                  <EyeOff size={13} />
                                )}
                                {account.visibility === "private"
                                  ? "Hacer visible"
                                  : "Solo yo"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setMenuAccountId(null);
                                handleArchive(account);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[12px] font-medium text-on-surface-variant hover:bg-glass"
                            >
                              <Archive size={13} />
                              Archivar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const selectedOption = TRANSFER_OPTIONS.find((o) => o.id === transferKind);

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-page-gradient text-on-surface">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-56"
        style={{
          backgroundImage: `radial-gradient(ellipse at bottom, ${HERO_ACCENT}2E, transparent 70%)`,
        }}
      />

      <header className="relative z-50 flex w-full shrink-0 items-center justify-between px-4 pb-1.5 pt-[max(0.75rem,var(--safe-top))]">
        <div className="w-9" aria-hidden />
        <div className="min-w-0 text-center">
          <p className="text-[11px] font-light text-on-surface-variant">Liquidez familiar</p>
          <h1 className="truncate text-[15px] font-medium tracking-tight text-on-surface">
            Centro de cuentas
          </h1>
        </div>
        <button
          type="button"
          onClick={openCreateSheet}
          className="rounded-full border border-glass-border bg-glass-strong p-2 text-on-surface shadow-sm backdrop-blur-sm transition-colors hover:bg-glass"
          aria-label="Crear cuenta"
          title="Crear cuenta"
        >
          <Plus size={18} />
        </button>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 min-h-0 flex-col overflow-hidden px-4 pt-1">
        <section className="mb-3 shrink-0">
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
            <div className="relative z-10 flex min-w-0 items-center gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${HERO_ACCENT}28`, color: HERO_ACCENT }}
              >
                <Landmark size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-light text-on-surface-variant">
                  Liquidez visible
                </p>
                <p className="truncate text-base font-medium text-on-surface">
                  {accounts.length === 0
                    ? "Sin cuentas aún"
                    : `${accounts.length} cuenta${accounts.length === 1 ? "" : "s"}`}
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-4 flex items-center gap-2.5">
              <p
                className={`text-[2.65rem] font-light leading-none tracking-tight ${
                  totalLiquidity < 0 ? "text-red-600" : "text-on-surface"
                }`}
              >
                {balanceVisible ? formatCurrency(totalLiquidity) : "••••••"}
              </p>
              <button
                type="button"
                onClick={() => setBalanceVisible((v) => !v)}
                className="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-glass-soft"
                aria-label={balanceVisible ? "Ocultar saldo" : "Mostrar saldo"}
              >
                {balanceVisible ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>

            <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openCreateSheet}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container"
              >
                <Plus size={12} />
                Nueva cuenta
              </button>
              {sharedAccounts[0] && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-3 py-1.5 text-xs font-medium text-on-surface">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: resolveAccountColor(sharedAccounts[0]) }}
                  />
                  {sharedAccounts[0].name} ·{" "}
                  {balanceVisible
                    ? formatCurrency(balances[sharedAccounts[0].id] ?? 0)
                    : "••••"}
                </span>
              )}
            </div>
          </div>
        </section>

        {error && (
          <div className="alert-error mb-3 shrink-0 rounded-2xl px-3 py-2 text-xs">{error}</div>
        )}
        {warning && (
          <div className="mb-3 shrink-0 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            {warning}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-none pb-[var(--fab-clearance)] no-scrollbar">
          {accounts.length === 0 && isLoadingOverview ? (
            <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
              <LoaderCircle className="h-5 w-5 animate-spin text-on-surface-variant" />
              <p className="text-xs font-light text-on-surface-variant">Cargando cuentas…</p>
            </div>
          ) : accounts.length === 0 ? (
            <button
              type="button"
              onClick={openCreateSheet}
              className="flex w-full flex-col items-center gap-2 rounded-[1.85rem] border border-dashed bg-glass-soft px-4 py-10 text-center shadow-sm backdrop-blur-md"
              style={{ borderColor: `${HERO_ACCENT}40` }}
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: `${HERO_ACCENT}1A`, color: HERO_ACCENT }}
              >
                <Plus size={18} />
              </span>
              <span className="text-sm font-medium text-on-surface">Crea tu primera cuenta</span>
              <span className="max-w-[220px] text-xs font-light text-on-surface-variant">
                Personal para la nómina, o compartida con tu pareja.
              </span>
            </button>
          ) : (
            <>
              {renderAccountGroup("Compartidas", sharedAccounts)}
              {personalAccounts.length === 0 ? (
                <div className="mb-4">
                  <h2 className="mb-2 px-1 text-xs font-medium text-on-surface">Personales</h2>
                  <button
                    type="button"
                    onClick={openCreateSheet}
                    className="w-full rounded-[1.5rem] border border-glass-border bg-glass-strong px-4 py-5 text-center text-xs font-light text-on-surface-variant shadow-sm backdrop-blur-xl transition-colors hover:bg-glass"
                  >
                    Aún no tienes cuentas personales. Toca para crear una.
                  </button>
                </div>
              ) : (
                renderAccountGroup("Personales", personalAccounts)
              )}
            </>
          )}
        </div>
      </main>

      <Sheet
        open={showTransferSheet}
        onClose={closeTransferSheet}
        title="Mover dinero"
        closeOnBackdrop
        heightClassName="h-auto max-h-[88dvh]"
      >
        <div className="flex flex-col gap-5 pb-2">
          {transferStep === "choose" ? (
            <>
              <div className="text-center">
                <p className="text-[11px] font-light text-on-surface-variant">Mover desde</p>
                <p className="mt-1 text-base font-medium tracking-tight text-on-surface">
                  {transferAccount?.name ?? "Cuenta"}
                </p>
              </div>

              <div className="overflow-hidden rounded-[1.5rem] border border-glass-border bg-glass-strong shadow-[0_12px_28px_rgba(43,52,55,0.08)] backdrop-blur-xl">
                {TRANSFER_OPTIONS.map((opt, index) => {
                  const Icon = opt.icon;
                  const disabled =
                    (opt.id === "account" &&
                      accounts.filter(
                        (a) =>
                          a.id !== transferAccountId &&
                          (a.scope === "shared" || a.owner_profile_id === currentUserId)
                      ).length === 0) ||
                    ((opt.id === "to_fund" || opt.id === "from_fund") && funds.length === 0);

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => selectTransferKind(opt.id)}
                      className={`flex w-full items-center gap-3 px-3.5 py-3.5 text-left transition-colors active:bg-glass-soft disabled:cursor-not-allowed disabled:opacity-40 ${
                        index > 0 ? "border-t border-outline-variant/15" : ""
                      }`}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{
                          backgroundImage: tintedGlassGradient(HERO_ACCENT, {
                            soft: true,
                            midAlpha: "22",
                            endOnly: true,
                          }),
                          color: HERO_ACCENT,
                        }}
                      >
                        <Icon size={16} strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium tracking-tight text-on-surface">
                          {opt.label}
                        </span>
                        <span className="block text-[11px] font-light text-on-surface-variant">
                          {opt.hint}
                        </span>
                      </span>
                      <ChevronRight
                        size={15}
                        className="shrink-0 text-outline-variant"
                        strokeWidth={1.75}
                      />
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTransferStep("choose");
                    setTransferError("");
                  }}
                  className="inline-flex items-center gap-0.5 rounded-full px-1 py-1 text-xs font-medium text-on-surface-variant transition-colors hover:text-on-surface"
                >
                  <ChevronLeft size={15} />
                  Atrás
                </button>
                <p className="text-[11px] font-light text-on-surface-variant">
                  {selectedOption?.label}
                </p>
                <span className="w-12" aria-hidden />
              </div>

              <div
                className="relative overflow-hidden rounded-[1.85rem] border border-glass-border p-4 shadow-[0_12px_28px_rgba(43,52,55,0.10)] backdrop-blur-xl"
                style={{
                  backgroundImage: tintedGlassGradient(HERO_ACCENT, {
                    soft: true,
                    midAlpha: "18",
                    endAlpha: "28",
                    midStop: 55,
                  }),
                }}
              >
                <div className="relative z-10 flex items-center gap-2">
                  <div className="min-w-0 flex-1 rounded-2xl bg-glass-soft/80 px-3 py-2.5 backdrop-blur-sm">
                    <p className="text-[10px] font-light text-on-surface-variant">
                      {transferKind === "from_fund" ? "Hacia" : "Desde"}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium tracking-tight text-on-surface">
                      {transferAccount?.name}
                    </p>
                  </div>
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${HERO_ACCENT}22`, color: HERO_ACCENT }}
                  >
                    {transferKind === "from_fund" ? (
                      <ArrowDownToLine size={14} />
                    ) : (
                      <ArrowLeftRight size={14} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 rounded-2xl bg-glass-soft/80 px-3 py-2.5 backdrop-blur-sm">
                    <p className="text-[10px] font-light text-on-surface-variant">
                      {transferKind === "from_fund"
                        ? "Desde"
                        : transferKind === "external"
                          ? "Hacia"
                          : "Hacia"}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium tracking-tight text-on-surface">
                      {transferKind === "external"
                        ? "Fuera"
                        : counterpartOptions.find((o) => o.id === counterpartId)?.name ??
                          "Elige…"}
                    </p>
                  </div>
                </div>
              </div>

              {transferKind !== "external" && (
                <div>
                  <p className="mb-2 px-1 text-xs font-medium text-on-surface">
                    {transferKind === "from_fund" ? "¿Desde qué bolsillo?" : "¿Hacia dónde?"}
                  </p>
                  {counterpartOptions.length === 0 ? (
                    <p className="rounded-[1.25rem] bg-glass-soft px-4 py-4 text-center text-xs font-light text-on-surface-variant">
                      {transferKind === "account"
                        ? "No hay otra cuenta disponible."
                        : "No hay bolsillos disponibles."}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {counterpartOptions.map((item) => {
                        const selected = counterpartId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setCounterpartId(item.id)}
                            className={`rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-[0.98] ${
                              selected
                                ? "border-transparent text-on-surface shadow-sm"
                                : "border-glass-border bg-glass text-on-surface-variant hover:bg-glass-strong"
                            }`}
                            style={
                              selected
                                ? {
                                    backgroundImage: tintedGlassGradient(HERO_ACCENT, {
                                      soft: true,
                                      midAlpha: "28",
                                      endOnly: true,
                                    }),
                                    borderColor: `${HERO_ACCENT}40`,
                                    color: HERO_ACCENT,
                                  }
                                : undefined
                            }
                          >
                            {item.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {transferKind === "external" && (
                <div>
                  <p className="mb-2 px-1 text-xs font-medium text-on-surface">
                    Motivo <span className="font-light text-on-surface-variant">(opcional)</span>
                  </p>
                  <input
                    id="outflow-concept"
                    value={outflowConcept}
                    onChange={(e) => setOutflowConcept(e.target.value)}
                    placeholder="Ej. Retiro en efectivo"
                    className="w-full rounded-[1.25rem] border border-glass-border bg-glass px-4 py-3 text-sm outline-none backdrop-blur-md placeholder:text-outline-variant focus:ring-2 focus:ring-primary/15"
                  />
                </div>
              )}

              {transferError && (
                <div className="alert-error rounded-2xl px-3 py-2 text-xs">{transferError}</div>
              )}

              <button
                type="button"
                disabled={isPending || (transferKind !== "external" && !counterpartId)}
                onClick={proceedToAmount}
                className="fab-ink inline-flex h-12 w-full items-center justify-center gap-2 rounded-[1.25rem] text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                {isPending ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : null}
                Continuar
              </button>
            </>
          )}
        </div>
      </Sheet>

      <Sheet
        open={showCreateSheet}
        onClose={closeCreateSheet}
        title="Nueva cuenta"
        closeOnBackdrop
        heightClassName="h-auto max-h-[85dvh]"
      >
        <div className="flex flex-col gap-4 pb-2">
          <div>
            <h2 className="text-base font-medium tracking-tight text-on-surface">
              Nueva cuenta
            </h2>
            <p className="mt-1 text-xs text-on-surface-variant">
              Simula dónde vive el dinero antes de repartirlo en bolsillos.
            </p>
          </div>

          <div>
            <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">
              Tipo
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNewScope("personal")}
                className={`flex-1 rounded-2xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                  newScope === "personal"
                    ? "bg-primary/15 text-primary"
                    : "bg-surface text-on-surface-variant"
                }`}
              >
                Personal
              </button>
              <button
                type="button"
                onClick={() => setNewScope("shared")}
                className={`flex-1 rounded-2xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                  newScope === "shared"
                    ? "bg-primary/15 text-primary"
                    : "bg-surface text-on-surface-variant"
                }`}
              >
                Compartida
              </button>
            </div>
          </div>

          {newScope === "personal" && (
            <div>
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">
                Visibilidad
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewVisibility("private")}
                  className={`flex-1 rounded-2xl px-3 py-2.5 text-[11px] font-semibold transition-colors ${
                    newVisibility === "private"
                      ? "bg-surface-container text-on-surface"
                      : "bg-surface text-on-surface-variant"
                  }`}
                >
                  Solo yo
                </button>
                <button
                  type="button"
                  onClick={() => setNewVisibility("family_visible")}
                  className={`flex-1 rounded-2xl px-3 py-2.5 text-[11px] font-semibold transition-colors ${
                    newVisibility === "family_visible"
                      ? "bg-surface-container text-on-surface"
                      : "bg-surface text-on-surface-variant"
                  }`}
                >
                  Visible para la pareja
                </button>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="new-account-name"
              className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-on-surface-variant"
            >
              Nombre
            </label>
            <input
              id="new-account-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              placeholder={
                newScope === "shared" ? "Ej. Cuenta conjunta" : "Ej. Nómina"
              }
              autoFocus
              className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {createError && (
            <div className="alert-error rounded-2xl px-3 py-2 text-xs">{createError}</div>
          )}

          <button
            type="button"
            disabled={isPending}
            onClick={handleCreate}
            className="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-on-primary disabled:opacity-60"
          >
            {isPending ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            {isPending ? "Creando…" : "Crear cuenta"}
          </button>
        </div>
      </Sheet>

      <NumericKeypadSheet
        isOpen={showIncomeKeypad}
        title="REGISTRAR INGRESO"
        initialValue={incomeAmount}
        onClose={() => setShowIncomeKeypad(false)}
        onValueChange={setIncomeAmount}
        onConfirm={confirmIncome}
      />

      <NumericKeypadSheet
        isOpen={showTransferKeypad}
        title={transferKind === "external" ? "SALIDA EXTERNA" : "MOVER DINERO"}
        initialValue={transferAmount}
        onClose={() => setShowTransferKeypad(false)}
        onValueChange={setTransferAmount}
        onConfirm={confirmTransfer}
      />
    </div>
  );
}
