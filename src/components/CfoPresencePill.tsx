"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import CfoNoteModal, { type CfoNotePayload } from "@/components/CfoNoteModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  deleteRecommendationAction,
  markRecommendationSeenAction,
} from "@/app/actions/recommendations";
import {
  ensureFirstRunForUser,
  isTourDone,
  TOUR_DONE_EVENT,
  type TourId,
} from "@/lib/firstRun";
import { createClient } from "@/utils/supabase/client";

export const RECOMMENDATIONS_CHANGED_EVENT = "recommendations:changed";

type ActivePayload = {
  count?: number;
  locked?: boolean;
  familyId?: string | null;
  primary?: CfoNotePayload | null;
};

function todayKey(familyId: string) {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `cfo-modal-opened:${familyId}:${y}-${m}-${day}`;
}

function criticalSeenKey(familyId: string, noteId: string) {
  return `cfo-critical-seen:${familyId}:${noteId}`;
}

/**
 * Decorative CFO presence pill outside the dashboard scroll (ADR-0011).
 * Auto-opens the primary note once per day; tapping the pill goes to
 * `/recommendations` (Activas) so the user can see all notes.
 * Hidden until the dashboard product tour is done.
 */
export default function CfoPresencePill() {
  const pathname = usePathname();
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [primary, setPrimary] = useState<CfoNotePayload | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [tourReady, setTourReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [enterKey, setEnterKey] = useState(0);
  const [sparkLit, setSparkLit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();

  const refreshTourGate = useCallback((uid: string) => {
    ensureFirstRunForUser(uid, { hasFamily: true });
    setTourReady(isTourDone(uid, "dashboard"));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let resolvedUserId: string | null = null;

    async function resolveUser() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled || !user) return;
        resolvedUserId = user.id;
        refreshTourGate(user.id);
      } catch {
        // ignore
      }
    }
    void resolveUser();

    function onTourDone(ev: Event) {
      const detail = (ev as CustomEvent<{ userId?: string; tourId?: TourId }>)
        .detail;
      if (detail?.tourId !== "dashboard") return;
      const uid = detail.userId ?? resolvedUserId;
      if (uid) refreshTourGate(uid);
      else setTourReady(true);
    }

    window.addEventListener(TOUR_DONE_EVENT, onTourDone);
    return () => {
      cancelled = true;
      window.removeEventListener(TOUR_DONE_EVENT, onTourDone);
    };
  }, [refreshTourGate]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/recommendations/active", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as ActivePayload;
      if (data.locked) {
        setCount(0);
        setPrimary(null);
        return;
      }
      const next = Math.max(0, Number(data.count) || 0);
      setCount((prev) => {
        if (next > 0 && prev === 0) setEnterKey((k) => k + 1);
        return next;
      });
      setPrimary(data.primary ?? null);
      setFamilyId(data.familyId ?? null);
      return data;
    } catch {
      return null;
    }
  }, []);

  const maybeAutoOpen = useCallback(
    (data: ActivePayload | null | undefined) => {
      if (!tourReady) return;
      if (!data?.primary || !data.familyId || data.locked) return;
      if (typeof window === "undefined") return;
      if (pathname?.startsWith("/recommendations")) return;

      const note = data.primary;
      const dayKey = todayKey(data.familyId);
      const alreadyToday = window.localStorage.getItem(dayKey) === "1";
      const isCritical = note.priority === "critical";
      const criticalSeen =
        window.localStorage.getItem(
          criticalSeenKey(data.familyId, note.id)
        ) === "1";

      if (!alreadyToday || (isCritical && !criticalSeen)) {
        setModalOpen(true);
        window.localStorage.setItem(dayKey, "1");
        if (isCritical) {
          window.localStorage.setItem(
            criticalSeenKey(data.familyId, note.id),
            "1"
          );
        }
        if (note.status === "new") {
          void markRecommendationSeenAction(note.id);
        }
      }
    },
    [pathname, tourReady]
  );

  useEffect(() => {
    if (!tourReady) return;
    let cancelled = false;

    async function run() {
      if (cancelled) return;
      const data = await load();
      if (!cancelled) maybeAutoOpen(data);
    }

    void run();

    function onVisible() {
      if (document.visibilityState === "visible") void load();
    }
    function onChanged() {
      void load();
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(RECOMMENDATIONS_CHANGED_EVENT, onChanged);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(RECOMMENDATIONS_CHANGED_EVENT, onChanged);
    };
  }, [load, maybeAutoOpen, pathname, tourReady]);

  useEffect(() => {
    if (!tourReady || count <= 0) return;
    setSparkLit(false);
    const litOn = window.setTimeout(() => setSparkLit(true), 720);
    const litOff = window.setTimeout(() => setSparkLit(false), 1280);
    return () => {
      window.clearTimeout(litOn);
      window.clearTimeout(litOff);
    };
  }, [count, enterKey, tourReady]);

  const openFromPill = () => {
    if (!tourReady || count <= 0) return;
    if (familyId) {
      window.localStorage.setItem(todayKey(familyId), "1");
    }
    // List of actives — not the same daily modal again.
    router.push("/recommendations");
  };

  if (pathname?.startsWith("/recommendations")) {
    return null;
  }

  if (!tourReady) return null;

  if (count <= 0 && !modalOpen) return null;

  return (
    <>
      {count > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
          <div className="relative h-12 w-full">
            <button
              key={enterKey}
              type="button"
              onClick={openFromPill}
              className="rec-tag-in pointer-events-auto absolute bottom-1 right-0 z-[61] inline-flex min-h-9 max-w-[13rem] touch-manipulation items-center gap-1.5 rounded-l-full border border-r-0 border-accent/30 bg-surface-lowest/95 py-2 pl-3 pr-2.5 text-[10px] font-light leading-none text-on-surface shadow-[0_6px_16px_rgba(43,52,55,0.12)] backdrop-blur-xl active:scale-[0.98]"
            >
              <span
                className={`rec-bulb-glow flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-accent ${
                  sparkLit ? "is-lit" : ""
                }`}
              >
                <Sparkles
                  size={11}
                  strokeWidth={1.75}
                  fill={sparkLit ? "currentColor" : "none"}
                  aria-hidden
                />
              </span>
              <span className="truncate">
                {count === 1 ? "1 nota para ti" : `${count} notas`}
              </span>
            </button>
          </div>
        </div>
      ) : null}

      <CfoNoteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        note={primary}
        onDelete={primary ? () => setConfirmDelete(true) : undefined}
      />

      <ConfirmDialog
        open={confirmDelete && Boolean(primary)}
        title="Eliminar nota"
        description="Se quitará del todo de Activas y Anteriores. No se puede deshacer."
        confirmLabel="Sí, eliminar"
        busy={deleting}
        busyLabel="Eliminando…"
        onCancel={() => {
          if (!deleting) setConfirmDelete(false);
        }}
        onConfirm={() => {
          if (!primary) return;
          const id = primary.id;
          startDelete(async () => {
            const result = await deleteRecommendationAction(id);
            if (!result.ok) return;
            setConfirmDelete(false);
            setModalOpen(false);
            setPrimary(null);
            window.dispatchEvent(new Event(RECOMMENDATIONS_CHANGED_EVENT));
            void load();
          });
        }}
      />
    </>
  );
}
