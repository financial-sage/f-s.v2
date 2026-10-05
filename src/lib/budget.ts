export type BudgetLimits = Record<string, number>;

export type BudgetStore = Record<string, BudgetLimits>;

export function getMonthKey(date: Date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function parseMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, 1);
}

export function shiftMonthKey(monthKey: string, delta: number) {
  const date = parseMonthKey(monthKey);
  date.setMonth(date.getMonth() + delta);
  return getMonthKey(date);
}

export function formatMonthLabel(monthKey: string) {
  const date = parseMonthKey(monthKey);
  const label = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  }).format(date);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}

export function budgetStorageKey(familyId: string) {
  return `fsage:budget:v1:${familyId}`;
}

export function safeParseBudgetStore(raw: string | null): BudgetStore {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as BudgetStore;
  } catch {
    return {};
  }
}
