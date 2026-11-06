/** Cookie so the home RSC can branch without a DB round-trip. */
export const SIMPLE_MODE_COOKIE_KEY = "fsage_simple_mode";
export const SIMPLE_MODE_STORAGE_KEY = "fsage:simple_mode";
export const SIMPLE_MODE_CHANGE_EVENT = "fsage:simple_mode";

const COOKIE_MAX_AGE_SEC = 31536000;

export function parseSimpleModeValue(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function serializeSimpleModeValue(enabled: boolean): string {
  return enabled ? "1" : "0";
}

/** Server / RSC: read from Next cookie store value. */
export function isSimpleModeEnabledFromCookie(
  raw: string | null | undefined,
): boolean {
  return parseSimpleModeValue(raw);
}

export function readStoredSimpleMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = window.localStorage.getItem(SIMPLE_MODE_STORAGE_KEY);
    if (stored != null) return parseSimpleModeValue(stored);
  } catch {
    // ignore
  }
  try {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${SIMPLE_MODE_COOKIE_KEY}=`));
    return parseSimpleModeValue(match?.split("=")[1]);
  } catch {
    return false;
  }
}

export function writeStoredSimpleMode(enabled: boolean) {
  if (typeof window === "undefined") return;
  const value = serializeSimpleModeValue(enabled);
  try {
    window.localStorage.setItem(SIMPLE_MODE_STORAGE_KEY, value);
  } catch {
    // ignore
  }
  try {
    document.cookie = `${SIMPLE_MODE_COOKIE_KEY}=${value}; Path=/; Max-Age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(SIMPLE_MODE_CHANGE_EVENT));
}

/** Seed cookie from localStorage on first client visit after deploy. */
export function ensureSimpleModeCookie(
  enabled: boolean = readStoredSimpleMode(),
) {
  if (typeof window === "undefined") return;
  try {
    document.cookie = `${SIMPLE_MODE_COOKIE_KEY}=${serializeSimpleModeValue(enabled)}; Path=/; Max-Age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
  } catch {
    // ignore
  }
}
