"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ensureFirstRunForUser } from "@/lib/firstRun";
import { createClient } from "@/utils/supabase/client";
import { perfLog, perfNow } from "@/lib/perf";

type GateResult = { ok: true } | { redirect: string };

/** Session-scoped cache — avoid getUser+profile on every pathname change. */
let gateCache: { userId: string; result: GateResult } | null = null;

export function clearFirstRunGateCache() {
  gateCache = null;
}

/**
 * Client gate: if the user already has a family but never finished the new setup,
 * send them to /onboarding?step=setup. Legacy users (family before this feature)
 * are seeded as setupCompleted.
 */
export default function FirstRunGate() {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (
        !pathname ||
        pathname.startsWith("/onboarding") ||
        pathname.startsWith("/login") ||
        pathname.startsWith("/register") ||
        pathname.startsWith("/forgot-password")
      ) {
        if (!cancelled) setChecked(true);
        return;
      }

      try {
        const start = perfNow();
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) {
          if (!cancelled) setChecked(true);
          return;
        }

        if (gateCache?.userId === user.id) {
          perfLog("FirstRunGate.cacheHit", { ms: perfNow() - start }, "client");
          if ("redirect" in gateCache.result) {
            router.replace(gateCache.result.redirect);
            return;
          }
          if (!cancelled) setChecked(true);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("family_id")
          .eq("id", user.id)
          .maybeSingle();

        const hasFamily = Boolean(profile?.family_id);
        const state = ensureFirstRunForUser(user.id, { hasFamily });

        if (hasFamily && !state.setupCompleted) {
          const result: GateResult = { redirect: "/onboarding?step=setup" };
          gateCache = { userId: user.id, result };
          perfLog("FirstRunGate", { ms: perfNow() - start, redirect: true }, "client");
          router.replace(result.redirect);
          return;
        }

        gateCache = { userId: user.id, result: { ok: true } };
        perfLog("FirstRunGate", { ms: perfNow() - start, redirect: false }, "client");
      } catch {
        // ignore — never block the app
      } finally {
        if (!cancelled) setChecked(true);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
    // Only re-check when landing on auth/onboarding exits; cache covers tab switches.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: avoid auth on every pathname
  }, [router]);

  // Invisible; only used for side effects.
  if (!checked) return null;
  return null;
}
