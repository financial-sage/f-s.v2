"use client";

import { LayoutTemplate } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useSimpleMode } from "@/hooks/useSimpleMode";

export function SimpleModeToggleRow() {
  const router = useRouter();
  const { enabled, setEnabled, hydrated, isSuperAdmin } = useSimpleMode();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    if (!isSuperAdmin) return;
    const next = !enabled;
    setEnabled(next);
    startTransition(() => {
      router.refresh();
    });
  }

  if (!hydrated || !isSuperAdmin) return null;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm">
          <LayoutTemplate size={16} />
        </div>
        <div className="min-w-0">
          <span className="block text-sm font-medium text-on-surface">
            Probar nueva vista simplificada (Beta)
          </span>
          <span className="mt-0.5 block text-[11px] font-light text-on-surface-variant">
            Solo super admin · sustituye el inicio por la versión en pruebas
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={toggle}
        disabled={!hydrated || isPending}
        className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-60 ${
          enabled
            ? "border-primary/40 bg-primary"
            : "border-outline-variant/40 bg-surface-low"
        }`}
        aria-pressed={enabled}
        aria-label={
          enabled
            ? "Desactivar vista simplificada"
            : "Activar vista simplificada"
        }
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full shadow-sm transition-transform ${
            enabled
              ? "translate-x-6 bg-on-primary"
              : "translate-x-0 bg-on-surface/70"
          }`}
        />
      </button>
    </div>
  );
}
