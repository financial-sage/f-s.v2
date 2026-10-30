import {
  getOpenAIClient,
  getOpenAIModel,
  isOpenAIConfigured,
  parseJsonObject,
} from "@/lib/ai/openai";
import { extraCategories, topCategories } from "@/lib/categoryMap";
import {
  formatFamilyCategoryCatalog,
  matchFamilyCategoryId,
  type FamilyCategoryOption,
} from "@/lib/categories/matchFamilyCategory";
import { normalizeWeightLine } from "@/lib/grocery";

export type ReceiptFundOption = {
  id: string;
  name: string;
};

export type ParsedReceiptLine = {
  name: string;
  quantity: number | null;
  unitPrice: number | null;
  lineTotal: number | null;
};

export type ParsedReceipt = {
  merchant: string | null;
  /** Final concept for the form: product if 1 line, merchant if many. */
  description: string | null;
  primaryProduct: string | null;
  itemCount: number | null;
  total: number | null;
  currency: string | null;
  date: string | null; // YYYY-MM-DD
  /** family_categories id when catalog was provided; else legacy tile id. */
  categoryId: string | null;
  /** Legacy coarse hint kept for fallback mapping. */
  categoryHint: string | null;
  /** Matched fund id from the options we sent, if any. */
  fundId: string | null;
  confidence: "high" | "medium" | "low";
  rawNotes: string | null;
  /** Product lines for grocery ticket detail + price compare. */
  lines?: ParsedReceiptLine[];
};

const CATEGORY_CATALOG = [...topCategories, ...extraCategories].map((c) => ({
  id: c.id,
  label: c.label,
}));
const VALID_CATEGORY_IDS = new Set(CATEGORY_CATALOG.map((c) => c.id));

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100) / 100;
  }
  if (typeof value === "string") {
    const normalized = value.replace(/\s/g, "").replace(",", ".");
    const n = Number(normalized.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
  }
  return null;
}

/** Quantity keeps 3 decimals (kg / grams before normalize). */
function toQuantity(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 1000) / 1000;
  }
  if (typeof value === "string") {
    const normalized = value.replace(/\s/g, "").replace(",", ".");
    const n = Number(normalized.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : null;
  }
  return null;
}

function toUnitHint(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const u = value.trim().toLowerCase();
  if (!u) return null;
  if (/^(g|gr|grs|gramo|gramos)$/.test(u)) return "g";
  if (/^(kg|kgs|kilo|kilos)$/.test(u)) return "kg";
  if (/^(ud|uds|u|un|unidad|unidades|pz|pza)$/.test(u)) return "ud";
  return null;
}

/** Max age / future skew for a scanned ticket date vs "today" (UTC calendar). */
const RECEIPT_DATE_MAX_PAST_DAYS = 90;
const RECEIPT_DATE_MAX_FUTURE_DAYS = 2;

function utcDayMs(year: number, monthIndex: number, day: number) {
  return Date.UTC(year, monthIndex, day);
}

/**
 * Normalize OCR dates and drop improbable years (e.g. 2023 on a 2026 scan).
 * Returns YYYY-MM-DD or null — null keeps the form's "today".
 */
function toDate(value: unknown, today = new Date()): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  let yyyy: number;
  let mm: number;
  let dd: number;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    yyyy = Number(trimmed.slice(0, 4));
    mm = Number(trimmed.slice(5, 7));
    dd = Number(trimmed.slice(8, 10));
  } else {
    const parsed = Date.parse(trimmed);
    if (!Number.isFinite(parsed)) return null;
    const d = new Date(parsed);
    yyyy = d.getUTCFullYear();
    mm = d.getUTCMonth() + 1;
    dd = d.getUTCDate();
  }
  if (
    !Number.isFinite(yyyy) ||
    !Number.isFinite(mm) ||
    !Number.isFinite(dd) ||
    mm < 1 ||
    mm > 12 ||
    dd < 1 ||
    dd > 31
  ) {
    return null;
  }

  const candidateMs = utcDayMs(yyyy, mm - 1, dd);
  // Reject impossible calendar dates (e.g. 2026-02-31 → rolls over).
  const check = new Date(candidateMs);
  if (
    check.getUTCFullYear() !== yyyy ||
    check.getUTCMonth() !== mm - 1 ||
    check.getUTCDate() !== dd
  ) {
    return null;
  }

  const todayMs = utcDayMs(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );
  const diffDays = Math.round((candidateMs - todayMs) / 86_400_000);
  if (diffDays > RECEIPT_DATE_MAX_FUTURE_DAYS) return null;
  if (diffDays < -RECEIPT_DATE_MAX_PAST_DAYS) return null;

  return `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

function toItemCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }
  if (typeof value === "string") {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  return null;
}

function normalizeLegacyCategoryId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim().toLowerCase();
  if (VALID_CATEGORY_IDS.has(id)) return id;
  const aliases: Record<string, string> = {
    food: "dining",
    shopping: "super",
    groceries: "super",
    leisure: "cinema",
    other: "misc",
    health: "health",
    transport: "transport",
    home: "home",
  };
  return aliases[id] ?? null;
}

function resolveReceiptCategoryId(
  raw: unknown,
  categoryHint: string | null,
  description: string | null,
  merchant: string | null,
  familyCategories: FamilyCategoryOption[]
): string | null {
  if (familyCategories.length > 0) {
    const rawId = typeof raw === "string" ? raw.trim() : "";
    if (rawId && familyCategories.some((c) => c.id === rawId)) {
      return rawId;
    }
    const legacy = normalizeLegacyCategoryId(raw);
    return matchFamilyCategoryId({
      categories: familyCategories,
      legacyTileId: legacy,
      categoryHint,
      concept: description || merchant,
    });
  }
  return normalizeLegacyCategoryId(raw);
}

function matchFundId(
  rawId: unknown,
  rawName: unknown,
  funds: ReceiptFundOption[]
): string | null {
  if (!funds.length) return null;
  if (typeof rawId === "string" && funds.some((f) => f.id === rawId.trim())) {
    return rawId.trim();
  }
  const name =
    typeof rawName === "string" ? rawName.trim().toLowerCase() : "";
  if (!name) return null;
  const exact = funds.find((f) => f.name.trim().toLowerCase() === name);
  if (exact) return exact.id;
  const partial = funds.find(
    (f) =>
      f.name.trim().toLowerCase().includes(name) ||
      name.includes(f.name.trim().toLowerCase())
  );
  return partial?.id ?? null;
}

function buildDescription(input: {
  itemCount: number | null;
  primaryProduct: string | null;
  merchant: string | null;
  description: string | null;
}): string | null {
  const count = input.itemCount;
  const product = input.primaryProduct?.trim() || null;
  const merchant = input.merchant?.trim() || null;

  // Single product → product name; many / unknown → establishment.
  if (count === 1 && product) return product.slice(0, 80);
  if (count != null && count > 1 && merchant) return merchant.slice(0, 80);
  if (merchant && product && count === 1) return product.slice(0, 80);
  if (merchant) return merchant.slice(0, 80);
  if (product) return product.slice(0, 80);
  if (input.description?.trim()) return input.description.trim().slice(0, 80);
  return null;
}

/**
 * Parse a receipt / voucher image with OpenAI Vision.
 * Returns structured fields for the expense form; never invents a total if unclear.
 */
function parseReceiptLines(raw: unknown): ParsedReceiptLine[] {
  if (!Array.isArray(raw)) return [];
  const lines: ParsedReceiptLine[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const name =
      typeof o.name === "string"
        ? o.name.trim().slice(0, 160)
        : typeof o.description === "string"
          ? o.description.trim().slice(0, 160)
          : typeof o.product === "string"
            ? o.product.trim().slice(0, 160)
            : typeof o.label === "string"
              ? o.label.trim().slice(0, 160)
              : "";
    if (!name) continue;
    const normalized = normalizeWeightLine({
      name,
      quantity: toQuantity(o.quantity ?? o.qty ?? o.cant ?? o.weight),
      unitPrice: toNumber(
        o.unitPrice ?? o.unit_price ?? o.price ?? o.precio ?? o.importe_unitario
      ),
      lineTotal: toNumber(
        o.lineTotal ?? o.line_total ?? o.importe ?? o.amount ?? o.total
      ),
      unit: toUnitHint(o.unit ?? o.unidad ?? o.qtyUnit ?? o.quantityUnit),
    });
    lines.push(normalized);
    if (lines.length >= 80) break;
  }
  return lines;
}

export async function parseReceiptImage(input: {
  mimeType: string;
  base64: string;
  localeHint?: string;
  funds?: ReceiptFundOption[];
  /** Family spend categories (parent + sub) — preferred over legacy tiles. */
  categories?: FamilyCategoryOption[];
  /** Extract product lines for grocery ticket detail + price compare. */
  includeLineItems?: boolean;
}): Promise<ParsedReceipt> {
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI no configurado (falta OPENAI_API_KEY).");
  }

  const openai = getOpenAIClient();
  const model = getOpenAIModel();
  const locale =
    input.localeHint?.trim() ||
    "español; puede ser ticket de España o Latinoamérica";
  const funds = input.funds ?? [];
  const familyCategories = input.categories ?? [];
  const includeLineItems = Boolean(input.includeLineItems);
  const fundsBlock =
    funds.length > 0
      ? funds.map((f) => `${f.id}=${f.name}`).join(", ")
      : "(ninguno)";
  const categoriesBlock =
    familyCategories.length > 0
      ? formatFamilyCategoryCatalog(familyCategories)
      : CATEGORY_CATALOG.map((c) => `${c.id}=${c.label}`).join(", ");
  const categoryIdRule =
    familyCategories.length > 0
      ? 'id exacto de la lista (preferir subcategoría si encaja; si no, el padre). No inventes ids.'
      : "icono/categoría legacy (dining, super, transport, …).";

  const linesBlock = includeLineItems
    ? `
  "lines": [
    { "name": "producto", "quantity": 1, "unit": "ud", "unitPrice": 1.15, "lineTotal": 1.15 }
  ]`
    : "";

  const linesRules = includeLineItems
    ? `
- "lines": OBLIGATORIO cuando el documento es un ticket/factura de supermercado (Alcampo, Mercadona, Carrefour, etc.).
  Lista TODOS los productos visibles (máx ~60) con name, quantity, unit, unitPrice y/o lineTotal.
  Omite solo: totales, IVA/impuestos, cambio, redondeo y cabeceras. No inventes productos que no se lean.
  Si el ticket tiene desglose y no lo extraes, está mal. Solo lines = [] si realmente no hay líneas de producto.
  Productos a peso (fruta, verdura, carne, charcutería):
  - "unit" = "kg" siempre (nunca "g").
  - "quantity" en kilogramos (450 g → 0.45; 1,250 kg → 1.25).
  - "unitPrice" = precio por kilo (€/kg, $/kg, …) tal como aparece en el ticket.
  - "lineTotal" = importe cobrado de esa línea (peso × €/kg).
  Ejemplo: PLÁTANO 1,99 €/kg · 450 g · 0,90 € →
  { "name": "PLÁTANO", "quantity": 0.45, "unit": "kg", "unitPrice": 1.99, "lineTotal": 0.90 }
  Unidades sueltas (latas, bricks, packs): "unit" = "ud", quantity = nº de unidades.`
    : "";

  const todayIso = new Date().toISOString().slice(0, 10);
  const prompt = `Eres un extractor de datos de tickets, facturas electrónicas (PDF rasterizado), vouchers o tickets en foto para SinDescuadre (finanzas en pareja/familia).
Idioma del documento: ${locale}.
Puede ser una o varias páginas unidas en vertical (factura electrónica).
Hoy (referencia) es ${todayIso}.

Lee la imagen y devuelve SOLO JSON válido con esta forma:
{
  "merchant": "nombre del comercio o null",
  "primaryProduct": "nombre del producto principal si hay uno claro, o null",
  "itemCount": 1,
  "description": "concepto corto (máx 80) o null",
  "total": 12.34,
  "currency": "EUR|COP|USD|null",
  "date": "YYYY-MM-DD o null",
  "categoryId": "uno de la lista de categorías o null",
  "categoryHint": "food|transport|home|health|leisure|shopping|other|null",
  "fundId": "uuid de la lista de bolsillos o null",
  "fundNameHint": "nombre del bolsillo si no estás seguro del id, o null",
  "confidence": "high|medium|low",
  "rawNotes": "duda breve si la hubo, o null"${includeLineItems ? "," : ""}
${linesBlock}
}

Bolsillos disponibles (elige el más coherente con el ticket; si ninguno encaja, null):
${fundsBlock}

Categorías permitidas (categoryId):
${categoriesBlock}

Reglas:
- "total" = importe FINAL a pagar (con impuestos si ya van incluidos). Si no estás seguro → null. No inventes.
- "date": fecha del ticket en YYYY-MM-DD. Si el año es de 2 dígitos (p. ej. 27/10/26), usa el siglo actual (${todayIso.slice(0, 4)} → 2026). No inventes años antiguos. Si no lees la fecha con claridad → null.
- "itemCount": nº aproximado de líneas de producto (1 = un solo producto/servicio; >1 = varios).
- "primaryProduct": si itemCount es 1, el nombre del producto/servicio; si hay muchos, null.
- "description":
  - si itemCount === 1 → el producto (primaryProduct)
  - si itemCount > 1 → el nombre del establecimiento (merchant)
- "fundId": el bolsillo cuyo nombre mejor encaja (ej. restaurante→bolsillo Comida/Restaurantes; supermercado→Super/Compras). Solo ids de la lista.
- "categoryId": ${categoryIdRule}
- Si hay varios totales, prioriza el total cobrado / a pagar.${linesRules}`;

  const response = await openai.chat.completions.create({
    model,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${input.mimeType};base64,${input.base64}`,
            },
          },
        ],
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";
  if (!text.trim()) {
    throw new Error("No se pudo leer el ticket.");
  }

  const parsed = parseJsonObject(text);
  if (!parsed) {
    throw new Error("La respuesta del lector no es válida.");
  }

  const confidenceRaw = String(parsed.confidence ?? "low");
  const confidence =
    confidenceRaw === "high" ||
    confidenceRaw === "medium" ||
    confidenceRaw === "low"
      ? confidenceRaw
      : "low";

  const merchant =
    typeof parsed.merchant === "string" && parsed.merchant.trim()
      ? parsed.merchant.trim()
      : null;
  const primaryProduct =
    typeof parsed.primaryProduct === "string" && parsed.primaryProduct.trim()
      ? parsed.primaryProduct.trim().slice(0, 80)
      : null;
  const itemCount = toItemCount(parsed.itemCount);
  const rawDescription =
    typeof parsed.description === "string" && parsed.description.trim()
      ? parsed.description.trim().slice(0, 80)
      : null;

  const lines = includeLineItems
    ? parseReceiptLines(
        parsed.lines ?? parsed.items ?? parsed.products ?? parsed.lineItems
      )
    : undefined;
  const resolvedItemCount =
    itemCount ??
    (lines && lines.length > 0 ? lines.length : null);

  return {
    merchant,
    primaryProduct,
    itemCount: resolvedItemCount,
    description: buildDescription({
      itemCount: resolvedItemCount,
      primaryProduct,
      merchant,
      description: rawDescription,
    }),
    total: toNumber(parsed.total),
    currency:
      typeof parsed.currency === "string" && parsed.currency.trim()
        ? parsed.currency.trim().toUpperCase()
        : null,
    date: toDate(parsed.date),
    categoryId: resolveReceiptCategoryId(
      parsed.categoryId,
      typeof parsed.categoryHint === "string" && parsed.categoryHint.trim()
        ? parsed.categoryHint.trim()
        : null,
      rawDescription,
      merchant,
      familyCategories
    ),
    categoryHint:
      typeof parsed.categoryHint === "string" && parsed.categoryHint.trim()
        ? parsed.categoryHint.trim()
        : null,
    fundId: matchFundId(parsed.fundId, parsed.fundNameHint, funds),
    confidence,
    rawNotes:
      typeof parsed.rawNotes === "string" && parsed.rawNotes.trim()
        ? parsed.rawNotes.trim()
        : null,
    ...(lines ? { lines } : {}),
  };
}
