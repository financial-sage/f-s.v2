"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const LOCAL_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0";

export default function UpdateNotifier() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    async function checkVersion() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { version } = await res.json();
        if (version && version !== LOCAL_VERSION) {
          setUpdateAvailable(true);
        }
      } catch {
        // Silently ignore — offline or network error
      }
    }

    checkVersion();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const handleUpdate = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.update());
      });
    }
    window.location.reload();
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-200 flex items-center gap-3 rounded-2xl bg-slate-800 px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#60855c]">
        <RefreshCw size={16} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white leading-tight">Nueva actualización disponible</p>
        <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Recarga para obtener la última versión.</p>
      </div>
      <button
        type="button"
        onClick={handleUpdate}
        className="shrink-0 rounded-xl bg-[#60855c] px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#4e6e4a] transition-colors"
      >
        Actualizar
      </button>
    </div>
  );
}
