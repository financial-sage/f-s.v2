"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "fsage:theme";

function resolveIsDark(mode: ThemeMode) {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
}

function applyThemeClass(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
}

export function ThemeToggleRow() {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    try {
      const stored = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? "system";
      setMode(stored);
      const nextIsDark = resolveIsDark(stored);
      setIsDark(nextIsDark);
      applyThemeClass(nextIsDark);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (mode !== "system") return;

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;

    const handler = () => {
      const nextIsDark = resolveIsDark("system");
      setIsDark(nextIsDark);
      applyThemeClass(nextIsDark);
    };

    handler();
    media.addEventListener?.("change", handler);
    return () => media.removeEventListener?.("change", handler);
  }, [mode]);

  function toggle() {
    const nextMode: ThemeMode = isDark ? "light" : "dark";
    const nextIsDark = resolveIsDark(nextMode);
    setMode(nextMode);
    setIsDark(nextIsDark);
    applyThemeClass(nextIsDark);
    try {
      localStorage.setItem(STORAGE_KEY, nextMode);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-surface-low p-2 text-primary">
          {isDark ? <Moon size={18} /> : <Sun size={18} />}
        </div>
        <span className="font-semibold text-on-surface">Modo oscuro</span>
      </div>

      <button
        type="button"
        onClick={toggle}
        className="relative inline-flex h-8 w-14 items-center rounded-full border border-outline-variant/40 bg-surface-low p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        aria-label={isDark ? "Desactivar modo oscuro" : "Activar modo oscuro"}
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-surface-lowest shadow-sm transition-transform ${
            isDark ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

