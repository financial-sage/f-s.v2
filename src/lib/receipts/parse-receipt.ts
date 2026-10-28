import {
  getOpenAIClient,
  getOpenAIModel,
  isOpenAIConfigured,
  parseJsonObject,
} from "@/lib/ai/openai";
import { extraCategories, topCategories } from "@/lib/categoryMap";

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
  /** Our category tile id (dining, super, …). */
  categoryId: string | null;
  /** Legacy coarse hint kept for fallback mapping. */
  categoryHint: string | null;
  /** Matched fund id from the options we sent, if any. */
  fundId: string | null;
  confidence: "high" | "medium" | "low";
  rawNotes: string | null;
  /** Present when includeLineItems was requested (grocery trial). */
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

function toDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10);
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

function normalizeCategoryId(raw: unknown): string | null {
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
    lines.push({
      name,
      quantity: toNumber(o.quantity ?? o.qty ?? o.cant),
      unitPrice: toNumber(
        o.unitPrice ?? o.unit_price ?? o.price ?? o.precio ?? o.importe_unitario
      ),
      lineTotal: toNumber(
        o.lineTotal ?? o.line_total ?? o.importe ?? o.amount ?? o.total
      ),
    });
    if (lines.length >= 80) break;
  }
  return lines;
}

export async function parseReceiptImage(input: {
  mimeType: string;
  base64: string;
  localeHint?: string;
  funds?: ReceiptFundOption[];
  /** Superadmin grocery trial: also extract product lines. */
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
  const includeLineItems = Boolean(input.includeLineItems);
  const fundsBlock =
    funds.length > 0
      ? funds.map((f) => `${f.id}=${f.name}`).join(", ")
      : "(ninguno)";
  const categoriesBlock = CATEGORY_CATALOG.map(
    (c) => `${c.id}=${c.label}`
  ).join(", ");

  const linesBlock = includeLineItems
    ? `
  "lines": [
    { "name": "producto", "quantity": 1, "unitPrice": 1.15, "lineTotal": 1.15 }
  ]`
    : "";

  const linesRules = includeLineItems
    ? `
- "lines": OBLIGATORIO cuando el documento es un ticket/factura de supermercado (Alcampo, Mercadona, Carrefour, etc.).
  Lista TODOS los productos visibles (máx ~60) con name, quantity si aparece, unitPrice y/o lineTotal.
  Omite solo: totales, IVA/impuestos, cambio, redondeo y cabeceras. No inventes productos que no se lean.
  Si el ticket tiene desglose y no lo extraes, está mal. Solo lines = [] si realmente no hay líneas de producto.`
    : "";

  const prompt = `Eres un extractor de datos de tickets, facturas electrónicas (PDF rasterizado), vouchers o tickets en foto para SinDescuadre (finanzas en pareja/familia).
Idioma del documento: ${locale}.
Puede ser una o varias páginas unidas en vertical (factura electrónica).

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
- "itemCount": nº aproximado de líneas de producto (1 = un solo producto/servicio; >1 = varios).
- "primaryProduct": si itemCount es 1, el nombre del producto/servicio; si hay muchos, null.
- "description":
  - si itemCount === 1 → el producto (primaryProduct)
  - si itemCount > 1 → el nombre del establecimiento (merchant)
- "fundId": el bolsillo cuyo nombre mejor encaja (ej. restaurante→bolsillo Comida/Restaurantes; supermercado→Super/Compras). Solo ids de la lista.
- "categoryId": icono/categoría del gasto (dining, super, transport, …).
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
    categoryId: normalizeCategoryId(parsed.categoryId),
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
