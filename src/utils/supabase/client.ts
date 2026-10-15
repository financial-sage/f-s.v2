import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;
let authBound = false;

/**
 * Singleton browser client so Realtime reuses one authenticated socket.
 * Without this, each createClient() can open a WS before the session is attached
 * and RLS silently drops postgres_changes for the partner.
 */
export function createClient() {
  if (browserClient) return browserClient;

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  if (!authBound && typeof window !== "undefined") {
    authBound = true;
    const bindRealtimeAuth = (accessToken: string | undefined | null) => {
      void browserClient?.realtime.setAuth(accessToken ?? null);
    };

    void browserClient.auth.getSession().then(({ data }) => {
      bindRealtimeAuth(data.session?.access_token);
    });

    browserClient.auth.onAuthStateChange((_event, session) => {
      bindRealtimeAuth(session?.access_token);
    });
  }

  return browserClient;
}
