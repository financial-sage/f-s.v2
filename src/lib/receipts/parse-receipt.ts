import {
  getOpenAIClient,
  getOpenAIModel,
  isOpenAIConfigured,
  parseJsonObject,
} from "@/lib/ai/openai";

export type ParsedReceipt = {
  merchant: string | null;
  description: string | null;
  total: number | null;
  currency: string | null;
  date: string | null; // YYYY-MM-DD
  categoryHint: string | null;
  confidence: "high" | "medium" | "low";
  rawNotes: string | null;
};

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

/**
 * Parse a receipt / voucher image with OpenAI Vision.
 * Returns structured fields for the expense form; never invents a total if unclear.
 */
export async function parseReceiptImage(input: {
  mimeType: string;
  base64: string;
  localeHint?: string;
}): Promise<ParsedReceipt> {
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI no configurado (falta OPENAI_API_KEY).");
  }

  const openai = getOpenAIClient();
  const model = getOpenAIModel();
  const locale =
    input.localeHint?.trim() ||
    "español; puede ser ticket de España o Latinoamérica";

  const prompt = `Eres un extractor de datos de tickets, facturas o vouchers para una app de finanzas personales (SinDescuadre).
Idioma del ticket: ${locale}.

Lee la imagen y devuelve SOLO JSON válido con esta forma:
{
  "merchant": "nombre del comercio o null",
  "description": "concepto corto del gasto (máx 80 caracteres) o null",
  "total": 12.34,
  "currency": "EUR|COP|USD|null",
  "date": "YYYY-MM-DD o null",
  "categoryHint": "food|transport|home|health|leisure|shopping|other|null",
  "confidence": "high|medium|low",
  "rawNotes": "duda breve si la hubo, o null"
}

Reglas:
- "total" debe ser el importe FINAL a pagar (incluidos impuestos si ya están en el total). Si no estás seguro, usa null.
- No inventes importes ni fechas.
- "description" útil para el usuario (ej. "Compra Mercadona", "Taxi", "Cena restaurante X").
- Si hay varios totales, prioriza el total cobrado / importe a pagar.`;

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

  return {
    merchant:
      typeof parsed.merchant === "string" && parsed.merchant.trim()
        ? parsed.merchant.trim()
        : null,
    description:
      typeof parsed.description === "string" && parsed.description.trim()
        ? parsed.description.trim().slice(0, 80)
        : null,
    total: toNumber(parsed.total),
    currency:
      typeof parsed.currency === "string" && parsed.currency.trim()
        ? parsed.currency.trim().toUpperCase()
        : null,
    date: toDate(parsed.date),
    categoryHint:
      typeof parsed.categoryHint === "string" && parsed.categoryHint.trim()
        ? parsed.categoryHint.trim()
        : null,
    confidence,
    rawNotes:
      typeof parsed.rawNotes === "string" && parsed.rawNotes.trim()
        ? parsed.rawNotes.trim()
        : null,
  };
}
