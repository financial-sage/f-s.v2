"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type SocialAuthButtonsProps = {
  mode?: "login" | "register";
};

export default function SocialAuthButtons(_props: SocialAuthButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function signInWithGoogle() {
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          scopes: "openid email profile",
          queryParams: { access_type: "offline", prompt: "select_account" },
        },
      });

      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo continuar con Google.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-outline-variant/30" />
        <span className="text-[11px] font-light text-on-surface-variant">o</span>
        <div className="h-px flex-1 bg-outline-variant/30" />
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          disabled={loading}
          aria-label="Entrar con Google"
          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant/35 bg-surface-lowest transition hover:bg-glass-soft disabled:opacity-60"
        >
          {loading ? (
            <LoaderCircle size={20} className="animate-spin text-on-surface" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/icons/google.svg"
              alt=""
              width={20}
              height={20}
              className="h-5 w-5"
              draggable={false}
            />
          )}
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50/90 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}
