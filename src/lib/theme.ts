export type ThemeMode = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "fsage:theme";

/** Matches `--page-from` / splash so Android system chrome blends with the PWA. */
export const THEME_COLOR_LIGHT = "#f7f4ee";
export const THEME_COLOR_DARK = "#0f1729";

export function readStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // ignore
  }
  return "system";
}

export function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
}

/** Keep <meta name="theme-color"> in sync with the *app* theme (not only OS). */
export function applyThemeColor(isDark: boolean) {
  if (typeof document === "undefined") return;
  const color = isDark ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;
  let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = color;
  // Drop media-scoped tags from Next viewport so they don't win over our value.
  document
    .querySelectorAll('meta[name="theme-color"][media]')
    .forEach((node) => {
      if (node !== meta) node.remove();
    });
}

export function applyThemeClass(isDark: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
  applyThemeColor(isDark);
}

export function persistThemeMode(mode: ThemeMode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}
