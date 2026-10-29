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

/** Optional OCR unit hint used only while normalizing weight lines. */
export type ReceiptLineUnitHint = "g" | "kg" | "ud" | null;

const GRAMS_HINT =
  /(?:^|[\s(/])(?:g|gr|grs|gramos?)(?:$|[\s)/])/i;
const KG_HINT = /(?:^|[\s(/])(?:kg|kgs|kilos?)(?:$|[\s)/])/i;

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

function roundQty(n: number) {
  return Math.round(n * 1000) / 1000;
}

function absErr(a: number, b: number) {
  return Math.abs(a - b);
}

/**
 * Normalize weight-priced ticket lines to kg + price/kg.
 * Example: plátano 450 g @ 1,99 €/kg → qty 0.45, unit 1.99, total 0.90.
 * Piece items (ud) are left unchanged.
 */
export function normalizeWeightLine(input: {
  name: string;
  quantity: number | null;
  unitPrice: number | null;
  lineTotal: number | null;
  unit?: ReceiptLineUnitHint | string | null;
}): ReceiptLineDraft {
  const name = String(input.name ?? "").trim().slice(0, 160);
  let quantity =
    input.quantity != null && Number.isFinite(input.quantity)
      ? Number(input.quantity)
      : null;
  let unitPrice =
    input.unitPrice != null && Number.isFinite(input.unitPrice)
      ? Number(input.unitPrice)
      : null;
  let lineTotal =
    input.lineTotal != null && Number.isFinite(input.lineTotal)
      ? Number(input.lineTotal)
      : null;

  const unitRaw = String(input.unit ?? "")
    .trim()
    .toLowerCase();
  let unit: ReceiptLineUnitHint = null;
  if (/^(g|gr|grs|gramo|gramos)$/.test(unitRaw)) unit = "g";
  else if (/^(kg|kgs|kilo|kilos)$/.test(unitRaw)) unit = "kg";
  else if (/^(ud|uds|u|un|unidad|unidades|pz|pza)$/.test(unitRaw)) unit = "ud";
  else if (GRAMS_HINT.test(name) && !KG_HINT.test(name)) unit = "g";
  else if (KG_HINT.test(name)) unit = "kg";

  const looksLikePieces =
    unit === "ud" ||
    (quantity != null &&
      quantity > 0 &&
      quantity <= 30 &&
      Number.isInteger(quantity) &&
      unitPrice != null &&
      lineTotal != null &&
      absErr(unitPrice * quantity, lineTotal) <=
        Math.max(0.03, lineTotal * 0.05));

  if (!looksLikePieces) {
    // Explicit grams → kg.
    if (unit === "g" && quantity != null && quantity > 0) {
      quantity = roundQty(quantity / 1000);
      unit = "kg";
    }

    // qty in grams when €/kg × (qty/1000) ≈ line total better than €/kg × qty.
    if (
      unit !== "kg" &&
      quantity != null &&
      quantity >= 10 &&
      unitPrice != null &&
      unitPrice > 0 &&
      lineTotal != null &&
      lineTotal > 0
    ) {
      const asKg = quantity / 1000;
      const errAsIs = absErr(unitPrice * quantity, lineTotal);
      const errAsG = absErr(unitPrice * asKg, lineTotal);
      const tol = Math.max(0.04, lineTotal * 0.08);
      if (errAsG <= tol && errAsG < errAsIs) {
        quantity = roundQty(asKg);
        unit = "kg";
      }
    }

    // Integer grams without reliable unitPrice (450 + total 0.90).
    if (
      unit !== "kg" &&
      quantity != null &&
      quantity >= 20 &&
      quantity <= 20000 &&
      Number.isInteger(quantity) &&
      lineTotal != null &&
      lineTotal > 0
    ) {
      const asKg = quantity / 1000;
      const derivedPerKg = lineTotal / asKg;
      const plausiblePerKg = derivedPerKg >= 0.15 && derivedPerKg <= 50;
      const unitMatchesGrams =
        unitPrice != null &&
        absErr(unitPrice * asKg, lineTotal) <=
          Math.max(0.04, lineTotal * 0.08);
      if (plausiblePerKg && (unitPrice == null || unitMatchesGrams)) {
        quantity = roundQty(asKg);
        if (unitPrice == null) unitPrice = roundMoney(derivedPerKg);
        unit = "kg";
      }
    }
  }

  if (
    unitPrice == null &&
    quantity != null &&
    quantity > 0 &&
    lineTotal != null
  ) {
    unitPrice = roundMoney(lineTotal / quantity);
  }

  if (
    lineTotal == null &&
    quantity != null &&
    quantity > 0 &&
    unitPrice != null
  ) {
    lineTotal = roundMoney(quantity * unitPrice);
  }

  return {
    name,
    quantity: quantity != null ? roundQty(quantity) : null,
    unitPrice: unitPrice != null ? roundMoney(unitPrice) : null,
    lineTotal: lineTotal != null ? roundMoney(lineTotal) : null,
  };
}

export function normalizeReceiptLines(
  lines: Array<{
    name: string;
    quantity?: number | null;
    unitPrice?: number | null;
    lineTotal?: number | null;
    unit?: ReceiptLineUnitHint | string | null;
  }>
): ReceiptLineDraft[] {
  return (lines ?? [])
    .map((line) =>
      normalizeWeightLine({
        name: line.name,
        quantity: line.quantity ?? null,
        unitPrice: line.unitPrice ?? null,
        lineTotal: line.lineTotal ?? null,
        unit: line.unit ?? null,
      })
    )
    .filter((line) => line.name.length > 0);
}

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
