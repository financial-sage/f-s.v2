"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, LoaderCircle, Plus, Wallet } from "lucide-react";
import {
  archiveFundAction,
  createFundAction,
  depositToFundAction,
  getFundsOverviewAction,
  transferBetweenFundsAction,
} from "@/app/actions/funds";
import type { FamilyFund } from "@/lib/funds";
import { NumericKeypadSheet } from "@/components/NumericKeypadSheet";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

interface FundsPanelProps {
  currentUserId: string;
}

export default function FundsPanel({ currentUserId }: FundsPanelProps) {
  const router = useRouter();
  const [funds, setFunds] = useState<FamilyFund[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();

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
        (f) => !f.archived_at && (f.scope === "shared" || f.owner_profile_id === currentUserId)
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
          setError(err instanceof Error ? err.message : "No se pudieron cargar los fondos.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleCreateFund() {
    const name = newName.trim();
    if (!name) {
      setError("Escribe un nombre para el fondo.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await createFundAction({ name, scope: "shared" });
        setNewName("");
        await refresh();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo crear el fondo.");
      }
    });
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
    <section className="mb-4 shrink-0 rounded-3xl border border-outline-variant/30 bg-surface-lowest p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-on-surface">Bolsillos</h2>
          <p className="text-xs text-on-surface-variant">Fondos compartidos y personales</p>
        </div>
        <button
          type="button"
          onClick={() => setShowTransfer((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full border border-outline-variant/40 bg-surface px-3 py-1.5 text-xs font-semibold text-on-surface"
        >
          <ArrowLeftRight size={14} />
          Transferir
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-2xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      )}

      <div className="space-y-2">
        {visibleFunds.map((fund) => {
          const balance = balances[fund.id] ?? 0;
          return (
            <div
              key={fund.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-on-surface">{fund.name}</p>
                <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">
                  {fund.scope === "shared" ? "Compartido" : "Personal"}
                  {fund.is_system ? " · sistema" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className={`text-sm font-bold ${balance < 0 ? "text-red-600" : "text-on-surface"}`}>
                  {formatCurrency(balance)}
                </p>
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
                    onClick={() => handleArchive(fund.id)}
                    className="text-[10px] font-semibold text-on-surface-variant underline"
                  >
                    Archivar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <Wallet
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nuevo fondo compartido"
            className="w-full rounded-2xl border border-outline-variant/40 bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={handleCreateFund}
          className="inline-flex items-center gap-1 rounded-2xl bg-primary px-3 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
        >
          {isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Plus size={14} />}
          Crear
        </button>
      </div>

      {showTransfer && (
        <div className="mt-3 space-y-2 rounded-2xl border border-outline-variant/30 bg-surface p-3">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
            Desde
          </label>
          <select
            value={fromFundId}
            onChange={(e) => setFromFundId(e.target.value)}
            className="w-full rounded-xl border border-outline-variant/40 bg-surface-lowest px-3 py-2 text-sm"
          >
            {visibleFunds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
            Hacia
          </label>
          <select
            value={toFundId}
            onChange={(e) => setToFundId(e.target.value)}
            className="w-full rounded-xl border border-outline-variant/40 bg-surface-lowest px-3 py-2 text-sm"
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
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-on-primary"
          >
            Elegir importe
          </button>
        </div>
      )}

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
