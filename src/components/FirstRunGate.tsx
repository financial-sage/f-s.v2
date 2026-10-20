"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ensureFirstRunForUser } from "@/lib/firstRun";
import { createClient } from "@/utils/supabase/client";

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
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) {
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
          router.replace("/onboarding?step=setup");
          return;
        }
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
  }, [pathname, router]);

  // Invisible; only used for side effects.
  if (!checked) return null;
  return null;
}
