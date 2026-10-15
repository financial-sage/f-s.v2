"use client";

import { createClient } from "@/utils/supabase/client";
import { useExpenseStore } from "@/store/useExpenseStore";

export const FAMILY_LIVE_EVENT = "expenses_changed";

/**
 * Nudge the partner's open Realtime channel. Uses Broadcast (not RLS-filtered),
 * so it still works when postgres_changes is quiet or auth on WS is late.
 * Requires both clients to already be subscribed to `family-live-${familyId}`.
 */
export async function pulseFamilyExpenses() {
  const familyId = useExpenseStore.getState().familyId;
  if (!familyId || typeof window === "undefined") return;

  try {
    const supabase = createClient();
    const channel = supabase.channel(`family-live-${familyId}`);
    await channel.send({
      type: "broadcast",
      event: FAMILY_LIVE_EVENT,
      payload: { at: Date.now() },
    });
  } catch {
    // Non-fatal: postgres_changes remains the primary path.
  }
}

/** Local refresh + partner nudge (call after any expense mutation). */
export async function syncFamilyExpenses() {
  await useExpenseStore.getState().refreshData();
  await pulseFamilyExpenses();
}
