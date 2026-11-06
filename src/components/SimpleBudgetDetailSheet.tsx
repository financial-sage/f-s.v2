"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { FormattedCurrency } from "@/components/FormattedCurrency";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/components/ui/cn";
import type { FamilyAccount } from "@/lib/accounts";
import {
  groupEffectiveAmount,
  type BudgetGroup,
} from "@/lib/budgetEnvelopes";

type SimpleBudgetDetailSheetProps = {
  open: boolean;
  group: BudgetGroup | null;
  accounts: FamilyAccount[];
  onClose: () => void;
  onChangeName: (groupId: string, name: string) => void;
  onCommitName: () => void;
  onChangeAccount: (groupId: string, accountId: string) => void;
  onChangeDueDay: (groupId: string, raw: string) => void;
  onEditAmount: (groupId: string) => void;
  onDelete: (groupId: string) => void;
};

export default function SimpleBudgetDetailSheet({
  open,
  group,
  accounts,
  onClose,
  onChangeName,
  onCommitName,
  onChangeAccount,
  onChangeDueDay,
  onEditAmount,
  onDelete,
}: SimpleBudgetDetailSheetProps) {
  const [nameDraft, setNameDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open || !group) return;
    setNameDraft(group.name);
    setConfirmDelete(false);
  }, [open, group?.id, group?.name]);

  if (!group) return null;

  const hasSegments = group.segments.length > 0;
  const effective = groupEffectiveAmount(group);
  const accountId = group.defaultAccountId || accounts[0]?.id || "";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Presupuesto"
      subtitle="Editar detalle"
      headerLayout="title-row"
      closeOnBackdrop
      heightClassName="h-auto max-h-[85dvh]"
    >
      <div className="flex flex-col gap-4 pb-2">
        <label className="block">
          <span className="text-[11px] font-light text-on-surface-variant">
            Nombre
          </span>
          <input
            type="text"
            value={nameDraft}
            onChange={(e) => {
              setNameDraft(e.target.value);
              onChangeName(group.id, e.target.value);
            }}
            onBlur={onCommitName}
            placeholder="Nombre del presupuesto"
            className="mt-1 w-full border-0 border-b border-outline-variant/20 bg-transparent pb-2 pt-1 text-[1.15rem] font-light tracking-tight text-on-surface outline-none placeholder:text-outline-variant/55 focus:border-primary/35"
          />
        </label>

        <div>
          <p className="text-[11px] font-light text-on-surface-variant">
            Importe
          </p>
          {hasSegments ? (
            <p className="mt-1.5 text-[1.45rem] font-light tabular-nums tracking-tight text-on-surface">
              <FormattedCurrency value={effective} />
              <span className="ml-1.5 text-[11px] font-light text-on-surface-variant">
                suma de categorías
              </span>
            </p>
          ) : (
            <button
              type="button"
              onClick={() => onEditAmount(group.id)}
              className="mt-1.5 w-full rounded-xl text-left transition-opacity hover:opacity-80 active:opacity-70"
            >
              <p className="text-[1.45rem] font-light tabular-nums tracking-tight text-on-surface">
                {effective > 0 ? (
                  <FormattedCurrency value={effective} />
                ) : (
                  <span className="text-outline-variant/70">0,00</span>
                )}
              </p>
              <p className="mt-0.5 text-[11px] font-light text-on-surface-variant">
                Pulsa para editar
              </p>
            </button>
          )}
        </div>

        {accounts.length > 0 ? (
          <div>
            <p className="mb-1.5 text-[11px] font-light text-on-surface-variant">
              Cuenta origen
            </p>
            <ul className="-mx-1 max-h-40 overflow-y-auto">
              {accounts.map((account) => {
                const selected = accountId === account.id;
                return (
                  <li
                    key={account.id}
                    className="border-b border-outline-variant/10 last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => onChangeAccount(group.id, account.id)}
                      className="flex w-full items-center gap-2.5 px-1 py-2.5 text-left transition-colors hover:bg-on-surface/[0.02]"
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                          selected
                            ? "border-primary/60 bg-primary"
                            : "border-outline-variant/35",
                        )}
                        aria-hidden
                      />
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-[13px] tracking-tight",
                          selected
                            ? "font-medium text-on-surface"
                            : "font-light text-on-surface/80",
                        )}
                      >
                        {account.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {!hasSegments ? (
          <label className="block">
            <span className="text-[11px] font-light text-on-surface-variant">
              Día
            </span>
            <div className="mt-1 flex items-baseline gap-2 border-b border-outline-variant/20 pb-2">
              <span className="text-[13px] font-light text-on-surface-variant">
                día
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                placeholder="—"
                value={group.dueDay ?? ""}
                onChange={(e) => onChangeDueDay(group.id, e.target.value)}
                aria-label={`Día de ${group.name || "presupuesto"}`}
                className="w-12 bg-transparent text-[1.15rem] font-light tabular-nums text-on-surface outline-none placeholder:text-outline-variant/45"
              />
            </div>
            <p className="mt-1.5 text-[11px] font-light text-on-surface-variant">
              Día del mes en que vence este presupuesto
            </p>
          </label>
        ) : (
          <p className="text-[11px] font-light text-on-surface-variant">
            El día se define en cada categoría
          </p>
        )}

        {confirmDelete ? (
          <div className="rounded-xl border border-outline-variant/20 bg-on-surface/[0.02] px-3.5 py-3">
            <p className="text-[12px] font-medium text-on-surface">
              ¿Eliminar este presupuesto?
            </p>
            <p className="mt-0.5 text-[11px] font-light text-on-surface-variant">
              No se puede deshacer
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button
                type="button"
                onClick={() => {
                  onDelete(group.id);
                  onClose();
                }}
                className="fab-ink h-9 flex-1 rounded-xl text-[12px] font-semibold shadow-none"
              >
                Sí, eliminar
              </Button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="h-9 shrink-0 rounded-xl px-3 text-[12px] font-light text-on-surface-variant"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 self-start text-[12px] font-light text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <Trash2 size={12} strokeWidth={1.6} aria-hidden />
            Eliminar presupuesto
          </button>
        )}

        <Button
          type="button"
          onClick={onClose}
          className="fab-ink mt-1 flex h-11 w-full rounded-2xl text-sm font-semibold shadow-none"
        >
          Listo
        </Button>
      </div>
    </Sheet>
  );
}
