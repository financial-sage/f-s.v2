"use client";

import { FormattedCurrency } from "@/components/FormattedCurrency";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Archive,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  CreditCard,
  Landmark,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  TrendingUp,
} from "lucide-react";
import {
  archiveAccountAction,
  createAccountAction,
  getAccountsOverviewAction,
  registerAccountIncomeAction,
  registerExternalOutflowAction,
  setCreditDebtAction,
  setInvestmentValueAction,
  transferAccountToFundAction,
  transferBetweenAccountsAction,
  transferFundToAccountAction,
  updateAccountAction,
  updateAccountVisibilityAction,
  type AccountsOverview,
} from "@/app/actions/accounts";
import type {
  AccountKind,
  AccountScope,
  AccountVisibility,
  FamilyAccount,
} from "@/lib/accounts";
import {
  ACCOUNT_KIND_HINTS,
  ACCOUNT_KIND_LABELS,
  accountKindOf,
  calculateAccountCashBalance,
  canOperateAccount,
  creditDebtFromBalance,
  DEFAULT_PERSONAL_ACCOUNT_COLOR,
  displayAccountAmount,
  isCreditAccount,
  isDefaultCashAccountName,
  isInvestmentAccount,
  isLiquidityAccount,
  listOperableAccountsForUser,
  listVisibleAccountsForUser,
  resolveAccountColor,
  sumVisibleLiquidity,
} from "@/lib/accounts";
import {
  fundIconChipStyle,
  listAccountTransferFunds,
  personalFundDisplayName,
  type FamilyFund,
} from "@/lib/funds";
import { NumericKeypadSheet } from "@/components/NumericKeypadSheet";
import { Portal } from "@/components/ui/Portal";
import { Sheet } from "@/components/ui/Sheet";
import { useCurrency } from "@/hooks/useCurrency";
import { useAccountsStore } from "@/store/useAccountsStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useFundsStore } from "@/store/useFundsStore";
import { tintedGlassGradient } from "@/lib/glass";
import { isIndividualHousehold } from "@/lib/household";
import ProductTour from "@/components/ProductTour";
import { useProductTour } from "@/hooks/useProductTour";
import type { ProductTourStep } from "@/components/ProductTour";

const HERO_ACCENT = DEFAULT_PERSONAL_ACCOUNT_COLOR;

type TransferKind = "account" | "to_fund" | "from_fund" | "external";
type TransferStep = "choose" | "configure";
type AccountsTab = AccountKind; // checking | credit | investment

const ACCOUNTS_TABS: Array<{ id: AccountsTab; label: string }> = [
  { id: "checking", label: "Cuentas" },
  { id: "credit", label: "Créditos" },
  { id: "investment", label: "Inversiones" },
];

interface AccountsPanelProps {
  currentUserId: string;
  familyMemberCount?: number;
  /** Server-loaded overview — avoids a second server-action round-trip on mount. */
  initialOverview?: AccountsOverview;
}

function seedFromCaches(
  userId: string,
  familyMemberCount: number
): {
  accounts: FamilyAccount[];
  funds: FamilyFund[];
  balances: Record<string, number>;
  totalLiquidity: number;
} {
  const cachedAccounts = useAccountsStore.getState().accounts;
  const accounts = listVisibleAccountsForUser(cachedAccounts, userId);
  const { expenses, isHydrated } = useExpenseStore.getState();
  const cachedFunds = useFundsStore.getState().funds;
  const funds = listAccountTransferFunds(cachedFunds, userId, {
    individual: isIndividualHousehold(familyMemberCount),
  });

  if (!isHydrated || accounts.length === 0) {
    return { accounts, funds, balances: {}, totalLiquidity: 0 };
  }

  const balances = Object.fromEntries(
    accounts.map((account) => [account.id, calculateAccountCashBalance(expenses, account.id)])
  );
  const totalLiquidity = sumVisibleLiquidity(
    accounts.map((account) => ({ account, balance: balances[account.id] ?? 0 }))
  );

  return { accounts, funds, balances, totalLiquidity };
}

const TRANSFER_OPTIONS: Array<{
  id: TransferKind;
  label: string;
  hint: string;
  icon: typeof ArrowLeftRight;
}> = [
  {
    id: "account",
    label: "Cuenta o tarjeta",
    hint: "Mover o pagar una tarjeta",
    icon: ArrowLeftRight,
  },
  { id: "to_fund", label: "Un bolsillo", hint: "Para gastar", icon: ArrowDownToLine },
  { id: "from_fund", label: "Desde bolsillo", hint: "Recuperar", icon: ArrowUpFromLine },
  { id: "external", label: "Fuera", hint: "Sale del sistema", icon: ArrowUpFromLine },
];

function overviewToSeed(overview: AccountsOverview) {
  return {
    accounts: overview.accounts,
    funds: overview.funds,
    balances: Object.fromEntries(
      overview.balances.map((b) => [b.account.id, b.balance])
    ),
    totalLiquidity: overview.totalVisibleLiquidity,
  };
}

export default function AccountsPanel({
  currentUserId,
  familyMemberCount = 1,
  initialOverview,
}: AccountsPanelProps) {
  const { format: formatCurrency } = useCurrency();
  const setAccountsCache = useAccountsStore((s) => s.setAccounts);
  const setFundsCache = useFundsStore((s) => s.setFunds);
  const isIndividual = isIndividualHousehold(familyMemberCount);

  const accountsTourSteps = useMemo<ProductTourStep[]>(
    () => [
      {
        target: "accounts-hero",
        title: isIndividual ? "Tu liquidez" : "Liquidez familiar",
        body: isIndividual
          ? "Suma lo que tienes en tus cuentas visibles. Aquí empieza el dinero antes de repartirlo a bolsillos."
          : "Suma lo que ven en cuentas personales y compartidas. Es el dinero “en el banco” antes de ir a bolsillos.",
      },
      {
        target: "accounts-list",
        title: "Tus cuentas",
        body: "Crea una cuenta bancaria (nómina, conjunta…). Después te mostramos cómo registrar un ingreso.",
      },
    ],
    [isIndividual]
  );
  const accountsTour = useProductTour(currentUserId, "accounts", accountsTourSteps, {
    hasFamily: true,
  });

  const accountsIncomeTourSteps = useMemo<ProductTourStep[]>(
    () => [
      {
        target: "accounts-income",
        title: "Registra un ingreso",
        body: "Cuando entre dinero (nómina, transferencia…), tócalo aquí. Así la cuenta refleja lo que hay en el banco. Después te enseñamos a moverlo a un bolsillo.",
        placement: "top",
      },
    ],
    []
  );
  const accountsIncomeTour = useProductTour(
    currentUserId,
    "accountsIncome",
    accountsIncomeTourSteps,
    { hasFamily: true, autoStart: false }
  );
  const [incomeTourAccountId, setIncomeTourAccountId] = useState<string | null>(
    null
  );

  const accountsTransferTourSteps = useMemo<ProductTourStep[]>(
    () => [
      {
        target: "accounts-transfer",
        title: "Transferir a un bolsillo",
        body: "El ingreso quedó en la cuenta. Con Transferir lo mueves a un bolsillo (gastos del mes, ahorro…) o pagas una tarjeta. La cuenta es el banco; el bolsillo organiza el gasto.",
        placement: "top",
      },
    ],
    []
  );
  const accountsTransferTour = useProductTour(
    currentUserId,
    "accountsTransfer",
    accountsTransferTourSteps,
    { hasFamily: true, autoStart: false }
  );
  const [transferTourAccountId, setTransferTourAccountId] = useState<
    string | null
  >(null);

  const [seed] = useState(() =>
    initialOverview
      ? overviewToSeed(initialOverview)
      : seedFromCaches(currentUserId, familyMemberCount)
  );
  const [accounts, setAccounts] = useState<FamilyAccount[]>(seed.accounts);
  const [funds, setFunds] = useState<FamilyFund[]>(seed.funds);
  const [balances, setBalances] = useState<Record<string, number>>(seed.balances);
  const [totalLiquidity, setTotalLiquidity] = useState(seed.totalLiquidity);
  const [isLoadingOverview, setIsLoadingOverview] = useState(
    !initialOverview && seed.accounts.length === 0
  );
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!initialOverview) return;
    const next = overviewToSeed(initialOverview);
    setAccounts(next.accounts);
    setFunds(next.funds);
    setBalances(next.balances);
    setTotalLiquidity(next.totalLiquidity);
    setAccountsCache(initialOverview.accounts);
    setFundsCache(initialOverview.funds);
    setIsLoadingOverview(false);
  }, [initialOverview, setAccountsCache, setFundsCache]);

  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScope, setNewScope] = useState<AccountScope>("personal");
  const [newVisibility, setNewVisibility] = useState<AccountVisibility>("private");
  const [newKind, setNewKind] = useState<AccountKind>("checking");
  const [newInitialAmount, setNewInitialAmount] = useState("0");
  const [showCreateAmountKeypad, setShowCreateAmountKeypad] = useState(false);
  const [createError, setCreateError] = useState("");

  const [incomeAccountId, setIncomeAccountId] = useState<string | null>(null);
  const [incomeAmount, setIncomeAmount] = useState("0");
  const [showIncomeKeypad, setShowIncomeKeypad] = useState(false);

  const [adjustAccountId, setAdjustAccountId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("0");
  const [showAdjustKeypad, setShowAdjustKeypad] = useState(false);

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
  const [accountsTab, setAccountsTab] = useState<AccountsTab>("checking");
  const [menuAccountId, setMenuAccountId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(
    null
  );
  const [editAccount, setEditAccount] = useState<FamilyAccount | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");

  function openAccountMenu(accountId: string, anchorEl: HTMLElement) {
    if (menuAccountId === accountId) {
      closeAccountMenu();
      return;
    }
    const rect = anchorEl.getBoundingClientRect();
    const gap = 4;
    const right = Math.max(8, window.innerWidth - rect.right);
    // Prefer below the button; flip up if near the bottom of the viewport.
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = 160;
    const top =
      spaceBelow < estimatedHeight + gap
        ? Math.max(8, rect.top - estimatedHeight - gap)
        : rect.bottom + gap;
    setMenuAnchor({ top, right });
    setMenuAccountId(accountId);
  }

  function closeAccountMenu() {
    setMenuAccountId(null);
    setMenuAnchor(null);
  }

  const operable = useMemo(
    () => listOperableAccountsForUser(accounts, currentUserId),
    [accounts, currentUserId]
  );

  const tabAccounts = useMemo(
    () => accounts.filter((a) => accountKindOf(a) === accountsTab),
    [accounts, accountsTab]
  );
  const personalAccounts = useMemo(
    () => tabAccounts.filter((a) => a.scope === "personal"),
    [tabAccounts]
  );
  const sharedAccounts = useMemo(
    () => tabAccounts.filter((a) => a.scope === "shared"),
    [tabAccounts]
  );
  const sharedLiquidityAccounts = useMemo(
    () =>
      accounts.filter((a) => a.scope === "shared" && isLiquidityAccount(a)),
    [accounts]
  );

  const tabTotals = useMemo(() => {
    if (accountsTab === "checking") {
      return { label: "Liquidez visible", amount: totalLiquidity };
    }
    if (accountsTab === "credit") {
      const debt = tabAccounts.reduce(
        (sum, a) => sum + creditDebtFromBalance(balances[a.id] ?? 0),
        0
      );
      return {
        label: "Total por pagar",
        amount: Math.round(debt * 100) / 100,
      };
    }
    const invested = tabAccounts.reduce(
      (sum, a) => sum + Math.max(0, balances[a.id] ?? 0),
      0
    );
    return {
      label: "Valor invertido",
      amount: Math.round(invested * 100) / 100,
    };
  }, [accountsTab, balances, tabAccounts, totalLiquidity]);

  const tabEmptyCopy = useMemo(() => {
    if (accountsTab === "credit") {
      return {
        title: "Añade tu primera tarjeta",
        body: "Registra lo que debes. Luego la pagas desde una cuenta bancaria.",
        cta: "Nueva tarjeta",
      };
    }
    if (accountsTab === "investment") {
      return {
        title: "Registra una inversión",
        body: "Fondo, depósito a plazo… solo el valor de hoy, sin catálogos.",
        cta: "Nueva inversión",
      };
    }
    return {
      title: "Crea tu primera cuenta",
      body: isIndividual
        ? "Por ejemplo nómina o efectivo — luego repartes a bolsillos."
        : "Personal para la nómina, o compartida con tu pareja.",
      cta: "Nueva cuenta",
    };
  }, [accountsTab, isIndividual]);

  const transferAccount = useMemo(
    () => accounts.find((a) => a.id === transferAccountId) ?? null,
    [accounts, transferAccountId]
  );

  const counterpartOptions = useMemo(() => {
    if (!transferAccountId || !transferAccount) {
      return [] as Array<{ id: string; name: string }>;
    }

    if (transferKind === "account") {
      return accounts
        .filter((a) => {
          if (a.id === transferAccountId) return false;
          if (!(a.scope === "shared" || a.owner_profile_id === currentUserId)) return false;
          // Paying a card / funding investment from liquidity
          if (isCreditAccount(transferAccount) || isInvestmentAccount(transferAccount)) {
            return isLiquidityAccount(a);
          }
          // From checking: allow any operable counterpart (pay card, invest, move cash)
          return true;
        })
        .map((a) => ({
          id: a.id,
          name: isCreditAccount(a)
            ? `Pagar · ${a.name}`
            : isInvestmentAccount(a)
              ? `Inversión · ${a.name}`
              : a.name,
        }));
    }
    if (transferKind === "to_fund" || transferKind === "from_fund") {
      if (isCreditAccount(transferAccount) || isInvestmentAccount(transferAccount)) {
        return [];
      }
      return funds.map((f) => ({
        id: f.id,
        name: personalFundDisplayName(f),
      }));
    }
    return [];
  }, [
    accounts,
    currentUserId,
    funds,
    transferAccount,
    transferAccountId,
    transferKind,
  ]);

  const availableTransferOptions = useMemo(() => {
    if (!transferAccount) return TRANSFER_OPTIONS;
    // Pago de tarjeta: solo desde checking → credit (no menú desde la TC).
    if (isCreditAccount(transferAccount)) return [];
    if (isInvestmentAccount(transferAccount)) {
      return TRANSFER_OPTIONS.filter((o) => o.id === "account").map((o) => ({
        ...o,
        label: "Cuenta bancaria",
        hint: "Aportar o retirar",
      }));
    }
    return TRANSFER_OPTIONS;
  }, [transferAccount]);

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

  /** Local overview + background expense sync — skip router.refresh (home uses Zustand). */
  async function afterMutation() {
    await refresh();
    void import("@/lib/realtimeFamily").then(({ syncFamilyExpenses }) => {
      void syncFamilyExpenses();
    });
  }

  useEffect(() => {
    // Page already loaded overview via RSC — skip duplicate server-action on mount.
    if (initialOverview) {
      setIsLoadingOverview(false);
      return;
    }
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
  }, [initialOverview, setAccountsCache, setFundsCache]);

  function showBalanceWarning(flag?: boolean) {
    if (flag) {
      setWarning(
        "Esta cuenta queda en negativo. Puedes seguir; solo tenlo presente al repartir."
      );
    } else {
      setWarning("");
    }
  }

  function openCreateSheet(preferredKind?: AccountKind) {
    setCreateError("");
    setNewName("");
    setNewScope("personal");
    setNewVisibility("private");
    setNewKind(preferredKind ?? accountsTab);
    setNewInitialAmount("0");
    setShowCreateSheet(true);
  }

  function accountSubtitle(account: FamilyAccount) {
    const kind = accountKindOf(account);
    const kindLabel =
      kind === "credit" ? "Tarjeta" : kind === "investment" ? "Inversión" : null;
    const scopeLabel = isIndividual
      ? "Personal"
      : account.scope === "shared"
        ? "Compartida"
        : account.visibility === "private"
          ? "Personal · solo tú"
          : "Personal · visible para la pareja";
    return kindLabel ? `${kindLabel} · ${scopeLabel}` : scopeLabel;
  }

  function closeCreateSheet() {
    setShowCreateSheet(false);
    setCreateError("");
    setShowCreateAmountKeypad(false);
  }

  function handleCreate() {
    const name = newName.trim();
    if (!name) {
      setCreateError("Escribe un nombre para la cuenta.");
      return;
    }
    const initialAmount = Number(newInitialAmount.replace(/,/g, ".").trim());
    if (
      (newKind === "credit" || newKind === "investment") &&
      (!Number.isFinite(initialAmount) || initialAmount < 0)
    ) {
      setCreateError(
        newKind === "credit"
          ? "Ingresa lo que debes (0 si no debes nada)."
          : "Ingresa el valor actual (0 si aún no hay)."
      );
      return;
    }
    setCreateError("");
    startTransition(async () => {
      try {
        const created = await createAccountAction({
          name,
          scope: isIndividual ? "personal" : newScope,
          visibility: isIndividual
            ? "private"
            : newScope === "personal"
              ? newVisibility
              : "family_visible",
          kind: newKind,
          initialAmount:
            newKind === "credit" || newKind === "investment" ? initialAmount : undefined,
        });
        setAccountsTab(newKind);
        setNewName("");
        closeCreateSheet();
        await afterMutation();
        if (newKind === "checking" && created?.id) {
          setIncomeTourAccountId(created.id);
          accountsIncomeTour.start(700);
        }
      } catch (err) {
        setCreateError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
      }
    });
  }

  function openAdjust(account: FamilyAccount) {
    const raw = balances[account.id] ?? 0;
    const shown = isCreditAccount(account)
      ? creditDebtFromBalance(raw)
      : Math.max(0, raw);
    setAdjustAccountId(account.id);
    setAdjustAmount(String(shown));
    setShowAdjustKeypad(true);
  }

  function confirmAdjust(nextValue?: string) {
    const amount = Number((nextValue ?? adjustAmount).replace(/,/g, ".").trim());
    const account = accounts.find((a) => a.id === adjustAccountId);
    if (!adjustAccountId || !account || !Number.isFinite(amount) || amount < 0) {
      setError("Ingresa un importe válido.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        if (isCreditAccount(account)) {
          await setCreditDebtAction({ accountId: adjustAccountId, debt: amount });
        } else if (isInvestmentAccount(account)) {
          await setInvestmentValueAction({ accountId: adjustAccountId, value: amount });
        }
        setShowAdjustKeypad(false);
        setAdjustAccountId(null);
        await afterMutation();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo actualizar.");
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
    const accountIdForTour = incomeAccountId;
    setError("");
    startTransition(async () => {
      try {
        await registerAccountIncomeAction({ accountId: incomeAccountId, amount });
        setShowIncomeKeypad(false);
        setIncomeAccountId(null);
        setWarning("");
        await afterMutation();
        setTransferTourAccountId(accountIdForTour);
        accountsTransferTour.start(700);
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
          const source = accounts.find((a) => a.id === transferAccountId);
          // From a credit card, "Pagar" means bank → card (reduce debt).
          const payCredit =
            source && isCreditAccount(source) && counterpartId;
          result = await transferBetweenAccountsAction({
            fromAccountId: payCredit ? counterpartId : transferAccountId,
            toAccountId: payCredit ? transferAccountId : counterpartId,
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
        await afterMutation();
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
        await afterMutation();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cambiar la visibilidad.");
      }
    });
  }

  function openEditAccount(account: FamilyAccount) {
    setEditAccount(account);
    setEditName(account.name);
    setEditError("");
  }

  function handleSaveEdit() {
    if (!editAccount) return;
    const name = editName.trim();
    if (!name) {
      setEditError("El nombre es obligatorio.");
      return;
    }
    startTransition(async () => {
      try {
        await updateAccountAction({ accountId: editAccount.id, name });
        setEditAccount(null);
        await afterMutation();
      } catch (err) {
        setEditError(err instanceof Error ? err.message : "No se pudo guardar.");
      }
    });
  }

  function handleArchive(account: FamilyAccount) {
    const balance = balances[account.id] ?? 0;
    const needsConfirm = Math.abs(balance) > 0.009;
    const amountLabel = formatCurrency(Math.abs(balance));
    if (
      needsConfirm &&
      !window.confirm(
        `«${account.name}» tiene saldo ${amountLabel}. ¿Archivarla igual? Dejará de contar como liquidez activa.`
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
        await afterMutation();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo archivar.");
      }
    });
  }

  function renderAccountGroup(
    title: string,
    rows: FamilyAccount[],
    tourAnchor?: boolean
  ) {
    if (rows.length === 0) return null;

    return (
      <div className="mb-5" data-tour={tourAnchor ? "accounts-list" : undefined}>
        <h2 className="mb-1.5 px-1 text-[10px] font-light uppercase tracking-[0.18em] text-on-surface-variant/80">
          {title}
        </h2>
        <div className="overflow-hidden rounded-[1.25rem] border-[0.5px] border-outline-variant/20 bg-glass-soft/80 shadow-[0_6px_18px_rgba(43,52,55,0.06)] backdrop-blur-xl">
          {rows.map((account, index) => {
            const balance = balances[account.id] ?? 0;
            const shownAmount = displayAccountAmount(account, balance);
            const credit = isCreditAccount(account);
            const investment = isInvestmentAccount(account);
            const operableForUser = canOperateAccount(account, currentUserId);
            const color = resolveAccountColor(account);
            const isOwnerPersonal =
              account.scope === "personal" && account.owner_profile_id === currentUserId;
            const menuOpen = menuAccountId === account.id;
            const Icon = credit
              ? CreditCard
              : investment
                ? TrendingUp
                : isDefaultCashAccountName(account.name)
                  ? Banknote
                  : Landmark;

            return (
              <div
                key={account.id}
                className={`relative px-3 py-2 ${
                  index > 0 ? "border-t border-outline-variant/10" : ""
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="icon-chip-fund icon-chip-coin flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border"
                    style={fundIconChipStyle(color)}
                  >
                    <Icon size={14} strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-light tracking-tight text-on-surface">
                      {account.name}
                    </p>
                    <p className="truncate text-[9.5px] font-light leading-tight text-on-surface-variant/75">
                      {accountSubtitle(account)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {credit && balanceVisible ? (
                      <p className="text-[9px] font-light tracking-wide text-on-surface-variant/70">
                        Debes
                      </p>
                    ) : null}
                    <p
                      className={`text-[13px] font-light tabular-nums tracking-tight ${
                        credit && shownAmount > 0
                          ? "text-amber-800/75 dark:text-amber-200/85"
                          : !credit && balance < 0
                            ? "text-amber-800/75 dark:text-amber-200/85"
                            : "text-on-surface"
                      }`}
                    >
                      {balanceVisible ? <FormattedCurrency value={shownAmount} /> : "••••"}
                    </p>
                  </div>
                  {operableForUser ? (
                    <button
                      type="button"
                      onClick={(e) => openAccountMenu(account.id, e.currentTarget)}
                      className="-mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-on-surface-variant/70 transition-colors hover:bg-glass-soft hover:text-on-surface-variant"
                      aria-label={`Más opciones de ${account.name}`}
                      aria-expanded={menuOpen}
                    >
                      <MoreHorizontal size={14} strokeWidth={1.6} />
                    </button>
                  ) : null}
                </div>

                {!credit && balance < 0 && balanceVisible && (
                  <p className="mt-1 pl-[2.625rem] text-[10px] font-light text-on-surface-variant/80">
                    Saldo en negativo — puedes seguir.
                  </p>
                )}

                {operableForUser && (
                  <div className="relative mt-1.5 pl-[2.625rem]">
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c4a574]/45 to-transparent"
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-7 bg-[linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0.05)_50%,transparent_100%)] [mask-image:linear-gradient(90deg,transparent_0%,black_14%,black_86%,transparent_100%)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.025)_50%,transparent_100%)]"
                      aria-hidden
                    />
                    <div className="relative flex flex-wrap items-center gap-1 pt-2">
                      {isLiquidityAccount(account) ? (
                        <button
                          type="button"
                          data-tour={
                            incomeTourAccountId === account.id
                              ? "accounts-income"
                              : undefined
                          }
                          onClick={() => openIncome(account.id)}
                          className="relative inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-light text-on-surface-variant transition-colors hover:bg-surface-low/80 hover:text-on-surface"
                        >
                          <Plus size={10} strokeWidth={1.6} />
                          Ingreso
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openAdjust(account)}
                          className="relative inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-light text-on-surface-variant transition-colors hover:bg-surface-low/80 hover:text-on-surface"
                        >
                          {credit ? "Ajustar deuda" : "Valor actual"}
                        </button>
                      )}
                      {!credit ? (
                        <button
                          type="button"
                          data-tour={
                            transferTourAccountId === account.id
                              ? "accounts-transfer"
                              : undefined
                          }
                          onClick={() => openTransferSheet(account)}
                          className="relative inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-light text-on-surface-variant transition-colors hover:bg-surface-low/80 hover:text-on-surface"
                        >
                          <ArrowLeftRight size={10} strokeWidth={1.6} />
                          {investment ? "Mover" : "Transferir"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}

                {menuOpen && menuAnchor ? (
                  <Portal>
                    <button
                      type="button"
                      aria-label="Cerrar menú"
                      className="fixed inset-0 z-[80] cursor-default"
                      onClick={closeAccountMenu}
                    />
                    <div
                      className="fixed z-[90] w-40 overflow-hidden rounded-xl border-[0.5px] border-outline-variant/25 bg-glass-soft shadow-[0_8px_20px_rgba(43,52,55,0.12)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
                      style={{ top: menuAnchor.top, right: menuAnchor.right }}
                      role="menu"
                    >
                      {operableForUser && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            closeAccountMenu();
                            openEditAccount(account);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-light text-on-surface hover:bg-glass"
                        >
                          <Pencil size={12} strokeWidth={1.6} />
                          Editar
                        </button>
                      )}
                      {isOwnerPersonal && !isIndividual && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            closeAccountMenu();
                            handleVisibility(account);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-light text-on-surface hover:bg-glass"
                        >
                          {account.visibility === "private" ? (
                            <Eye size={12} strokeWidth={1.6} />
                          ) : (
                            <EyeOff size={12} strokeWidth={1.6} />
                          )}
                          {account.visibility === "private" ? "Hacer visible" : "Solo yo"}
                        </button>
                      )}
                      {operableForUser && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            closeAccountMenu();
                            handleArchive(account);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-light text-on-surface-variant hover:bg-glass"
                        >
                          <Archive size={12} strokeWidth={1.6} />
                          Archivar
                        </button>
                      )}
                    </div>
                  </Portal>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const selectedOption = availableTransferOptions.find((o) => o.id === transferKind);

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
          <p className="text-[11px] font-light text-on-surface-variant">
            {isIndividual ? "Tu espacio" : "Espacio familiar"}
          </p>
          <h1 className="truncate text-[15px] font-medium tracking-tight text-on-surface">
            Centro de cuentas
          </h1>
        </div>
        <button
          type="button"
          onClick={() => openCreateSheet()}
          className="rounded-full border border-glass-border bg-glass-strong p-2 text-on-surface shadow-sm backdrop-blur-sm transition-colors hover:bg-glass"
          aria-label={tabEmptyCopy.cta}
          title={tabEmptyCopy.cta}
        >
          <Plus size={18} />
        </button>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 min-h-0 flex-col overflow-hidden px-4 pt-1">
        <div
          className="mb-3 grid shrink-0 grid-cols-3 gap-1 rounded-2xl border border-glass-border bg-glass-soft p-1 backdrop-blur-md"
          role="tablist"
          aria-label="Tipo de cuenta"
        >
          {ACCOUNTS_TABS.map((tab) => {
            const active = accountsTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setAccountsTab(tab.id)}
                className={`rounded-xl px-2 py-2 text-[12px] font-medium tracking-tight transition-colors ${
                  active
                    ? "bg-surface-lowest text-on-surface shadow-sm"
                    : "text-on-surface-variant"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <section className="mb-3 shrink-0" data-tour="accounts-hero">
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
                className="icon-chip-fund icon-chip-coin flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
                style={fundIconChipStyle(HERO_ACCENT)}
              >
                {accountsTab === "credit" ? (
                  <CreditCard size={20} strokeWidth={1.75} />
                ) : accountsTab === "investment" ? (
                  <TrendingUp size={20} strokeWidth={1.75} />
                ) : (
                  <Landmark size={20} strokeWidth={1.75} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-light text-on-surface-variant">
                  {tabTotals.label}
                </p>
                <p className="truncate text-base font-medium text-on-surface">
                  {tabAccounts.length === 0
                    ? accountsTab === "credit"
                      ? "Sin tarjetas aún"
                      : accountsTab === "investment"
                        ? "Sin inversiones aún"
                        : "Sin cuentas aún"
                    : `${tabAccounts.length} ${
                        accountsTab === "credit"
                          ? tabAccounts.length === 1
                            ? "tarjeta"
                            : "tarjetas"
                          : accountsTab === "investment"
                            ? tabAccounts.length === 1
                              ? "inversión"
                              : "inversiones"
                            : tabAccounts.length === 1
                              ? "cuenta"
                              : "cuentas"
                      }`}
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-4 flex items-center gap-2.5">
              <p
                className={`text-[2.65rem] font-light leading-none tracking-tight ${
                  accountsTab === "checking" && tabTotals.amount < 0
                    ? "text-amber-800/80 dark:text-amber-200/90"
                    : "text-on-surface"
                }`}
              >
                {balanceVisible ? (
                  <FormattedCurrency value={tabTotals.amount} />
                ) : (
                  "••••••"
                )}
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
                onClick={() => openCreateSheet()}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container"
              >
                <Plus size={12} />
                {tabEmptyCopy.cta}
              </button>
              {accountsTab === "checking" && sharedLiquidityAccounts[0] ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-3 py-1.5 text-xs font-medium text-on-surface">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: resolveAccountColor(sharedLiquidityAccounts[0]),
                    }}
                  />
                  {sharedLiquidityAccounts[0].name} ·{" "}
                  {balanceVisible ? (
                    <FormattedCurrency
                      value={balances[sharedLiquidityAccounts[0].id] ?? 0}
                    />
                  ) : (
                    "••••"
                  )}
                </span>
              ) : null}
              {accountsTab === "credit" ? (
                <p className="text-[11px] font-light text-on-surface-variant">
                  Paga desde una cuenta → Transferir / Pagar
                </p>
              ) : null}
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
          {isLoadingOverview && accounts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
              <LoaderCircle className="h-5 w-5 animate-spin text-on-surface-variant" />
              <p className="text-xs font-light text-on-surface-variant">Cargando…</p>
            </div>
          ) : tabAccounts.length === 0 ? (
            <button
              type="button"
              data-tour="accounts-list"
              onClick={() => openCreateSheet()}
              className="flex w-full flex-col items-center gap-2 rounded-[1.85rem] border border-dashed bg-glass-soft px-4 py-10 text-center shadow-sm backdrop-blur-md"
              style={{ borderColor: `${HERO_ACCENT}40` }}
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: `${HERO_ACCENT}1A`, color: HERO_ACCENT }}
              >
                <Plus size={18} />
              </span>
              <span className="text-sm font-medium text-on-surface">{tabEmptyCopy.title}</span>
              <span className="max-w-[240px] text-xs font-light text-on-surface-variant">
                {tabEmptyCopy.body}
              </span>
            </button>
          ) : (
            <>
              {!isIndividual &&
                renderAccountGroup(
                  "Compartidas",
                  sharedAccounts,
                  personalAccounts.length === 0
                )}
              {personalAccounts.length === 0 ? (
                !isIndividual && sharedAccounts.length > 0 ? null : (
                  <div
                    className="mb-4"
                    data-tour={
                      isIndividual || sharedAccounts.length === 0
                        ? "accounts-list"
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      onClick={() => openCreateSheet()}
                      className="w-full rounded-[1.5rem] border border-glass-border bg-glass-strong px-4 py-5 text-center text-xs font-light text-on-surface-variant shadow-sm backdrop-blur-xl transition-colors hover:bg-glass"
                    >
                      {tabEmptyCopy.body}
                    </button>
                  </div>
                )
              ) : (
                renderAccountGroup(
                  isIndividual
                    ? accountsTab === "credit"
                      ? "Tus tarjetas"
                      : accountsTab === "investment"
                        ? "Tus inversiones"
                        : "Tus cuentas"
                    : "Personales",
                  personalAccounts,
                  true
                )
              )}
            </>
          )}
        </div>
      </main>

      <Sheet
        open={showTransferSheet}
        onClose={closeTransferSheet}
        title="Transferir / Pagar"
        closeOnBackdrop
        heightClassName="h-auto max-h-[88dvh]"
      >
        <div className="flex flex-col gap-6 pb-1">
          {transferStep === "choose" ? (
            <>
              <div className="pr-6">
                <p className="text-[10px] font-light uppercase tracking-[0.2em] text-on-surface-variant/80">
                  Desde
                </p>
                <h2 className="mt-2 text-[1.5rem] font-light tracking-tight text-on-surface">
                  {transferAccount?.name ?? "Cuenta"}
                </h2>
                <p className="mt-2 max-w-[20rem] text-[13px] font-light leading-relaxed text-on-surface-variant">
                  {isInvestmentAccount(transferAccount)
                    ? "Aporta o retira con una cuenta bancaria."
                    : "Mueve a un bolsillo, otra cuenta, o paga una tarjeta."}
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-outline-variant/15">
                {availableTransferOptions.map((opt, index) => {
                  const Icon = opt.icon;
                  const disabled =
                    (opt.id === "account" && counterpartOptions.length === 0) ||
                    ((opt.id === "to_fund" || opt.id === "from_fund") && funds.length === 0);

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => selectTransferKind(opt.id)}
                      className={`flex w-full items-center gap-3.5 px-3.5 py-3.5 text-left transition-colors hover:bg-on-surface/[0.025] active:bg-on-surface/[0.04] disabled:cursor-not-allowed disabled:opacity-35 ${
                        index > 0 ? "border-t border-outline-variant/10" : ""
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-on-surface/[0.04] text-on-surface-variant">
                        <Icon size={15} strokeWidth={1.5} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-light tracking-tight text-on-surface">
                          {opt.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] font-light text-on-surface-variant/80">
                          {opt.hint}
                        </span>
                      </span>
                      <ChevronRight
                        size={14}
                        className="shrink-0 text-outline-variant/60"
                        strokeWidth={1.5}
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
                  className="inline-flex items-center gap-0.5 px-0.5 py-1 text-[12px] font-light text-on-surface-variant transition-colors hover:text-on-surface"
                >
                  <ChevronLeft size={14} strokeWidth={1.5} />
                  Atrás
                </button>
                <p className="text-[11px] font-light text-on-surface-variant/80">
                  {selectedOption?.label}
                </p>
                <span className="w-10" aria-hidden />
              </div>

              <div className="flex items-center gap-2.5 rounded-2xl border border-outline-variant/15 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-light text-on-surface-variant/70">
                    {transferKind === "from_fund" ? "Hacia" : "Desde"}
                  </p>
                  <p className="mt-0.5 truncate text-[13px] font-light tracking-tight text-on-surface">
                    {transferAccount?.name}
                  </p>
                </div>
                <span className="text-outline-variant/50">
                  {transferKind === "from_fund" ? (
                    <ArrowDownToLine size={14} strokeWidth={1.5} />
                  ) : (
                    <ArrowLeftRight size={14} strokeWidth={1.5} />
                  )}
                </span>
                <div className="min-w-0 flex-1 text-right">
                  <p className="text-[10px] font-light text-on-surface-variant/70">
                    {transferKind === "from_fund"
                      ? "Desde"
                      : transferKind === "external"
                        ? "Hacia"
                        : "Hacia"}
                  </p>
                  <p className="mt-0.5 truncate text-[13px] font-light tracking-tight text-on-surface">
                    {transferKind === "external"
                      ? "Fuera"
                      : counterpartOptions.find((o) => o.id === counterpartId)?.name ??
                        "Elige…"}
                  </p>
                </div>
              </div>

              {transferKind !== "external" && (
                <div>
                  <p className="mb-2.5 text-[11px] font-light text-on-surface-variant">
                    {transferKind === "from_fund" ? "¿Desde qué bolsillo?" : "¿Hacia dónde?"}
                  </p>
                  {counterpartOptions.length === 0 ? (
                    <p className="px-1 py-3 text-center text-[12px] font-light text-on-surface-variant">
                      {transferKind === "account"
                        ? "No hay otra cuenta disponible."
                        : "No hay bolsillos disponibles."}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {counterpartOptions.map((item) => {
                        const selected = counterpartId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setCounterpartId(item.id)}
                            className={`rounded-full px-3.5 py-1.5 text-[12px] font-light transition-colors active:scale-[0.98] ${
                              selected
                                ? "bg-on-surface/[0.08] text-on-surface"
                                : "bg-on-surface/[0.03] text-on-surface-variant hover:bg-on-surface/[0.05]"
                            }`}
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
                  <p className="mb-2 text-[11px] font-light text-on-surface-variant">
                    Motivo <span className="text-on-surface-variant/60">(opcional)</span>
                  </p>
                  <input
                    id="outflow-concept"
                    value={outflowConcept}
                    onChange={(e) => setOutflowConcept(e.target.value)}
                    placeholder="Ej. Retiro en efectivo"
                    className="w-full rounded-2xl border border-outline-variant/20 bg-transparent px-4 py-3 text-[14px] font-light outline-none placeholder:text-outline-variant/50 focus:border-outline-variant/40"
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
                className="fab-ink flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? (
                  <LoaderCircle size={17} className="animate-spin" />
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
        title={
          newKind === "credit"
            ? "Nueva tarjeta"
            : newKind === "investment"
              ? "Nueva inversión"
              : "Nueva cuenta"
        }
        closeOnBackdrop
        heightClassName="h-auto max-h-[85dvh]"
      >
        <div className="flex flex-col gap-6 pb-1">
          <div className="pr-6">
            <p className="text-[10px] font-light uppercase tracking-[0.2em] text-on-surface-variant/80">
              {ACCOUNT_KIND_LABELS[newKind]}
            </p>
            <h2 className="mt-2 text-[1.5rem] font-light tracking-tight text-on-surface">
              {newKind === "credit"
                ? "Registrar tarjeta"
                : newKind === "investment"
                  ? "Registrar inversión"
                  : "Nueva cuenta"}
            </h2>
            <p className="mt-2 max-w-[20rem] text-[13px] font-light leading-relaxed text-on-surface-variant">
              {ACCOUNT_KIND_HINTS[newKind]}
            </p>
          </div>

          {!isIndividual && (
            <div>
              <span className="mb-2.5 block text-[11px] font-light text-on-surface-variant">
                Alcance
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewScope("personal")}
                  className={`rounded-2xl px-3.5 py-3 text-left transition-colors ${
                    newScope === "personal"
                      ? "bg-on-surface/[0.07]"
                      : "bg-on-surface/[0.03] hover:bg-on-surface/[0.05]"
                  }`}
                >
                  <span className="block text-[13px] font-light text-on-surface">Personal</span>
                  <span className="mt-0.5 block text-[11px] font-light text-on-surface-variant/75">
                    Solo tú operas
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewScope("shared")}
                  className={`rounded-2xl px-3.5 py-3 text-left transition-colors ${
                    newScope === "shared"
                      ? "bg-on-surface/[0.07]"
                      : "bg-on-surface/[0.03] hover:bg-on-surface/[0.05]"
                  }`}
                >
                  <span className="block text-[13px] font-light text-on-surface">Compartida</span>
                  <span className="mt-0.5 block text-[11px] font-light text-on-surface-variant/75">
                    Ambos
                  </span>
                </button>
              </div>
            </div>
          )}

          {!isIndividual && newScope === "personal" && (
            <div>
              <span className="mb-2.5 block text-[11px] font-light text-on-surface-variant">
                Visibilidad
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setNewVisibility("private")}
                  className={`rounded-full px-3.5 py-1.5 text-[12px] font-light transition-colors ${
                    newVisibility === "private"
                      ? "bg-on-surface/[0.08] text-on-surface"
                      : "bg-on-surface/[0.03] text-on-surface-variant"
                  }`}
                >
                  Solo yo
                </button>
                <button
                  type="button"
                  onClick={() => setNewVisibility("family_visible")}
                  className={`rounded-full px-3.5 py-1.5 text-[12px] font-light transition-colors ${
                    newVisibility === "family_visible"
                      ? "bg-on-surface/[0.08] text-on-surface"
                      : "bg-on-surface/[0.03] text-on-surface-variant"
                  }`}
                >
                  Visible a la pareja
                </button>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="new-account-name"
              className="mb-2 block text-[11px] font-light text-on-surface-variant"
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
                newKind === "credit"
                  ? "Ej. Tarjeta principal"
                  : newKind === "investment"
                    ? "Ej. Fondo de inversión"
                    : !isIndividual && newScope === "shared"
                      ? "Ej. Cuenta conjunta"
                      : "Ej. Nómina"
              }
              autoFocus
              className="w-full rounded-2xl border border-outline-variant/20 bg-transparent px-4 py-3.5 text-[15px] font-light tracking-tight outline-none placeholder:text-outline-variant/45 focus:border-outline-variant/40"
            />
          </div>

          {(newKind === "credit" || newKind === "investment") && (
            <div>
              <span className="mb-2 block text-[11px] font-light text-on-surface-variant">
                {newKind === "credit" ? "¿Cuánto debes hoy?" : "Valor actual"}
              </span>
              <button
                type="button"
                onClick={() => setShowCreateAmountKeypad(true)}
                className="flex w-full items-center justify-between rounded-2xl border border-outline-variant/20 bg-transparent px-4 py-3.5 text-left transition-colors hover:border-outline-variant/35"
              >
                <span className="text-[15px] font-light tabular-nums tracking-tight text-on-surface">
                  {formatCurrency(Number(newInitialAmount.replace(",", ".") || 0))}
                </span>
                <span className="text-[11px] font-light text-on-surface-variant/70">Editar</span>
              </button>
            </div>
          )}

          {createError && (
            <div className="alert-error rounded-2xl px-3 py-2 text-xs">{createError}</div>
          )}

          <button
            type="button"
            disabled={isPending}
            onClick={handleCreate}
            className="fab-ink mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : null}
            {isPending
              ? "Guardando…"
              : newKind === "credit"
                ? "Crear tarjeta"
                : newKind === "investment"
                  ? "Registrar inversión"
                  : "Crear cuenta"}
          </button>
        </div>
      </Sheet>

      <Sheet
        open={Boolean(editAccount)}
        onClose={() => setEditAccount(null)}
        title="Editar cuenta"
        closeOnBackdrop
        heightClassName="h-auto max-h-[88dvh]"
      >
        <div className="flex flex-col gap-5 pb-1">
          <div>
            <label
              htmlFor="edit-account-name"
              className="mb-2 block text-[11px] font-light text-on-surface-variant"
            >
              Nombre
            </label>
            <input
              id="edit-account-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSaveEdit();
                }
              }}
              placeholder="Ej. Efectivo"
              autoFocus
              className="w-full rounded-2xl border border-outline-variant/20 bg-transparent px-4 py-3.5 text-[15px] font-light tracking-tight outline-none placeholder:text-outline-variant/45 focus:border-outline-variant/40"
            />
          </div>
          {editError && (
            <div className="alert-error rounded-2xl px-3 py-2 text-xs">{editError}</div>
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={handleSaveEdit}
            className="fab-ink mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <LoaderCircle size={17} className="animate-spin" /> : null}
            {isPending ? "Guardando…" : "Guardar"}
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
        title={
          transferKind === "external"
            ? "SALIDA EXTERNA"
            : isCreditAccount(transferAccount)
              ? "PAGAR TARJETA"
              : isInvestmentAccount(transferAccount)
                ? "MOVER INVERSIÓN"
                : "MOVER DINERO"
        }
        initialValue={transferAmount}
        onClose={() => setShowTransferKeypad(false)}
        onValueChange={setTransferAmount}
        onConfirm={confirmTransfer}
      />

      <NumericKeypadSheet
        isOpen={showAdjustKeypad}
        title={
          isCreditAccount(accounts.find((a) => a.id === adjustAccountId))
            ? "DEUDA ACTUAL"
            : "VALOR ACTUAL"
        }
        initialValue={adjustAmount}
        onClose={() => {
          setShowAdjustKeypad(false);
          setAdjustAccountId(null);
        }}
        onValueChange={setAdjustAmount}
        onConfirm={confirmAdjust}
      />

      <NumericKeypadSheet
        isOpen={showCreateAmountKeypad}
        title={newKind === "credit" ? "DEUDA INICIAL" : "VALOR INICIAL"}
        initialValue={newInitialAmount}
        onClose={() => setShowCreateAmountKeypad(false)}
        onValueChange={setNewInitialAmount}
        onConfirm={(value) => {
          setNewInitialAmount(value ?? newInitialAmount);
          setShowCreateAmountKeypad(false);
        }}
      />

      <ProductTour
        open={accountsTour.open}
        steps={accountsTour.steps}
        onClose={accountsTour.close}
      />
      <ProductTour
        open={accountsIncomeTour.open}
        steps={accountsIncomeTour.steps}
        onClose={(reason) => {
          accountsIncomeTour.close(reason);
          setIncomeTourAccountId(null);
        }}
      />
      <ProductTour
        open={accountsTransferTour.open}
        steps={accountsTransferTour.steps}
        onClose={(reason) => {
          accountsTransferTour.close(reason);
          setTransferTourAccountId(null);
        }}
      />
    </div>
  );
}
