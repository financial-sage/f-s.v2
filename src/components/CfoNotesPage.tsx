"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Trash2, WandSparkles } from "lucide-react";
import RecommendationActions from "@/components/RecommendationActions";
import CfoNoteModal, { type CfoNotePayload } from "@/components/CfoNoteModal";
import { RECOMMENDATIONS_CHANGED_EVENT } from "@/components/CfoPresencePill";
import { deleteRecommendationAction } from "@/app/actions/recommendations";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  KIND_LABEL,
  type RecommendationKind,
  type RecommendationRecord,
} from "@/lib/recommendations/types";

const PRIORITY_LABEL: Record<string, string> = {
  critical: "Prioritaria",
  important: "Importante",
  opportunity: "Oportunidad",
  educational: "Para saber",
};

type Tab = "activas" | "anteriores";

type Props = {
  active: RecommendationRecord[];
  archive: RecommendationRecord[];
};

function notifyRecommendationsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(RECOMMENDATIONS_CHANGED_EVENT));
}

function NoteCard({
  row,
  onOpen,
  onDelete,
  showActions,
  deleting,
}: {
  row: RecommendationRecord;
  onOpen: () => void;
  onDelete: () => void;
  showActions: boolean;
  deleting: boolean;
}) {
  const kind = (row.kind || "recommendation") as RecommendationKind;
  const aiBadge =
    row.copy_source === "openai" || row.copy_source === "gemini";
  return (
    <li className="relative rounded-[1.85rem] border border-glass-border bg-surface-lowest/90 px-5 py-5 shadow-[0_12px_28px_rgba(43,52,55,0.06)] backdrop-blur-xl">
      {aiBadge ? (
        <span
          className="absolute right-3.5 top-3.5 inline-flex items-center gap-1.5 text-accent"
          title="Generado con IA"
        >
          <WandSparkles size={13} strokeWidth={1.75} aria-hidden />
          <span className="text-[10px] font-light tracking-wide text-accent/80">
            Generado con IA
          </span>
        </span>
      ) : null}
      <div
        className={`flex flex-wrap items-center gap-2 ${
          aiBadge ? "pr-[7.5rem]" : ""
        }`}
      >
        <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-light tracking-wide text-[color-mix(in_srgb,var(--accent)_42%,#6b4423)]">
          {KIND_LABEL[kind]}
        </span>
        <span className="rounded-full bg-on-surface/[0.04] px-2.5 py-0.5 text-[10px] font-light tracking-wide text-on-surface-variant">
          {PRIORITY_LABEL[row.priority] ?? row.priority}
        </span>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="mt-3 w-full text-left"
      >
        <h2 className="text-[1.25rem] font-light leading-snug tracking-tight text-[color-mix(in_srgb,var(--accent)_35%,#5c4030)]">
          {row.title}
        </h2>
        <p className="mt-2 line-clamp-3 text-[14px] font-light leading-relaxed text-on-surface/80">
          {row.body}
        </p>
      </button>
      {showActions ? (
        <RecommendationActions
          id={row.id}
          ctaHref={row.cta_href}
          ctaLabel={row.cta_label}
          trailing={
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="rounded-full p-2 text-on-surface-variant/50 transition-colors hover:bg-on-surface/[0.05] hover:text-on-surface disabled:opacity-50"
              aria-label="Eliminar nota"
            >
              <Trash2 size={15} strokeWidth={1.75} />
            </button>
          }
        />
      ) : (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onOpen}
            className="text-[12px] font-light text-accent underline-offset-4 hover:underline"
          >
            Volver a leer
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="rounded-full p-2 text-on-surface-variant/50 transition-colors hover:bg-on-surface/[0.05] hover:text-on-surface disabled:opacity-50"
            aria-label="Eliminar nota"
          >
            <Trash2 size={15} strokeWidth={1.75} />
          </button>
        </div>
      )}
    </li>
  );
}

function toPayload(row: RecommendationRecord): CfoNotePayload {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    why: row.why,
    impact: row.impact,
    kind: (row.kind || "recommendation") as RecommendationKind,
    priority: row.priority,
    cta_href: row.cta_href,
    cta_label: row.cta_label,
    status: row.status,
  };
}

export default function CfoNotesPage({ active, archive }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial: Tab =
    searchParams.get("tab") === "anteriores" ? "anteriores" : "activas";
  const [tab, setTab] = useState<Tab>(initial);
  const [modalNote, setModalNote] = useState<CfoNotePayload | null>(null);
  const [modalReadOnly, setModalReadOnly] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const visibleActive = useMemo(
    () => active.filter((row) => !hiddenIds.has(row.id)),
    [active, hiddenIds]
  );
  const visibleArchive = useMemo(
    () => archive.filter((row) => !hiddenIds.has(row.id)),
    [archive, hiddenIds]
  );

  const rows = useMemo(
    () => (tab === "activas" ? visibleActive : visibleArchive),
    [tab, visibleActive, visibleArchive]
  );

  function confirmDelete(id: string) {
    setDeleteError(null);
    setPendingDeleteId(id);
  }

  function closeDeleteModal() {
    if (deleting) return;
    setPendingDeleteId(null);
    setDeleteError(null);
  }

  function runDelete() {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    startDelete(async () => {
      const result = await deleteRecommendationAction(id);
      if (!result.ok) {
        setDeleteError(result.error ?? "No se pudo eliminar");
        return;
      }
      setHiddenIds((prev) => new Set(prev).add(id));
      setPendingDeleteId(null);
      if (modalNote?.id === id) setModalNote(null);
      notifyRecommendationsChanged();
      router.refresh();
    });
  }

  const showingArchive = tab === "anteriores";

  return (
    <>
      {showingArchive ? (
        <div className="mb-1 flex items-center justify-between gap-3 px-0.5">
          <p className="text-[11px] font-light tracking-wide text-on-surface-variant">
            Anteriores
            {visibleArchive.length > 0 ? ` · ${visibleArchive.length}` : ""}
          </p>
          <button
            type="button"
            onClick={() => setTab("activas")}
            className="text-[11px] font-light text-on-surface-variant/80 underline-offset-4 transition-colors hover:text-on-surface hover:underline"
          >
            Volver a activas
          </button>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-[1.85rem] border border-glass-border bg-surface-lowest/90 px-5 py-8 text-center shadow-[0_12px_28px_rgba(43,52,55,0.06)]">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <Sparkles size={18} strokeWidth={1.75} />
          </div>
          <p className="text-[15px] font-light text-on-surface">
            {showingArchive
              ? "Aún no hay recomendaciones anteriores"
              : "No hay notas activas"}
          </p>
          <p className="mt-2 text-[13px] font-light leading-relaxed text-on-surface-variant">
            {showingArchive
              ? "Las que aceptes o descartes se guardan aquí para volver a leerlas."
              : "Cuando el contexto lo pida (ahorro, ritmo, logros), aparecerán aquí y en la pastilla."}
          </p>
          {!showingArchive ? (
            <Link
              href="/guidance"
              className="mt-5 inline-block text-[13px] font-light text-on-surface/75 underline-offset-4 hover:underline"
            >
              Ver orientación
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => (
            <NoteCard
              key={row.id}
              row={row}
              showActions={!showingArchive}
              deleting={deleting && pendingDeleteId === row.id}
              onDelete={() => confirmDelete(row.id)}
              onOpen={() => {
                setModalNote(toPayload(row));
                setModalReadOnly(showingArchive);
              }}
            />
          ))}
        </ul>
      )}

      {!showingArchive ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setTab("anteriores")}
            className="text-[11px] font-light tracking-wide text-on-surface-variant/70 underline-offset-4 transition-colors hover:text-on-surface-variant hover:underline"
          >
            Recomendaciones anteriores
            {visibleArchive.length > 0 ? ` (${visibleArchive.length})` : ""}
          </button>
        </div>
      ) : null}

      <CfoNoteModal
        open={Boolean(modalNote)}
        onClose={() => setModalNote(null)}
        note={modalNote}
        readOnly={modalReadOnly}
        onDelete={
          modalNote ? () => confirmDelete(modalNote.id) : undefined
        }
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title="Eliminar nota"
        description="Se quitará del todo. No se puede deshacer."
        confirmLabel="Sí, eliminar"
        busy={deleting}
        busyLabel="Eliminando…"
        error={deleteError}
        onCancel={closeDeleteModal}
        onConfirm={runDelete}
      />
    </>
  );
}
