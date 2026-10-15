"use client";

import { useEffect } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { FAMILY_LIVE_EVENT } from "@/lib/realtimeFamily";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useFundsStore } from "@/store/useFundsStore";

type ExpenseRow = Record<string, unknown>;

/**
 * Partner live sync:
 * - postgres_changes → patch Zustand (fast path)
 * - broadcast pulse → refreshData (reliable fallback across devices)
 * - JWT attached to Realtime before subscribe (RLS)
 */
export function useRealtimeSync() {
  const familyId = useExpenseStore((s) => s.familyId);
  const applyRealtimeChange = useExpenseStore((s) => s.applyRealtimeChange);
  const refreshData = useExpenseStore((s) => s.refreshData);
  const invalidateFunds = useFundsStore((s) => s.invalidate);

  useEffect(() => {
    if (!familyId) return;

    const supabase = createClient();
    let cancelled = false;
    let retryTimer: number | undefined;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const onExpenseChange = (payload: RealtimePostgresChangesPayload<ExpenseRow>) => {
      const eventType = payload.eventType;
      if (eventType !== "INSERT" && eventType !== "UPDATE" && eventType !== "DELETE") {
        return;
      }

      const hasRow =
        (eventType === "DELETE" && payload.old && "id" in payload.old) ||
        (eventType !== "DELETE" && payload.new && "id" in payload.new);

      if (!hasRow) {
        void refreshData();
        return;
      }

      applyRealtimeChange({
        eventType,
        new: (payload.new as ExpenseRow | null) ?? null,
        old: (payload.old as ExpenseRow | null) ?? null,
      });
    };

    const start = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      const token = data.session?.access_token;
      if (!token) {
        retryTimer = window.setTimeout(() => {
          if (!cancelled) void start();
        }, 700);
        return;
      }

      await supabase.realtime.setAuth(token);
      if (cancelled) return;

      // Remove stale topic from prior mounts before re-subscribing.
      const existing = supabase
        .getChannels()
        .find((ch) => ch.topic === `realtime:family-live-${familyId}` || ch.topic.endsWith(`family-live-${familyId}`));
      if (existing) {
        await supabase.removeChannel(existing);
      }

      channel = supabase
        .channel(`family-live-${familyId}`, {
          config: { broadcast: { self: false } },
        })
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "expenses",
            filter: `family_id=eq.${familyId}`,
          },
          onExpenseChange
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "family_funds",
            filter: `family_id=eq.${familyId}`,
          },
          () => {
            invalidateFunds();
            void useFundsStore.getState().load({ force: true });
          }
        )
        .on("broadcast", { event: FAMILY_LIVE_EVENT }, () => {
          void refreshData();
        })
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            retryTimer = window.setTimeout(() => {
              if (!cancelled) void start();
            }, 1200);
          }
        });
    };

    void start();

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [familyId, applyRealtimeChange, refreshData, invalidateFunds]);
}
