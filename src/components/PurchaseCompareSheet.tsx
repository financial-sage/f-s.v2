"use client";

import { Portal } from "@/components/ui/Portal";
import type { PurchaseCompareResult } from "@/app/actions/purchase-receipts";
import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type PurchaseCompareSheetProps = {
  open: boolean;
  compare: PurchaseCompareResult | null;
  formatMoney: (value: number) => string;
  onClose: () => void;
  title?: string;
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
                {raised.map((line) => (
                  <LineRow
                    key={`up-${line.nameKey}-${line.name}`}
                    name={line.name}
                    unitPrice={line.unitPrice}
                    previous={line.previousUnitPrice}
                    previousMerchant={line.previousMerchant}
                    deltaLabel={formatDelta(line.delta, line.deltaPct, formatMoney)}
                    tone="up"
                    formatMoney={formatMoney}
                  />
                ))}
              </Section>
            ) : null}
            {lowered.length > 0 ? (
              <Section title="Bajaron">
                {lowered.map((line) => (
                  <LineRow
                    key={`down-${line.nameKey}-${line.name}`}
                    name={line.name}
                    unitPrice={line.unitPrice}
                    previous={line.previousUnitPrice}
                    previousMerchant={line.previousMerchant}
                    deltaLabel={formatDelta(line.delta, line.deltaPct, formatMoney)}
                    tone="down"
                    formatMoney={formatMoney}
                  />
                ))}
              </Section>
            ) : null}
            {same.length > 0 ? (
              <Section title="Sin cambio">
                {same.map((line) => (
                  <LineRow
                    key={`same-${line.nameKey}-${line.name}`}
                    name={line.name}
                    unitPrice={line.unitPrice}
                    previous={line.previousUnitPrice}
                    previousMerchant={line.previousMerchant}
                    deltaLabel="igual"
                    tone="same"
                    formatMoney={formatMoney}
                  />
                ))}
              </Section>
            ) : null}
            {first.length > 0 ? (
              <Section title="Primera vez">
                {first.map((line) => (
                  <LineRow
                    key={`new-${line.nameKey}-${line.name}`}
                    name={line.name}
                    unitPrice={line.unitPrice}
                    previous={null}
                    previousMerchant={null}
                    deltaLabel="nuevo"
                    tone="same"
                    formatMoney={formatMoney}
                  />
                ))}
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
  name,
  unitPrice,
  previous,
  previousMerchant,
  deltaLabel,
  tone,
  formatMoney,
}: {
  name: string;
  unitPrice: number | null;
  previous: number | null;
  previousMerchant: string | null;
  deltaLabel: string | null;
  tone: "up" | "down" | "same";
  formatMoney: (value: number) => string;
}) {
  const deltaClass =
    tone === "up"
      ? "text-amber-800/70 dark:text-amber-200/80"
      : tone === "down"
        ? "text-emerald-800/70 dark:text-emerald-200/80"
        : "text-on-surface-variant/80";

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
      </div>
      <div className="shrink-0 pt-px text-right">
        <p className="text-[13px] font-light tabular-nums tracking-tight text-on-surface">
          {unitPrice != null ? formatMoney(unitPrice) : "—"}
        </p>
        {deltaLabel ? (
          <p className={`mt-0.5 text-[10px] font-light tabular-nums ${deltaClass}`}>
            {deltaLabel}
          </p>
        ) : null}
      </div>
    </li>
  );
}
