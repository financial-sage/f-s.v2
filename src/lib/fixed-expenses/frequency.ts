export type FixedExpenseFrequency =
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "semiannual"
  | "annual";

export const FIXED_EXPENSE_FREQUENCIES: FixedExpenseFrequency[] = [
  "monthly",
  "bimonthly",
  "quarterly",
  "semiannual",
  "annual",
];

const MONTHS_PER_PERIOD: Record<FixedExpenseFrequency, number> = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

export const FREQUENCY_LABELS: Record<FixedExpenseFrequency, string> = {
  monthly: "Mensual",
  bimonthly: "Bimensual",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
};

export function isFixedExpenseFrequency(value: unknown): value is FixedExpenseFrequency {
  return (
    typeof value === "string" &&
    (FIXED_EXPENSE_FREQUENCIES as string[]).includes(value)
  );
}

export function normalizeFixedExpenseFrequency(
  value: unknown
): FixedExpenseFrequency {
  return isFixedExpenseFrequency(value) ? value : "monthly";
}

export function monthsPerFrequency(frequency: FixedExpenseFrequency): number {
  return MONTHS_PER_PERIOD[frequency];
}

/** Importe que pesa cada mes en capacidad / Decision Engine. */
export function monthlyEquivalent(
  baseValue: number,
  frequency: FixedExpenseFrequency = "monthly"
): number {
  const amount = Number(baseValue) || 0;
  const months = monthsPerFrequency(frequency);
  return Math.round((amount / months) * 100) / 100;
}

export function parseMonthKey(monthKey: string): { year: number; month: number } | null {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return null;
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return { year, month };
}

/**
 * Whether a template falls due in `monthKey`.
 * Anchor is the calendar month (1–12) that starts the cycle.
 */
export function isFixedExpenseDueInMonth(input: {
  frequency: FixedExpenseFrequency;
  anchorMonth: number;
  monthKey: string;
}): boolean {
  const parsed = parseMonthKey(input.monthKey);
  if (!parsed) return false;

  const frequency = normalizeFixedExpenseFrequency(input.frequency);
  if (frequency === "monthly") return true;

  const anchor = Math.min(12, Math.max(1, Math.round(Number(input.anchorMonth) || 1)));
  const period = monthsPerFrequency(frequency);
  const delta = (parsed.month - anchor + 12) % 12;
  return delta % period === 0;
}

export function frequencyShortHint(
  frequency: FixedExpenseFrequency,
  baseValue: number
): string | null {
  if (frequency === "monthly") return null;
  const eq = monthlyEquivalent(baseValue, frequency);
  return `≈ ${eq}/mes`;
}
