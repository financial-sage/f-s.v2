"use client";

import { AlertTriangle, Trash2, type LucideIcon } from "lucide-react";
import { Portal } from "@/components/ui/Portal";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Visual tone for the icon / confirm button. */
  tone?: "danger" | "warning" | "neutral";
  icon?: LucideIcon;
  busy?: boolean;
  busyLabel?: string;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

const TONE = {
  danger: {
    iconWrap: "modal-danger-icon",
    confirm:
      "bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-70",
  },
  warning: {
    iconWrap:
      "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-800/80 dark:text-amber-200/85",
    confirm:
      "bg-on-surface text-on-primary hover:opacity-90 disabled:opacity-70",
  },
  neutral: {
    iconWrap:
      "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent",
    confirm:
      "fab-ink text-on-primary disabled:opacity-70",
  },
} as const;

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "danger",
  icon,
  busy = false,
  busyLabel = "Espera…",
  error = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const Icon = icon ?? (tone === "danger" ? Trash2 : AlertTriangle);
  const styles = TONE[tone];

  return (
    <Portal>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <button
          type="button"
          className="absolute inset-0 bg-on-surface/60 backdrop-blur-sm"
          aria-label={cancelLabel}
          onClick={() => {
            if (!busy) onCancel();
          }}
        />
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-desc"
          className="glass-modal relative z-[1] w-full max-w-xs rounded-3xl p-6 text-center animate-in fade-in zoom-in-95 duration-200"
        >
          <div
            className={
              tone === "danger"
                ? "modal-danger-icon mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                : styles.iconWrap
            }
          >
            <Icon size={24} strokeWidth={1.75} />
          </div>
          <h3
            id="confirm-dialog-title"
            className="mb-1 text-base font-bold text-on-surface"
          >
            {title}
          </h3>
          <p
            id="confirm-dialog-desc"
            className="mb-6 text-sm font-light leading-relaxed text-on-surface-variant"
          >
            {description}
          </p>
          {error ? (
            <p className="-mt-3 mb-4 text-[12px] font-light text-on-surface-variant">
              {error}
            </p>
          ) : null}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="flex-1 rounded-xl bg-surface-low py-3 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className={`flex-1 rounded-xl py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${styles.confirm}`}
            >
              {busy ? busyLabel : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
