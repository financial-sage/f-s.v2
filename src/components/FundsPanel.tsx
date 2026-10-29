"use client";

import { FormattedCurrency } from "@/components/FormattedCurrency";
import FundEditorModal from "@/components/FundEditorModal";
import { NumericKeypadSheet } from "@/components/NumericKeypadSheet";
import {
  archiveFundAction,
  depositToFundAction,
  getFundsOverviewAction,
  transferBetweenFundsAction,
} from "@/app/actions/funds";
import { useCurrency } from "@/hooks/useCurrency";
import { isIndividualHousehold } from "@/lib/household";
import type { FamilyFund } from "@/lib/funds";
import { ArrowLeftRight, Edit, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

interface FundsPanelProps {
  currentUserId: string;
  familyMemberCount?: number;
  /** Softer chrome when nested inside `/bolsillos` Administrar. */
  embedded?: boolean;
}

export default function FundsPanel({
  currentUserId,
  familyMemberCount = 2,
  embedded = false,
}: FundsPanelProps) {
  const router = useRouter();
  const isIndividual = isIndividualHousehold(familyMemberCount);
  const { format: formatCurrency } = useCurrency();
  const [funds, setFunds] = useState<FamilyFund[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<FamilyFund | null>(null);

  const [depositFundId, setDepositFundId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState("0");
  const [showDepositKeypad, setShowDepositKeypad] = useState(false);

  const [showTransfer, setShowTransfer] = useState(false);
  const [fromFundId, setFromFundId] = useState("");
  const [toFundId, setToFundId] = useState("");
  const [transferAmount, setTransferAmount] = useState("0");
  const [showTransferKeypad, setShowTransferKeypad] = useState(false);

  const visibleFunds = useMemo(
    () =>
      funds.filter(
        (f) =>
          !f.archived_at &&
          (f.scope === "shared" || f.owner_profile_id === currentUserId)
      ),
    [funds, currentUserId]
  );

  async function refresh() {
    const overview = await getFundsOverviewAction();
    setFunds(overview.funds);
    setBalances(Object.fromEntries(overview.balances.map((b) => [b.fund.id, b.balance])));
    if (!fromFundId && overview.sharedDefaultFundId) {
      setFromFundId(overview.sharedDefaultFundId);
    }
    if (!toFundId && overview.personalFundId) {
      setToFundId(overview.personalFundId);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const overview = await getFundsOverviewAction();
        if (cancelled) return;
        setFunds(overview.funds);
        setBalances(Object.fromEntries(overview.balances.map((b) => [b.fund.id, b.balance])));
        setFromFundId(overview.sharedDefaultFundId ?? "");
        setToFundId(overview.personalFundId ?? "");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar los bolsillos.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function openCreate() {
    setEditingFund(null);
    setEditorOpen(true);
  }

  function openEdit(fund: FamilyFund) {
    setEditingFund(fund);
    setEditorOpen(true);
  }

  function openDeposit(fundId: string) {
    setDepositFundId(fundId);
    setDepositAmount("0");
    setShowDepositKeypad(true);
  }

  function confirmDeposit(nextValue?: string) {
    const amount = Number((nextValue ?? depositAmount).replace(/,/g, ".").trim());
    if (!depositFundId || !Number.isFinite(amount) || amount <= 0) {
      setError("Ingresa un monto válido.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await depositToFundAction({ fundId: depositFundId, amount });
        setShowDepositKeypad(false);
        setDepositFundId(null);
        await refresh();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo aportar.");
      }
    });
  }

  function confirmTransfer(nextValue?: string) {
    const amount = Number((nextValue ?? transferAmount).replace(/,/g, ".").trim());
    if (!fromFundId || !toFundId || !Number.isFinite(amount) || amount <= 0) {
      setError("Completa origen, destino e importe.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await transferBetweenFundsAction({ fromFundId, toFundId, amount });
        setShowTransferKeypad(false);
        setShowTransfer(false);
        setTransferAmount("0");
        await refresh();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo transferir.");
      }
    });
  }

  function handleArchive(fundId: string) {
    startTransition(async () => {
      try {
        await archiveFundAction(fundId);
        await refresh();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo archivar.");
      }
    });
  }

  return (
    <section
      className={
        embedded
          ? "mb-4 shrink-0 space-y-3"
          : "mb-4 shrink-0 rounded-3xl border border-outline-variant/30 bg-surface-lowest p-4 shadow-sm"
      }
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div>
          <h2
            className={
              embedded
                ? "text-[13px] font-medium tracking-tight text-on-surface"
                : "text-sm font-bold text-on-surface"
            }
          >
            {embedded ? "Tus bolsillos" : "Bolsillos"}
          </h2>
          {!embedded ? (
            <p className="text-xs text-on-surface-variant">Bolsillos compartidos y personales</p>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1 rounded-full border border-glass-border bg-glass-soft px-3 py-1.5 text-xs font-medium text-on-surface"
          >
            <Plus size={14} />
            Crear
          </button>
          <button
            type="button"
            onClick={() => setShowTransfer((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full border border-glass-border bg-glass-soft px-3 py-1.5 text-xs font-medium text-on-surface"
          >
            <ArrowLeftRight size={14} />
            Transferir
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-error mb-3 rounded-2xl px-3 py-2 text-xs">{error}</div>
      )}

      <div className="space-y-2">
        {visibleFunds.map((fund) => {
          const balance = balances[fund.id] ?? 0;
          return (
            <div
              key={fund.id}
              className={
                embedded
                  ? "flex items-center justify-between gap-3 rounded-[1.25rem] border border-glass-border bg-surface-lowest/75 px-3.5 py-3"
                  : "flex items-center justify-between gap-3 rounded-2xl bg-surface px-3 py-2.5"
              }
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-on-surface">{fund.name}</p>
                <p className="text-[11px] font-light text-on-surface-variant">
                  {fund.scope === "shared" ? "Compartido" : "Personal"}
                  {fund.is_system ? " · sistema" : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <p
                  className={`text-[13px] font-medium tabular-nums ${
                    balance < 0
                      ? "text-balance-negative"
                      : "text-on-surface"
                  }`}
                >
                  <FormattedCurrency value={balance} />
                </p>
                <button
                  type="button"
                  onClick={() => openEdit(fund)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-glass-soft hover:text-on-surface"
                  aria-label={`Editar ${fund.name}`}
                >
                  <Edit size={14} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => openDeposit(fund.id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"
                  aria-label={`Aportar a ${fund.name}`}
                >
                  <Plus size={16} />
                </button>
                {!fund.is_system && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleArchive(fund.id)}
                    className="text-[11px] font-medium text-on-surface-variant underline-offset-2 hover:underline disabled:opacity-60"
                  >
                    Archivar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showTransfer && (
        <div className="mt-1 space-y-2 rounded-[1.25rem] border border-glass-border bg-glass-soft p-3.5">
          <label className="block text-[11px] font-light text-on-surface-variant">Desde</label>
          <select
            value={fromFundId}
            onChange={(e) => setFromFundId(e.target.value)}
            className="w-full rounded-xl border border-outline-variant/30 bg-surface-lowest px-3 py-2.5 text-sm"
          >
            {visibleFunds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <label className="block text-[11px] font-light text-on-surface-variant">Hacia</label>
          <select
            value={toFundId}
            onChange={(e) => setToFundId(e.target.value)}
            className="w-full rounded-xl border border-outline-variant/30 bg-surface-lowest px-3 py-2.5 text-sm"
          >
            {visibleFunds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setTransferAmount("0");
              setShowTransferKeypad(true);
            }}
            className="fab-ink flex h-11 w-full items-center justify-center rounded-2xl text-sm font-semibold"
          >
            Elegir importe
          </button>
        </div>
      )}

      <FundEditorModal
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditingFund(null);
        }}
        editingFund={editingFund}
        createScope={isIndividual ? "personal" : "shared"}
        defaultLabel={isIndividual ? "principal" : "default"}
        onSaved={async () => {
          await refresh();
          router.refresh();
        }}
      />

      <NumericKeypadSheet
        isOpen={showDepositKeypad}
        title="APORTAR AL BOLSILLO"
        initialValue={depositAmount}
        onClose={() => setShowDepositKeypad(false)}
        onValueChange={setDepositAmount}
        onConfirm={confirmDeposit}
      />

      <NumericKeypadSheet
        isOpen={showTransferKeypad}
        title="TRANSFERIR"
        initialValue={transferAmount}
        onClose={() => setShowTransferKeypad(false)}
        onValueChange={setTransferAmount}
        onConfirm={confirmTransfer}
      />
    </section>
  );
}
