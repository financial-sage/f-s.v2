export type FixedExpenseScope = "shared" | "personal";

export function isFixedExpenseScope(value: unknown): value is FixedExpenseScope {
  return value === "shared" || value === "personal";
}

export function normalizeFixedExpenseScope(value: unknown): FixedExpenseScope {
  return value === "personal" ? "personal" : "shared";
}
