/**
 * Build/runtime app version used for update detection and push payloads.
 * On Vercel, prefer the git SHA (baked into NEXT_PUBLIC_APP_VERSION at build).
 */
export function getAppVersion(): string {
  const baked = process.env.NEXT_PUBLIC_APP_VERSION?.trim();
  if (baked) return baked;

  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  if (sha) return sha.slice(0, 7);

  return "dev";
}
