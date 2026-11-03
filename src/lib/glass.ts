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

/** Theme-aware hero glass (uses --primary in both themes). */
export function sageGlassGradient() {
  return `linear-gradient(145deg, var(--glass-highlight) 0%, color-mix(in srgb, var(--primary) 18%, transparent) 55%, color-mix(in srgb, var(--primary) 28%, transparent) 100%)`;
}

/** Brand gold glass — SinDescuadre accent (cuentas / liquidez). */
export function accentGlassGradient() {
  return `linear-gradient(145deg, var(--glass-highlight) 0%, color-mix(in srgb, var(--accent) 18%, transparent) 55%, color-mix(in srgb, var(--accent) 30%, transparent) 100%)`;
}

/**
 * Top rim-light for hero balance cards (wash + inset edge).
 * `accentHex` must be #RRGGBB (appends 2-digit alpha).
 */
export function accentRimCardStyle(accentHex: string, baseBackground: string) {
  return {
    backgroundImage: `linear-gradient(180deg, ${accentHex}26 0%, transparent 42%), ${baseBackground}`,
    boxShadow: `inset 0 1px 0 0 ${accentHex}b3, var(--glass-shadow)`,
  } as const;
}

/** Same rim using a CSS color token (e.g. var(--accent)). */
export function cssAccentRimCardStyle(
  baseBackground: string,
  cssColor = "var(--accent)"
) {
  return {
    backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${cssColor} 16%, transparent) 0%, transparent 42%), ${baseBackground}`,
    boxShadow: `inset 0 1px 0 0 color-mix(in srgb, ${cssColor} 72%, transparent), var(--glass-shadow)`,
  } as const;
}

/** Horizontal luminous hairline across the top edge. */
export function accentRimHairline(accentHex: string) {
  return `linear-gradient(90deg, transparent 4%, ${accentHex} 48%, ${accentHex} 52%, transparent 96%)`;
}

export function cssAccentRimHairline(cssColor = "var(--accent)") {
  return `linear-gradient(90deg, transparent 4%, ${cssColor} 48%, ${cssColor} 52%, transparent 96%)`;
}
