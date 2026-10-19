"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Portal } from "@/components/ui/Portal";

const BUILD_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.9";
const STORAGE_KEY = "sd-app-version";

export default function UpdateNotifier() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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
        }
      } catch {
        // Offline or network error — ignore
      }
    }

    function onSwUpdate() {
      setUpdateAvailable(true);
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

  if (!updateAvailable) return null;

  return (
    <Portal>
      <button
        type="button"
        onClick={() => void handleUpdate()}
        disabled={isUpdating}
        className="fixed top-[max(0.75rem,env(safe-area-inset-top))] right-3 z-[200] inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary px-3 py-2 text-xs font-semibold text-on-primary shadow-[0_8px_20px_rgba(15,23,42,0.22)] animate-in fade-in slide-in-from-top-2 duration-300 active:scale-95 disabled:opacity-70"
        aria-label="Actualizar app"
      >
        <RefreshCw size={14} className={isUpdating ? "animate-spin" : undefined} />
        {isUpdating ? "Actualizando…" : "Actualizar app"}
      </button>
    </Portal>
  );
}
