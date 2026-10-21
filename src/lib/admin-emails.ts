/** Comma-separated override, plus legacy single ADMIN_EMAIL. */
function envAdminEmails(): Set<string> {
  const raw = [
    process.env.ADMIN_EMAILS ?? "",
    process.env.ADMIN_EMAIL ?? "",
  ]
    .join(",")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return new Set(raw);
}

export function isEnvAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return envAdminEmails().has(email.trim().toLowerCase());
}
