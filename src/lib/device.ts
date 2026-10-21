/** Mobile / tablet user-agents that may use the full PWA. */
const MOBILE_UA_RE =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i;

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

/**
 * Full PWA (dashboard, bottom nav, etc.) is allowed when:
 * - the client looks like a phone/tablet, OR
 * - we are in local development (NODE_ENV or localhost host).
 */
export function canUseFullPwa(params: {
  userAgent?: string | null;
  host?: string | null;
  nodeEnv?: string;
}): boolean {
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
}): boolean {
  return !canUseFullPwa(params);
}
