"use client";

import { Portal } from "@/components/ui/Portal";
import type { PurchaseCompareLine, PurchaseCompareResult } from "@/app/actions/purchase-receipts";
import { Pencil, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

type PurchaseCompareSheetProps = {
  open: boolean;
  compare: PurchaseCompareResult | null;
  formatMoney: (value: number) => string;
  onClose: () => void;
  title?: string;
  /** When set, lines with a persisted id can edit unit price. */
  onUpdateLinePrice?: (
    lineId: string,
    unitPrice: number
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};

function formatDelta(
  delta: number | null,
  deltaPct: number | null,
  formatMoney: (value: number) => string
) {
  if (delta == null) return null;
  const sign = delta > 0 ? "+" : "";
  const money = `${sign}${formatMoney(delta)}`;
  if (deltaPct == null) return money;
  return `${money} (${sign}${deltaPct}%)`;
}

export default function PurchaseCompareSheet({
  open,
  compare,
  formatMoney,
  onClose,
  title = "Detalle del ticket",
  onUpdateLinePrice,
}: PurchaseCompareSheetProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (!open) {
      setAnimated(false);
      return;
    }
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setAnimated(true))
    );
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!open || !compare) return null;

  const raised = compare.lines.filter((l) => l.delta != null && l.delta > 0.009);
  const lowered = compare.lines.filter(
    (l) => l.delta != null && l.delta < -0.009
  );
  const same = compare.lines.filter(
    (l) => l.delta != null && Math.abs(l.delta) < 0.009
  );
  const first = compare.lines.filter((l) => l.delta == null);

  function requestClose() {
    setAnimated(false);
    window.setTimeout(() => onClose(), 220);
  }

  const merchant = compare.merchant?.trim() || "Comercio no detectado";
  const canEdit = typeof onUpdateLinePrice === "function";

  function renderLine(line: PurchaseCompareLine, sectionKey: string, tone: "up" | "down" | "same") {
    const deltaLabel =
      tone === "up" || tone === "down"
        ? formatDelta(line.delta, line.deltaPct, formatMoney)
        : tone === "same" && line.delta != null
          ? "igual"
          : "nuevo";

    return (
      <LineRow
        key={`${sectionKey}-${line.id ?? line.nameKey}-${line.name}`}
        lineId={line.id}
        name={line.name}
        unitPrice={line.unitPrice}
        previous={line.previousUnitPrice}
        previousMerchant={line.previousMerchant}
        deltaLabel={deltaLabel}
        tone={tone}
        formatMoney={formatMoney}
        editable={canEdit && Boolean(line.id)}
        onSavePrice={onUpdateLinePrice}
      />
    );
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[110] flex items-end justify-center p-4 sm:items-center">
        <button
          type="button"
          className={`absolute inset-0 bg-on-surface/[0.22] backdrop-blur-[10px] transition-opacity duration-300 ${
            animated ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Cerrar"
          onClick={requestClose}
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="purchase-ticket-title"
          className={`relative z-[1] flex max-h-[86dvh] w-full max-w-md flex-col overflow-hidden rounded-[1.85rem] border border-glass-border bg-surface-lowest shadow-[var(--glass-shadow-lg)] transition-all duration-300 ${
            animated
              ? "translate-y-0 opacity-100"
              : "translate-y-5 opacity-0 sm:translate-y-0 sm:scale-[0.98]"
          }`}
        >
          {/* Header */}
          <div className="relative shrink-0 px-6 pb-3 pt-5">
            <button
              type="button"
              onClick={requestClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant/70 transition-colors hover:bg-on-surface/[0.04] hover:text-on-surface"
              aria-label="Cerrar"
            >
              <X size={15} strokeWidth={1.5} />
            </button>

            <p className="text-[10px] font-light uppercase tracking-[0.16em] text-on-surface-variant/75">
              Ticket
            </p>
            <h3
              id="purchase-ticket-title"
              className="mt-1 max-w-[18ch] text-[1.35rem] font-light leading-tight tracking-tight text-on-surface"
            >
              {title}
            </h3>
            <p className="mt-1.5 truncate text-[12px] font-light text-on-surface/65">
              {merchant}
              {compare.purchasedAt ? ` · ${compare.purchasedAt.slice(0, 10)}` : ""}
              {compare.total != null ? ` · ${formatMoney(compare.total)}` : ""}
            </p>
            {canEdit ? (
              <p className="mt-1 text-[11px] font-light text-on-surface-variant/70">
                Toca un importe para corregirlo
              </p>
            ) : null}

            {/* Stats — keep labels + values, delicate chips */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              <StatChip label="Subieron" value={compare.raised} tone="up" />
              <StatChip label="Bajaron" value={compare.lowered} tone="down" />
              <StatChip label="Igual" value={compare.same} tone="neutral" />
              <StatChip label="Nuevos" value={compare.firstSeen} tone="neutral" />
            </div>
          </div>

          {/* Lines */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-1">
            {raised.length > 0 ? (
              <Section title="Subieron">
                {raised.map((line) => renderLine(line, "up", "up"))}
              </Section>
            ) : null}
            {lowered.length > 0 ? (
              <Section title="Bajaron">
                {lowered.map((line) => renderLine(line, "down", "down"))}
              </Section>
            ) : null}
            {same.length > 0 ? (
              <Section title="Sin cambio">
                {same.map((line) => renderLine(line, "same", "same"))}
              </Section>
            ) : null}
            {first.length > 0 ? (
              <Section title="Primera vez">
                {first.map((line) => renderLine(line, "new", "same"))}
              </Section>
            ) : null}
            {compare.lines.length === 0 ? (
              <p className="py-10 text-center text-[13px] font-light text-on-surface-variant">
                No hay líneas de producto para comparar.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </Portal>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "up" | "down" | "neutral";
}) {
  const toneClass =
    tone === "up"
      ? "bg-amber-500/[0.08] text-amber-900/70 dark:text-amber-100/80"
      : tone === "down"
        ? "bg-emerald-500/[0.08] text-emerald-900/70 dark:text-emerald-100/80"
        : "bg-on-surface/[0.04] text-on-surface-variant";

  return (
    <span
      className={`inline-flex items-baseline gap-1 rounded-full px-2.5 py-1 text-[10px] font-light tracking-wide ${toneClass}`}
    >
      {label}
      <span className="tabular-nums tracking-normal">{value}</span>
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-5 last:mb-0">
      <p className="mb-1 text-[10px] font-light uppercase tracking-[0.14em] text-on-surface-variant/80">
        {title}
      </p>
      <ul className="divide-y divide-outline-variant/12 border-t border-outline-variant/12">
        {children}
      </ul>
    </section>
  );
}

function LineRow({
  lineId,
  name,
  unitPrice,
  previous,
  previousMerchant,
  deltaLabel,
  tone,
  formatMoney,
  editable,
  onSavePrice,
}: {
  lineId: string | null;
  name: string;
  unitPrice: number | null;
  previous: number | null;
  previousMerchant: string | null;
  deltaLabel: string | null;
  tone: "up" | "down" | "same";
  formatMoney: (value: number) => string;
  editable: boolean;
  onSavePrice?: (
    lineId: string,
    unitPrice: number
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurCommit = useRef(false);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const deltaClass =
    tone === "up"
      ? "text-amber-800/70 dark:text-amber-200/80"
      : tone === "down"
        ? "text-emerald-800/70 dark:text-emerald-200/80"
        : "text-on-surface-variant/80";

  function startEdit() {
    if (!editable || !lineId || saving) return;
    setError(null);
    setDraft(
      unitPrice != null
        ? String(unitPrice).replace(".", ",")
        : ""
    );
    setEditing(true);
  }

  async function commitEdit() {
    if (!editable || !lineId || !onSavePrice || saving) return;
    if (skipBlurCommit.current) {
      skipBlurCommit.current = false;
      return;
    }
    const parsed = Number(draft.replace(/,/g, ".").trim());
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Importe no válido");
      return;
    }
    const rounded = Math.round(parsed * 100) / 100;
    if (unitPrice != null && Math.abs(rounded - unitPrice) < 0.001) {
      setEditing(false);
      setError(null);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await onSavePrice(lineId, rounded);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    if (saving) return;
    skipBlurCommit.current = true;
    setEditing(false);
    setError(null);
  }

  return (
    <li className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-light leading-snug tracking-tight text-on-surface">
          {name}
        </p>
        <p className="mt-0.5 truncate text-[11px] font-light text-on-surface-variant/75">
          {previous != null
            ? `Antes ${formatMoney(previous)}${
                previousMerchant ? ` · ${previousMerchant}` : ""
              }`
            : "Sin histórico"}
        </p>
        {error ? (
          <p className="mt-0.5 text-[10px] font-light text-balance-negative">
            {error}
          </p>
        ) : null}
      </div>
      <div className="shrink-0 pt-px text-right">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={draft}
            disabled={saving}
            aria-label={`Precio de ${name}`}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              void commitEdit();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void commitEdit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancelEdit();
              }
            }}
            className="w-[5.5rem] rounded-lg border border-outline-variant/25 bg-surface-lowest px-2 py-1 text-right text-[13px] font-light tabular-nums tracking-tight text-on-surface outline-none focus:border-outline-variant/50 disabled:opacity-60"
          />
        ) : editable ? (
          <button
            type="button"
            onClick={startEdit}
            className="group inline-flex items-center justify-end gap-1 text-right transition-colors"
            aria-label={`Editar precio de ${name}`}
          >
            <Pencil
              size={11}
              strokeWidth={1.5}
              className="text-on-surface-variant/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            />
            <span className="text-[13px] font-light tabular-nums tracking-tight text-on-surface underline decoration-outline-variant/35 underline-offset-2">
              {unitPrice != null ? formatMoney(unitPrice) : "—"}
            </span>
          </button>
        ) : (
          <p className="text-[13px] font-light tabular-nums tracking-tight text-on-surface">
            {unitPrice != null ? formatMoney(unitPrice) : "—"}
          </p>
        )}
        {deltaLabel && !editing ? (
          <p className={`mt-0.5 text-[10px] font-light tabular-nums ${deltaClass}`}>
            {deltaLabel}
          </p>
        ) : null}
      </div>
    </li>
  );
}
