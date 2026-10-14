"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import {
  applyThemeClass,
  persistThemeMode,
  readStoredThemeMode,
  resolveIsDark,
  type ThemeMode,
} from "@/lib/theme";

export function ThemeToggleRow() {
  // null until we read localStorage — avoids the "system" listener
  // overwriting a stored light/dark preference on remount (e.g. /profile).
  const [mode, setMode] = useState<ThemeMode | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = readStoredThemeMode();
    const nextIsDark = resolveIsDark(stored);
    setMode(stored);
    setIsDark(nextIsDark);
    applyThemeClass(nextIsDark);
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
    persistThemeMode(nextMode);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-glass-strong text-primary shadow-sm">
          {isDark ? <Moon size={16} /> : <Sun size={16} />}
        </div>
        <span className="text-sm font-medium text-on-surface">Modo oscuro</span>
      </div>

      <button
        type="button"
        onClick={toggle}
        className={`relative inline-flex h-8 w-14 items-center rounded-full border p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${
          isDark ? "border-primary/40 bg-primary" : "border-outline-variant/30 bg-glass"
        }`}
        aria-label={isDark ? "Desactivar modo oscuro" : "Activar modo oscuro"}
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full shadow-sm transition-transform ${
            isDark ? "translate-x-6 bg-on-primary" : "translate-x-0 bg-surface-lowest"
          }`}
        />
      </button>
    </div>
  );
}
