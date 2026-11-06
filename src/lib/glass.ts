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

/**
 * Delicate glass card matching the “rim light” reference:
 * near-neutral fill, whisper of top glow, border bright at the top and
 * almost gone toward the bottom (padding-box / border-box).
 */
export function cssDelicateGlassCardStyle(cssColor = "var(--accent)") {
  // Fill almost flat — soft tint under the top rim (a touch more than whisper).
  const fill = `linear-gradient(
    180deg,
    color-mix(in srgb, ${cssColor} 9%, var(--surface-lowest)) 0%,
    color-mix(in srgb, ${cssColor} 3%, var(--surface-lowest)) 34%,
    var(--surface-lowest) 100%
  )`;
  // Border: soft top edge → fades away downward.
  const rim = `linear-gradient(
    180deg,
    color-mix(in srgb, ${cssColor} 42%, transparent) 0%,
    color-mix(in srgb, ${cssColor} 22%, transparent) 14%,
    color-mix(in srgb, ${cssColor} 10%, transparent) 36%,
    color-mix(in srgb, var(--outline-variant) 16%, transparent) 65%,
    color-mix(in srgb, var(--outline-variant) 20%, transparent) 100%
  )`;
  return {
    border: "1px solid transparent",
    background: `${fill} padding-box, ${rim} border-box`,
    boxShadow: `0 12px 32px rgba(28, 39, 64, 0.07)`,
  } as const;
}

/** Soft radial halo under the top edge (keep opacity low). */
export function cssDelicateTopGlow(cssColor = "var(--accent)") {
  return `radial-gradient(ellipse 90% 110% at 50% -5%, color-mix(in srgb, ${cssColor} 11%, transparent) 0%, transparent 68%)`;
}

/** Soft horizontal hairline centered on the top edge. */
export function cssDelicateTopHairline(cssColor = "var(--accent)") {
  return `linear-gradient(90deg, transparent 0%, color-mix(in srgb, ${cssColor} 45%, transparent) 20%, color-mix(in srgb, ${cssColor} 55%, transparent) 50%, color-mix(in srgb, ${cssColor} 45%, transparent) 80%, transparent 100%)`;
}

/** Horizontal luminous hairline across the top edge. */
export function accentRimHairline(accentHex: string) {
  return `linear-gradient(90deg, transparent 4%, ${accentHex} 48%, ${accentHex} 52%, transparent 96%)`;
}

export function cssAccentRimHairline(cssColor = "var(--accent)") {
  return `linear-gradient(90deg, transparent 4%, ${cssColor} 48%, ${cssColor} 52%, transparent 96%)`;
}
