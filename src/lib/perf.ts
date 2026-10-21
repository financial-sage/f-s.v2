/**
 * Lightweight server/client timing for performance audits.
 * Enable with PERF_LOG=1 (server) or NEXT_PUBLIC_PERF_LOG=1 (client).
 *
 * Region note (manual check): compare Vercel project region vs Supabase
 * project region for `ovpeumhwyfrfbbrspsrs`. Cross-region RTT multiplies
 * every auth.getUser / query hop.
 */

const SERVER_ENABLED =
  typeof process !== "undefined" &&
  (process.env.PERF_LOG === "1" || process.env.NEXT_PUBLIC_PERF_LOG === "1");

const CLIENT_ENABLED =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_PERF_LOG === "1";

export function perfEnabled(side: "server" | "client" = "server"): boolean {
  return side === "client" ? CLIENT_ENABLED : SERVER_ENABLED;
}

export function perfNow(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function perfLog(
  label: string,
  fields: Record<string, number | string | boolean | undefined | null>,
  side: "server" | "client" = "server"
): void {
  if (!perfEnabled(side)) return;
  const parts = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${typeof v === "number" ? Math.round(v) : v}`)
    .join(" ");
  const line = `[perf] ${label} ${parts}`.trim();
  if (side === "client" && typeof console !== "undefined") {
    console.info(line);
  } else {
    console.info(line);
  }
}

/** Time an async block and log duration under `label`. */
export async function perfTimed<T>(
  label: string,
  fn: () => Promise<T>,
  extra?: Record<string, number | string | boolean | undefined | null>,
  side: "server" | "client" = "server"
): Promise<T> {
  const start = perfNow();
  try {
    return await fn();
  } finally {
    perfLog(label, { ...extra, ms: perfNow() - start }, side);
  }
}
