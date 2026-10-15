/** Tinted glass card background — respects light/dark via CSS vars. */
export function tintedGlassGradient(
  accentHex: string,
  options?: {
    soft?: boolean;
    midAlpha?: string;
    endAlpha?: string;
    midStop?: number;
    /** Single mid stop only (no end tint). */
    endOnly?: boolean;
  },
) {
  const highlight = options?.soft
    ? "var(--glass-highlight-soft)"
    : "var(--glass-highlight)";
  const mid = options?.midAlpha ?? "18";
  const end = options?.endAlpha ?? "28";
  const midStop = options?.midStop ?? 55;

  if (options?.endOnly) {
    return `linear-gradient(145deg, ${highlight} 0%, ${accentHex}${mid} 100%)`;
  }

  return `linear-gradient(145deg, ${highlight} 0%, ${accentHex}${mid} ${midStop}%, ${accentHex}${end} 100%)`;
}

/** Theme-aware hero glass (sage in light, graphite ink in dark). */
export function sageGlassGradient() {
  return `linear-gradient(145deg, var(--glass-highlight) 0%, color-mix(in srgb, var(--primary) 18%, transparent) 55%, color-mix(in srgb, var(--primary) 28%, transparent) 100%)`;
}
