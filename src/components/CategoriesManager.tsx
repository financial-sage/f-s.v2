"use client";

import { useMemo, useState } from "react";
import { PencilLine, ToggleLeft, ToggleRight } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export default function CategoriesManager({ familyId }: { familyId: string }) {
  const { categories, renameCategory, setCategoryActive, getDisplayForCategory } = useCategories(familyId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");

  const sorted = useMemo(() => [...categories].sort((a, b) => a.order - b.order), [categories]);
  const activeCount = sorted.filter((c) => c.isActive).length;

  return (
    <div className="min-h-dvh bg-surface">
      <PageHeader
        title="Categorías"
        subtitle={`${activeCount} activas • personaliza tus gastos`}
        backHref="/"
      />

      <main className="mx-auto w-full max-w-xl px-4 pt-4 pb-28">
        <Card className="p-4">
          <p className="text-sm font-semibold text-on-surface">¿Para qué sirven?</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Te ayudan a ordenar tus gastos y definir tu presupuesto mensual por categoría.
          </p>
        </Card>

        <div className="mt-4 overflow-hidden rounded-3xl bg-surface-lowest shadow-sm">
          <div className="px-4 pt-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
              Lista
            </p>
          </div>

          <div className="divide-y divide-outline-variant/20">
            {sorted.map((c) => {
              const display = getDisplayForCategory(c.id);
              const Icon = display.icon;
              const isEditing = editingId === c.id;

              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`rounded-full p-2 ${c.isActive ? "bg-surface-low text-primary" : "bg-surface-low text-outline-variant"}`}>
                    <Icon size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <input
                        value={draftLabel}
                        onChange={(e) => setDraftLabel(e.target.value)}
                        autoFocus
                        className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm font-semibold text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const next = draftLabel.trim();
                            renameCategory(c.id, next || display.label);
                            setEditingId(null);
                          }
                          if (e.key === "Escape") {
                            setEditingId(null);
                          }
                        }}
                      />
                    ) : (
                      <>
                        <p className={`truncate text-sm font-semibold ${c.isActive ? "text-on-surface" : "text-outline-variant"}`}>
                          {display.label}
                        </p>
                        <p className="text-[11px] text-on-surface-variant">
                          {c.isActive ? "Activa" : "Archivada"}
                        </p>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (isEditing) {
                        const next = draftLabel.trim();
                        renameCategory(c.id, next || display.label);
                        setEditingId(null);
                        return;
                      }
                      setDraftLabel(display.label);
                      setEditingId(c.id);
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-low text-on-surface-variant shadow-sm transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                    aria-label={isEditing ? "Guardar nombre" : "Editar nombre"}
                    title={isEditing ? "Guardar" : "Editar"}
                  >
                    <PencilLine size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategoryActive(c.id, !c.isActive)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-low text-on-surface-variant shadow-sm transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                    aria-label={c.isActive ? "Archivar categoría" : "Activar categoría"}
                    title={c.isActive ? "Archivar" : "Activar"}
                  >
                    {c.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

