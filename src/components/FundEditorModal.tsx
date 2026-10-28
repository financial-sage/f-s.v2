"use client";

import { Portal } from "@/components/ui/Portal";
import {
  createFundAction,
  getFamilyFundsMetaAction,
  setDefaultFundAction,
  updateFundAction,
} from "@/app/actions/funds";
import {
  DEFAULT_PERSONAL_FUND_COLOR,
  DEFAULT_SHARED_FUND_COLOR,
  FUND_COLOR_OPTIONS,
  fundIconChipStyle,
  isFixedExpensesFund,
  personalFundDisplayName,
  resolveFundColor,
  type FamilyFund,
  type FundColor,
  type FundScope,
} from "@/lib/funds";
import { tintedGlassGradient } from "@/lib/glass";
import { Star, Wallet, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

export type FundEditorSaved = {
  mode: "create" | "update";
  fund: FamilyFund;
  funds: FamilyFund[];
};

type FundEditorModalProps = {
  open: boolean;
  onClose: () => void;
  /** null = create */
  editingFund?: FamilyFund | null;
  /** Scope used when creating (server still forces personal in individual households). */
  createScope?: FundScope;
  /** Copy for the default-pocket toggle. */
  defaultLabel?: "default" | "principal";
  onSaved?: (result: FundEditorSaved) => void;
};

export default function FundEditorModal({
  open,
  onClose,
  editingFund = null,
  createScope = "shared",
  defaultLabel = "default",
  onSaved,
}: FundEditorModalProps) {
  const [animated, setAnimated] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<FundColor>(DEFAULT_SHARED_FUND_COLOR);
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setAnimated(false);
      return;
    }
    if (editingFund) {
      setName(
        editingFund.scope === "personal"
          ? personalFundDisplayName(editingFund)
          : editingFund.name
      );
      setColor(resolveFundColor(editingFund));
      setIsDefault(
        Boolean(editingFund.is_default) && !isFixedExpensesFund(editingFund)
      );
    } else {
      setName("");
      setColor(
        createScope === "personal"
          ? DEFAULT_PERSONAL_FUND_COLOR
          : DEFAULT_SHARED_FUND_COLOR
      );
      setIsDefault(false);
    }
    setError("");
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setAnimated(true))
    );
    return () => cancelAnimationFrame(id);
  }, [open, editingFund, createScope]);

  function requestClose() {
    setAnimated(false);
    window.setTimeout(() => onClose(), 220);
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Escribe un nombre para el bolsillo.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        let fund: FamilyFund;
        let funds: FamilyFund[];
        let mode: FundEditorSaved["mode"];

        if (editingFund) {
          const onlyDefault =
            !isFixedExpensesFund(editingFund) &&
            isDefault &&
            !editingFund.is_default &&
            trimmed ===
              (editingFund.scope === "personal"
                ? personalFundDisplayName(editingFund)
                : editingFund.name) &&
            color === (editingFund.color ?? color);

          if (onlyDefault) {
            const result = await setDefaultFundAction(editingFund.id);
            funds = result.funds;
            fund = funds.find((f) => f.id === editingFund.id) ?? editingFund;
          } else {
            fund = await updateFundAction({
              fundId: editingFund.id,
              name: trimmed,
              color,
              isDefault: isFixedExpensesFund(editingFund) ? undefined : isDefault,
            });
            const overview = await getFamilyFundsMetaAction();
            funds = overview.funds;
          }
          mode = "update";
        } else {
          fund = await createFundAction({
            name: trimmed,
            scope: createScope,
            color,
            isDefault,
          });
          const overview = await getFamilyFundsMetaAction();
          funds = overview.funds;
          mode = "create";
        }

        onSaved?.({ mode, fund, funds });
        requestClose();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : editingFund
              ? "No se pudo actualizar el bolsillo."
              : "No se pudo crear el bolsillo."
        );
      }
    });
  }

  if (!open) return null;

  const isPersonalEdit = editingFund?.scope === "personal";
  const title = editingFund
    ? isPersonalEdit
      ? "Editar mi bolsillo"
      : "Editar bolsillo"
    : "Crear bolsillo";
  const subtitle = editingFund
    ? isPersonalEdit
      ? "Nombre y color de tu bolsillo personal."
      : createScope === "personal"
        ? "Organiza tu dinero en bolsillos personales."
        : "Nombre y color del bolsillo compartido."
    : createScope === "personal"
      ? "Organiza tu dinero en bolsillos personales."
      : "Nombre y color del bolsillo compartido.";

  const defaultTitle =
    defaultLabel === "principal" ? "Bolsillo principal" : "Bolsillo por defecto";
  const defaultHint =
    defaultLabel === "principal"
      ? "Se usa por defecto al registrar gastos."
      : "Solo uno. Se usará por defecto al registrar gastos.";

  const previewName =
    name.trim() ||
    (editingFund
      ? isPersonalEdit
        ? "Mi bolsillo"
        : editingFund.name
      : "Nuevo bolsillo");

  const showDefaultToggle = !(editingFund && isFixedExpensesFund(editingFund));

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
        <div
          className={`absolute inset-0 bg-on-surface/50 backdrop-blur-sm transition-opacity duration-300 ${
            animated ? "opacity-100" : "opacity-0"
          }`}
          onClick={requestClose}
        />
        <div
          className={`glass-modal relative m-4 w-full max-w-sm overflow-hidden rounded-[1.75rem] p-5 transition-all duration-300 ${
            animated ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <button
            type="button"
            onClick={requestClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-glass-border bg-surface-low text-on-surface-variant shadow-sm"
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
          <h3 className="pr-8 text-base font-semibold tracking-tight text-on-surface">
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-on-surface-variant">{subtitle}</p>

          <label className="mt-4 block text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">
            Nombre
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            placeholder="Ej. Gasolina, Restaurantes..."
            className="mt-1.5 w-full rounded-2xl border border-glass-border bg-surface-low px-3.5 py-2.5 text-sm text-on-surface outline-none placeholder:text-outline-variant focus:ring-2 focus:ring-accent/30"
          />

          <label className="mt-3.5 block text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">
            Color
          </label>
          <div className="mt-2 overflow-hidden rounded-lg border border-glass-border">
            <div className="grid grid-cols-8 gap-px bg-outline-variant/25">
              {FUND_COLOR_OPTIONS.map((option) => {
                const selected = color === option.value;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setColor(option.value)}
                    title={option.label}
                    aria-label={option.label}
                    aria-pressed={selected}
                    className="relative h-6 w-full"
                    style={{ backgroundColor: option.value }}
                  >
                    {selected ? (
                      <span
                        className="absolute inset-0 ring-2 ring-inset ring-white/95"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="relative mt-4 overflow-hidden rounded-[1.35rem] border border-glass-border px-3.5 py-3"
            style={{
              backgroundImage: tintedGlassGradient(color, {
                soft: true,
                midAlpha: "28",
                endAlpha: "42",
                midStop: 45,
              }),
              borderColor: `${color}55`,
            }}
          >
            <div
              className="pointer-events-none absolute -right-4 -top-6 h-28 w-28 rounded-full opacity-55 blur-2xl"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-8 -left-4 h-20 w-20 rounded-full opacity-30 blur-2xl"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <div className="relative flex items-center gap-3">
              <span
                className="icon-chip-fund icon-chip-coin inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-glass-border bg-surface-lowest/70 text-on-surface shadow-sm backdrop-blur-sm"
                style={fundIconChipStyle(color)}
              >
                <Wallet size={16} strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">
                  Vista previa
                </p>
                <p className="mt-0.5 truncate text-[15px] font-semibold tracking-tight text-on-surface">
                  {previewName}
                </p>
              </div>
              <span
                className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10 shadow-sm"
                style={{ backgroundColor: color }}
                aria-hidden
              />
            </div>
          </div>

          {showDefaultToggle ? (
            <button
              type="button"
              onClick={() => setIsDefault((v) => !v)}
              title={defaultHint}
              className={`mt-3 flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors ${
                isDefault
                  ? "border-accent/35 bg-accent/10"
                  : "border-glass-border bg-surface-low hover:bg-surface-container"
              }`}
              aria-pressed={isDefault}
              aria-description={defaultHint}
            >
              <Star
                size={14}
                strokeWidth={2}
                className={`shrink-0 ${
                  isDefault ? "fill-accent text-accent" : "text-on-surface-variant"
                }`}
              />
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-on-surface">
                {defaultTitle}
              </span>
              <span
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  isDefault ? "bg-accent" : "bg-outline-variant/40"
                }`}
                aria-hidden
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    isDefault ? "left-4" : "left-0.5"
                  }`}
                />
              </span>
            </button>
          ) : null}

          {error ? (
            <p className="alert-error mt-2 rounded-xl px-3 py-2 text-xs">{error}</p>
          ) : null}

          <button
            type="button"
            disabled={isPending}
            onClick={handleSave}
            className="fab-ink mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {isPending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </Portal>
  );
}
