"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { Portal } from "@/components/ui/Portal";
import { APP_UPDATE_MESSAGE_TYPE } from "@/lib/push";

const BUILD_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
const STORAGE_KEY = "sd-app-version";

export default function UpdateNotifier() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkVersion() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        const version = data.version?.trim();
        if (!version || cancelled) return;

        setServerVersion(version);

        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (!stored) {
          // Seed with the running build so the next deploy can detect a mismatch.
          window.localStorage.setItem(STORAGE_KEY, BUILD_VERSION);
        }

        const known = window.localStorage.getItem(STORAGE_KEY);
        if ((known && known !== version) || BUILD_VERSION !== version) {
          setUpdateAvailable(true);
          setDismissed(false);
        }
      } catch {
        // Offline or network error — ignore
      }
    }

    function onSwUpdate() {
      setUpdateAvailable(true);
      setDismissed(false);
    }

    function onControllerMessage(event: MessageEvent) {
      const data = event.data as { type?: string; version?: string | null } | null;
      if (data?.type !== APP_UPDATE_MESSAGE_TYPE) return;
      if (data.version) {
        setServerVersion(String(data.version));
      }
      setUpdateAvailable(true);
      setDismissed(false);
      void checkVersion();
      void navigator.serviceWorker?.getRegistration().then((reg) => reg?.update());
    }

    async function watchServiceWorker() {
      if (!("serviceWorker" in navigator)) return;

      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        if (registration.waiting) {
          onSwUpdate();
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              onSwUpdate();
            }
          });
        });

        void registration.update();
      } catch {
        // Ignore SW errors
      }
    }

    void checkVersion();
    void watchServiceWorker();

    navigator.serviceWorker?.addEventListener("message", onControllerMessage);

    const intervalId = window.setInterval(() => {
      void checkVersion();
      void navigator.serviceWorker?.getRegistration().then((reg) => reg?.update());
    }, 60_000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void checkVersion();
        void navigator.serviceWorker?.getRegistration().then((reg) => reg?.update());
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      navigator.serviceWorker?.removeEventListener("message", onControllerMessage);
    };
  }, []);

  const handleUpdate = async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    try {
      if (serverVersion) {
        window.localStorage.setItem(STORAGE_KEY, serverVersion);
      }

      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
        await registration?.update();

        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch {
      // Still reload so the user gets the newest HTML/JS
    }

    window.location.reload();
  };

  if (!updateAvailable || dismissed) return null;

  return (
    <Portal>
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-x-3 bottom-[max(1rem,calc(var(--fab-clearance,4.5rem)+0.5rem))] z-[200] mx-auto max-w-md animate-in fade-in slide-in-from-bottom-3 duration-300"
      >
        <div className="rounded-[1.35rem] border border-accent/35 bg-surface-lowest/95 px-4 py-3.5 shadow-[0_16px_40px_rgba(43,52,55,0.18)] backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium tracking-tight text-on-surface">
                Nueva versión lista
              </p>
              <p className="mt-1 text-[12px] font-light leading-relaxed text-on-surface-variant">
                Pulsa actualizar para cargar la nueva versión al momento.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="shrink-0 rounded-full p-1.5 text-on-surface-variant/70 transition-colors hover:bg-on-surface/[0.05] hover:text-on-surface"
              aria-label="Cerrar aviso"
            >
              <X size={14} strokeWidth={1.75} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => void handleUpdate()}
            disabled={isUpdating}
            className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-accent px-4 text-[13px] font-medium text-[#3a3224] transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-70"
          >
            <RefreshCw
              size={14}
              strokeWidth={2}
              className={isUpdating ? "animate-spin" : undefined}
            />
            {isUpdating ? "Actualizando…" : "Actualizar ahora"}
          </button>
        </div>
      </div>
    </Portal>
  );
}
