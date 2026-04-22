"use client";

import { useRealtimeSync } from "@/hooks/useRealtimeSync";

/**
 * Invisible client component — mounts the Realtime WebSocket subscription.
 * Renders nothing; only used for its side effect.
 */
export default function RealtimeSync() {
  useRealtimeSync();
  return null;
}
