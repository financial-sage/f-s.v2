"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  Archive,
  ChevronDown,
  FolderPlus,
  LoaderCircle,
  PencilLine,
  Plus,
  UserRound,
  Users,
} from "lucide-react";
import {
  archiveCategoryAction,
  createCategoryAction,
  listFamilyCategoriesAction,
  renameCategoryAction,
} from "@/app/actions/categories";
import {
  CATEGORY_COLOR_OPTIONS,
  CATEGORY_ICON_OPTIONS,
  CATEGORY_ICON_PRIMARY_COUNT,
  listParentCategories,
  listSubcategories,
  resolveCategoryIcon,
  type CategoryIconId,
  type CategoryScope,
  type FamilyCategory,
} from "@/lib/familyCategories";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { fundIconChipStyle } from "@/lib/funds";
import { isIndividualHousehold } from "@/lib/household";

export default function CategoriesManager({
  familyId,
  currentUserId,
  familyMemberCount = 1,
}: {
  familyId: string;
  currentUserId: string;
  familyMemberCount?: number;
}) {
  void familyId;
  const individual = isIndividualHousehold(familyMemberCount);
  const [rows, setRows] = useState<FamilyCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createScope, setCreateScope] = useState<CategoryScope>(
    individual ? "personal" : "shared"
  );
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState<string>(CATEGORY_COLOR_OPTIONS[0]);
  const [draftIcon, setDraftIcon] = useState<CategoryIconId>("tags");
  const [iconsExpanded, setIconsExpanded] = useState(false);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function ensureExpanded(id: string) {
    setExpandedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await listFamilyCategoriesAction();
      setRows(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las categorías.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const parents = useMemo(
    () => listParentCategories(rows, currentUserId),
    [rows, currentUserId]
  );
  const sharedParents = parents.filter((p) => p.scope === "shared");
  const personalParents = parents.filter((p) => p.scope === "personal");
  /** Solo: shared seeds from before the fix still show in one list. */
  const individualParents = individual ? parents : [];

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  function openCreate(scope: CategoryScope, parentId: string | null = null) {
    setEditingId(null);
    setCreateScope(individual ? "personal" : scope);
    setCreateParentId(parentId);
    setDraftName("");
    const parent = parentId ? rows.find((r) => r.id === parentId) : null;
    setDraftColor(parent?.color || CATEGORY_COLOR_OPTIONS[0]);
    const nextIcon =
      (parent?.icon as CategoryIconId) ||
      (scope === "personal" ? "tags" : "home");
    setDraftIcon(nextIcon);
    const primaryIds = CATEGORY_ICON_OPTIONS.slice(
      0,
      CATEGORY_ICON_PRIMARY_COUNT
    ).map((o) => o.id);
    setIconsExpanded(!primaryIds.includes(nextIcon));
    if (parentId) ensureExpanded(parentId);
    setSheetOpen(true);
  }

  function openEdit(cat: FamilyCategory) {
    setEditingId(cat.id);
    setCreateParentId(cat.parent_id);
    setCreateScope(cat.scope);
    setDraftName(cat.name);
    setDraftColor(cat.color || CATEGORY_COLOR_OPTIONS[0]);
    const nextIcon = (cat.icon as CategoryIconId) || "tags";
    setDraftIcon(nextIcon);
    const primaryIds = CATEGORY_ICON_OPTIONS.slice(
      0,
      CATEGORY_ICON_PRIMARY_COUNT
    ).map((o) => o.id);
    setIconsExpanded(!primaryIds.includes(nextIcon));
    setSheetOpen(true);
  }

  function submitSheet() {
    const name = draftName.trim();
    if (!name) {
      showToast("Escribe un nombre.");
      return;
    }
    startTransition(async () => {
      try {
        if (editingId) {
          await renameCategoryAction({
            id: editingId,
            name,
            color: draftColor,
            icon: draftIcon,
          });
          showToast("Categoría actualizada.");
        } else {
          await createCategoryAction({
            name,
            scope: createScope,
            parentId: createParentId,
            color: draftColor,
            icon: draftIcon,
          });
          showToast(createParentId ? "Subcategoría creada." : "Categoría creada.");
        }
        setSheetOpen(false);
        setEditingId(null);
        await reload();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "No se pudo guardar.");
      }
    });
  }

  function archive(id: string) {
    startTransition(async () => {
      try {
        await archiveCategoryAction(id);
        await reload();
        showToast("Categoría archivada.");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "No se pudo archivar.");
      }
    });
  }

  function renderGroup(items: FamilyCategory[]) {
    return (
      <div className="overflow-hidden rounded-[1.1rem] border-[0.5px] border-outline-variant/20 bg-glass-soft/80 shadow-[0_4px_14px_rgba(43,52,55,0.04)] backdrop-blur-xl">
        {items.length === 0 ? (
          <p className="px-3 py-3 text-[12px] font-light text-on-surface-variant">
            Aún no hay categorías aquí.
          </p>
        ) : (
          <div>
            {items.map((parent, index) => {
              const subs = listSubcategories(rows, parent.id, currentUserId);
              const Icon = resolveCategoryIcon(parent.icon);
              const open = expandedIds.has(parent.id);
              const subLabel =
                subs.length === 0
                  ? "0"
                  : String(subs.length);

              return (
                <div
                  key={parent.id}
                  className={index > 0 ? "border-t border-outline-variant/10" : ""}
                >
                  <div className="flex items-center gap-0.5 px-1.5 py-0.5">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(parent.id)}
                      aria-expanded={open}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-on-surface/[0.03]"
                    >
                      <span
                        className="icon-chip-fund icon-chip-coin flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border"
                        style={fundIconChipStyle(parent.color || "#57534E")}
                      >
                        <Icon size={13} strokeWidth={1.85} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-light tracking-tight text-on-surface">
                        {parent.name}
                        <span className="ml-1.5 text-[10px] text-on-surface-variant/75">
                          · {subLabel}
                        </span>
                      </span>
                      <ChevronDown
                        size={14}
                        strokeWidth={1.75}
                        className={`shrink-0 text-on-surface-variant/50 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          open ? "rotate-180" : "rotate-0"
                        }`}
                        aria-hidden
                      />
                    </button>

                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        aria-label="Editar"
                        onClick={() => openEdit(parent)}
                        className="rounded-full p-1.5 text-on-surface-variant/65 transition-colors hover:bg-on-surface/[0.04] hover:text-on-surface"
                      >
                        <PencilLine size={13} strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        aria-label="Archivar"
                        onClick={() => archive(parent.id)}
                        className="rounded-full p-1.5 text-on-surface-variant/65 transition-colors hover:bg-amber-500/10 hover:text-amber-800/70"
                      >
                        <Archive size={13} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>

                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      open
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div
                        className={`px-2.5 pb-2 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          open ? "translate-y-0" : "-translate-y-1"
                        }`}
                      >
                        <div className="ml-8 space-y-px border-l border-outline-variant/15 pl-2.5">
                          {subs.map((sub) => {
                            const SubIcon = resolveCategoryIcon(
                              sub.icon || parent.icon
                            );
                            return (
                              <div
                                key={sub.id}
                                className="group flex items-center gap-1.5 rounded-lg py-1 pl-0.5 pr-0.5 transition-colors hover:bg-on-surface/[0.03]"
                              >
                                <span
                                  className="icon-chip-fund icon-chip-coin flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border"
                                  style={fundIconChipStyle(
                                    parent.color || "#57534E"
                                  )}
                                >
                                  <SubIcon size={11} strokeWidth={1.85} />
                                </span>
                                <span className="min-w-0 flex-1 truncate text-[12px] font-light text-on-surface/90">
                                  {sub.name}
                                </span>
                                <div className="flex items-center opacity-60 transition-opacity group-hover:opacity-100">
                                  <button
                                    type="button"
                                    aria-label={`Editar ${sub.name}`}
                                    onClick={() => openEdit(sub)}
                                    className="rounded-full p-1 text-on-surface-variant/70 hover:text-on-surface"
                                  >
                                    <PencilLine size={12} strokeWidth={1.75} />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Archivar ${sub.name}`}
                                    onClick={() => archive(sub.id)}
                                    className="rounded-full p-1 text-on-surface-variant/70 hover:text-amber-800/70"
                                  >
                                    <Archive size={12} strokeWidth={1.75} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          <button
                            type="button"
                            onClick={() =>
                              openCreate(parent.scope, parent.id)
                            }
                            className="flex w-full items-center gap-1.5 rounded-lg py-1 pl-0.5 text-left text-[11px] font-light text-[#9a7b4f] transition-colors hover:bg-[color-mix(in_srgb,#c4a574_12%,transparent)]"
                          >
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[color-mix(in_srgb,#c4a574_14%,transparent)]">
                              <FolderPlus size={11} strokeWidth={1.75} />
                            </span>
                            Añadir subcategoría
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface">
      <PageHeader
        title="Categorías"
        subtitle={
          individual
            ? "Tus categorías · presupuesto por categoría"
            : "Compartidas y personales · presupuesto por categoría"
        }
      />

      <main className="mx-auto w-full max-w-xl px-4 pt-3 pb-[var(--fab-clearance)]">
        <p className="px-1 text-[12px] font-light leading-snug text-on-surface-variant">
          Presupuesto sobre la categoría padre; las subcategorías son opcionales.
        </p>

        {error ? (
          <div className="alert-error mt-3 rounded-2xl px-4 py-3 text-sm">{error}</div>
        ) : null}

        {loading ? (
          <div className="mt-6 flex justify-center text-on-surface-variant">
            <LoaderCircle size={20} className="animate-spin" />
          </div>
        ) : individual ? (
          <>
            <div className="mt-3.5 mb-1 flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-1.5 text-[10px] font-light uppercase tracking-[0.14em] text-on-surface-variant/80">
                <UserRound size={11} strokeWidth={1.75} />
                Tus categorías
              </div>
              <button
                type="button"
                onClick={() => openCreate("personal", null)}
                className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-light text-[#9a7b4f] transition-colors hover:bg-[color-mix(in_srgb,#c4a574_14%,transparent)]"
              >
                <Plus size={11} strokeWidth={1.75} />
                Nueva
              </button>
            </div>
            {renderGroup(individualParents)}
          </>
        ) : (
          <>
            <div className="mt-3.5 mb-1 flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-1.5 text-[10px] font-light uppercase tracking-[0.14em] text-on-surface-variant/80">
                <Users size={11} strokeWidth={1.75} />
                Familia
              </div>
              <button
                type="button"
                onClick={() => openCreate("shared", null)}
                className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-light text-[#9a7b4f] transition-colors hover:bg-[color-mix(in_srgb,#c4a574_14%,transparent)]"
              >
                <Plus size={11} strokeWidth={1.75} />
                Nueva
              </button>
            </div>
            {renderGroup(sharedParents)}

            <div className="mt-4 mb-1 flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-1.5 text-[10px] font-light uppercase tracking-[0.14em] text-on-surface-variant/80">
                <UserRound size={11} strokeWidth={1.75} />
                Solo tú
              </div>
              <button
                type="button"
                onClick={() => openCreate("personal", null)}
                className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-light text-[#9a7b4f] transition-colors hover:bg-[color-mix(in_srgb,#c4a574_14%,transparent)]"
              >
                <Plus size={11} strokeWidth={1.75} />
                Nueva
              </button>
            </div>
            {renderGroup(personalParents)}
          </>
        )}
      </main>

      <Sheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditingId(null);
          setIconsExpanded(false);
        }}
        title={
          editingId
            ? "Editar categoría"
            : createParentId
              ? "Nueva subcategoría"
              : "Nueva categoría"
        }
        subtitle={
          createParentId && !editingId
            ? "Se agrupa bajo la categoría elegida."
            : individual
              ? "Forman parte de tu presupuesto."
              : createScope === "shared"
                ? "Visible para toda la familia."
                : "Solo visible para ti."
        }
        headerLayout="title-row"
      >
        <div className="space-y-4 px-1 pb-6">
          <label className="block text-[11px] font-light text-on-surface-variant">
            Nombre
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value.slice(0, 40))}
              placeholder={createParentId ? "Ej. Supermercado" : "Ej. Casa"}
              className="mt-1.5 w-full rounded-2xl border-[0.5px] border-outline-variant/25 bg-transparent px-4 py-3.5 text-[15px] font-light text-on-surface outline-none focus:border-[#c4a574]/45"
            />
          </label>

          <div>
            <p className="mb-2 text-[11px] font-light text-on-surface-variant">
              Icono
            </p>
            <div className="grid grid-cols-6 gap-2">
              {(iconsExpanded
                ? CATEGORY_ICON_OPTIONS
                : CATEGORY_ICON_OPTIONS.slice(0, CATEGORY_ICON_PRIMARY_COUNT)
              ).map((opt) => {
                const Icon = opt.icon;
                const selected = draftIcon === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    title={opt.label}
                    onClick={() => setDraftIcon(opt.id)}
                    className={`flex h-10 w-full items-center justify-center rounded-xl border transition-colors ${
                      selected
                        ? "border-[#c4a574]/55 bg-[color-mix(in_srgb,#c4a574_18%,transparent)] text-on-surface"
                        : "border-outline-variant/20 text-on-surface-variant hover:border-[#c4a574]/35"
                    }`}
                  >
                    <Icon size={16} strokeWidth={1.75} />
                  </button>
                );
              })}
              <button
                type="button"
                title={iconsExpanded ? "Ver menos" : "Más iconos"}
                onClick={() => setIconsExpanded((v) => !v)}
                className={`flex h-10 w-full flex-col items-center justify-center gap-0.5 rounded-xl border text-[9px] font-light tracking-wide transition-colors ${
                  iconsExpanded
                    ? "border-outline-variant/25 text-on-surface-variant"
                    : "border-dashed border-[#c4a574]/40 text-[#9a7b4f] hover:border-[#c4a574]/55 hover:bg-[color-mix(in_srgb,#c4a574_10%,transparent)]"
                }`}
              >
                {iconsExpanded ? (
                  <ChevronDown
                    size={14}
                    strokeWidth={1.75}
                    className="rotate-180"
                  />
                ) : (
                  <Plus size={14} strokeWidth={1.75} />
                )}
                {iconsExpanded ? "Menos" : "Más"}
              </button>
            </div>
          </div>

          {!createParentId || editingId ? (
            <div>
              <p className="mb-2 text-[11px] font-light text-on-surface-variant">
                Color
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setDraftColor(color)}
                    className={`h-8 w-8 rounded-full ring-2 transition-shadow ${
                      draftColor === color
                        ? "ring-[#c4a574] ring-offset-2 ring-offset-surface"
                        : "ring-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={color}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            disabled={isPending}
            onClick={submitSheet}
            className="fab-gold flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {isPending ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : editingId ? null : (
              <Plus size={16} />
            )}
            {editingId ? "Guardar" : "Crear"}
          </button>
        </div>
      </Sheet>

      {toast ? (
        <div className="fixed top-6 left-1/2 z-200 -translate-x-1/2 animate-in slide-in-from-top-3 fade-in duration-300">
          <div className="rounded-2xl bg-on-surface/95 px-5 py-3 text-sm font-medium text-on-primary shadow-xl backdrop-blur-sm">
            {toast}
          </div>
        </div>
      ) : null}
    </div>
  );
}
