"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useExpenseStore } from "@/store/useExpenseStore";

/**
 * Subscribes to Supabase Realtime for the `expenses` table.
 * When any INSERT / UPDATE / DELETE fires, it refreshes the Zustand cache.
 * Must be mounted inside a Client Component.
 */
export function useRealtimeSync() {
  const refreshData = useExpenseStore((s) => s.refreshData);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("expenses_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => {
          refreshData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshData]);
}
