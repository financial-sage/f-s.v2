export const COOKIE_CONSENT_STORAGE_KEY = "sd_cookie_consent";
export const COOKIE_CONSENT_VALUE = "accepted";

export function hasAcceptedCookieConsent(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) === COOKIE_CONSENT_VALUE;
  } catch {
    return false;
  }
}

export function acceptCookieConsent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, COOKIE_CONSENT_VALUE);
  } catch {
    // Ignore quota / private-mode failures; the banner may reappear.
  }
}
