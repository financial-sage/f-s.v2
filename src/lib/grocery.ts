import type { FamilyFund } from "@/lib/funds";

/** Name hints that suggest a grocery / market pocket. */
const GROCERY_NAME_HINTS = [
  "mercado",
  "supermercado",
  "super",
  "súper",
  "compra",
  "compras",
  "alimentos",
  "despensa",
  "grocery",
  "groceries",
  "hipermercado",
];

export type ReceiptLineDraft = {
  name: string;
  quantity: number | null;
  unitPrice: number | null;
  lineTotal: number | null;
};

export function looksLikeGroceryFundName(name: string): boolean {
  const n = name.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (!n) return false;
  return GROCERY_NAME_HINTS.some((hint) => {
    const h = hint.normalize("NFD").replace(/\p{M}/gu, "");
    return n === h || n.includes(h) || h.includes(n);
  });
}

export function isGroceryFund(
  fund?: Pick<FamilyFund, "is_grocery" | "name"> | null
): boolean {
  if (!fund) return false;
  if (fund.is_grocery === true) return true;
  return false;
}

export function getGroceryFund(funds: FamilyFund[]): FamilyFund | null {
  return funds.find((f) => !f.archived_at && f.is_grocery === true) ?? null;
}

/** Normalize product names for price history matching. */
export function normalizeProductKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}
