/** Mobile / tablet user-agents that may use the full PWA. */
const MOBILE_UA_RE =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i;

/** Cookie / query to preview the desktop shell (landing + /web) on localhost. */
export const DESKTOP_SHELL_COOKIE = "fsage_desktop_shell";
export const DESKTOP_SHELL_QUERY = "desktop";

export function isMobileUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return MOBILE_UA_RE.test(ua);
}

export function isLocalDevHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isDevelopmentNodeEnv(
  nodeEnv: string | undefined = process.env.NODE_ENV
): boolean {
  return nodeEnv === "development";
}

export function isForceDesktopFlag(value: string | null | undefined): boolean {
  return value === "1" || value === "true";
}

export function readForceDesktopShell(params: {
  cookieHeader?: string | null;
  cookieValue?: string | null;
  searchParams?: URLSearchParams | null;
}): boolean {
  const fromQuery = params.searchParams?.get(DESKTOP_SHELL_QUERY);
  if (fromQuery === "0" || fromQuery === "false") return false;
  if (isForceDesktopFlag(fromQuery)) return true;

  if (isForceDesktopFlag(params.cookieValue)) return true;

  const raw = params.cookieHeader ?? "";
  const match = raw.match(
    new RegExp(`(?:^|;\\s*)${DESKTOP_SHELL_COOKIE}=([^;]*)`)
  );
  const value = match?.[1] ? decodeURIComponent(match[1]) : "";
  return isForceDesktopFlag(value);
}

/**
 * Full PWA (dashboard, bottom nav, etc.) is allowed when:
 * - the client looks like a phone/tablet, OR
 * - we are in local development (NODE_ENV or localhost host),
 * unless `forceDesktopShell` is set (QA: ?desktop=1).
 */
export function canUseFullPwa(params: {
  userAgent?: string | null;
  host?: string | null;
  nodeEnv?: string;
  forceDesktopShell?: boolean;
}): boolean {
  if (params.forceDesktopShell) return false;
  if (isDevelopmentNodeEnv(params.nodeEnv)) return true;
  if (isLocalDevHost(params.host)) return true;
  if (isMobileUserAgent(params.userAgent)) return true;
  return false;
}

/** Desktop production clients that should use the /web metrics shell instead. */
export function shouldUseWebShell(params: {
  userAgent?: string | null;
  host?: string | null;
  nodeEnv?: string;
  forceDesktopShell?: boolean;
}): boolean {
  return !canUseFullPwa(params);
}
