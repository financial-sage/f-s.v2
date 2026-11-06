"use server";

import {
  getOpenAIClient,
  getOpenAIModel,
  isOpenAIConfigured,
  parseJsonObject,
} from "@/lib/ai/openai";

export type ScanReceiptCategory = {
  id: string;
  name: string;
};

export type ScanReceiptResult = {
  importe: number;
  concepto: string;
  categoryId: string | null;
  categoryName: string | null;
  /**
   * When no catalog match: short suggested budget/category name
   * (e.g. "Supermercado") so the UI can offer to create it.
   */
  suggestedCategoryName: string | null;
};

const OPENAI_TIMEOUT_MS = 45_000;
/** Matches client `prepareReceiptImage` upload cap (avoids gateway resets). */
const MAX_BYTES = 2 * 1024 * 1024;

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

function resolveCategory(
  parsed: Record<string, unknown>,
  catalog: ScanReceiptCategory[],
): { categoryId: string; categoryName: string } | null {
  if (catalog.length === 0) return null;
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const byName = new Map(
    catalog.map((c) => [c.name.trim().toLowerCase(), c]),
  );

  const rawId = String(parsed.categoryId ?? "").trim();
  const rawName = String(
    parsed.categoryName ?? parsed.conceptoCategoria ?? "",
  ).trim();

  const match =
    (rawId && byId.get(rawId)) ||
    (rawName && byName.get(rawName.toLowerCase())) ||
    null;

  if (!match) return null;
  return { categoryId: match.id, categoryName: match.name };
}

/**
 * Lee un ticket/factura con Vision (gpt-4o-mini) y extrae importe + concepto + categoría.
 */
export async function scanReceiptWithAI(
  formData: FormData,
  categoriasDisponibles: ScanReceiptCategory[],
): Promise<ScanReceiptResult> {
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI no está configurado en el servidor.");
  }

  const file = formData.get("image") ?? formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    throw new Error("No se recibió ninguna imagen del ticket.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("La imagen es demasiado grande (máx. 8 MB).");
  }

  const mimeType = (file.type || "image/jpeg").trim() || "image/jpeg";
  if (!/^image\//i.test(mimeType)) {
    throw new Error("El archivo debe ser una imagen.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const categorias = (categoriasDisponibles ?? []).filter(
    (c) => c?.id && c?.name,
  );
  const catalogLines =
    categorias.length > 0
      ? categorias.map((c) => `- ${c.id} · ${c.name}`).join("\n")
      : "(sin categorías)";

  const systemPrompt = `Eres un sistema OCR especializado en tickets de compra. Analiza la imagen suministrada y extrae los datos principales.

REGLAS DE EXTRACCIÓN CRÍTICAS:
1. IMPORTE TOTAL: Busca el valor cobrado en efectivo/tarjeta o el total de la compra (ej. 'TOT', 'TARJETA', 'TOTAL'). IGNORA por completo bloques de fidelidad, puntos o saldos de tarjetas club (ej. 'Saldo disponible', 'Saldo total del club', 'Puntos acumulados', 'Saldo total').
2. FORMATO NUMÉRICO: Convierte precios con comas a punto decimal y añade el cero faltante si empieza por coma (ej. ',61' -> 0.61).
3. COMERCIO/CONCEPTO: Extrae el nombre del establecimiento (ej. 'Alcampo Ferrol'). Limpia cualquier entidad HTML como '&aacute;'. Concepto máximo 80 caracteres.
4. CATEGORÍA: Elige UNA de estas categorías disponibles (categoryId = id exacto de la lista, o null si ninguna encaja bien):
${catalogLines}

REGLAS DE CATEGORIZACIÓN (obligatorias):
- Distingue SUPERMERCADO vs RESTAURANTE/CAFÉ.
- SUPERMERCADO / HIPERMERCADO / MERCADO / TIENDA DE ALIMENTACIÓN (Alcampo, Mercadona, Carrefour, Lidl, Día, Auchan, Walmart, Éxito, Jumbo, etc., o tickets con muchas líneas de productos, kilos, IVA de alimentación, club de fidelidad): NUNCA uses categorías de restaurante, bar, café, comida fuera o delivery.
  Prefiere nombres que contengan: supermercado, super, mercado, compras, alimentación, despensa, hogar, grocery, shopping, comida casa.
- RESTAURANTE / BAR / CAFÉ / COMIDA PARA LLEVAR / DELIVERY: solo si el ticket es claramente de hostelería (mesa, cubiertos, menú del día, propina, pocos platos/bebidas).
- Si el comercio es supermercado y en la lista NO hay una categoría de supermercado/compras/alimentación, devuelve categoryId = null. NO inventes un "casi" (p. ej. no pongas Restaurantes).
- Si hay varias posibles, elige la más específica; si duda razonable → null.
- Si categoryId es null, rellena suggestedCategoryName con un nombre corto de presupuesto a crear (máx. 24 caracteres), p. ej. "Supermercado", "Transporte", "Farmacia", "Hogar". Si categoryId tiene valor, suggestedCategoryName = null.

Devuelve exclusivamente un objeto JSON estricto: { "importe": number, "concepto": string, "categoryId": string | null, "suggestedCategoryName": string | null }.
No inventes importes ni ids. Si no estás seguro del total, usa null en importe.`;

  try {
    const openai = getOpenAIClient();
    const model = getOpenAIModel();

    const response = await openai.chat.completions.create(
      {
        model,
        temperature: 0,
        max_tokens: 300,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Lee el ticket de la imagen y responde solo con el JSON pedido.",
              },
              {
                type: "image_url",
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
      },
      {
        signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
      },
    );

    const text = response.choices[0]?.message?.content ?? "";
    const parsed = parseJsonObject(text);
    if (!parsed) {
      throw new Error("La IA no devolvió JSON válido.");
    }

    const importe =
      toNumber(parsed.importe) ??
      toNumber(parsed.total) ??
      toNumber(parsed.amount);
    if (importe == null || !(importe > 0)) {
      throw new Error("No se pudo leer el importe del ticket.");
    }

    const concepto = String(
      parsed.concepto ?? parsed.merchant ?? parsed.description ?? "",
    )
      .trim()
      .slice(0, 80);

    const category = resolveCategory(parsed, categorias);
    const rawSuggestion = String(parsed.suggestedCategoryName ?? "")
      .trim()
      .replace(/&aacute;/gi, "á")
      .replace(/&eacute;/gi, "é")
      .replace(/&iacute;/gi, "í")
      .replace(/&oacute;/gi, "ó")
      .replace(/&uacute;/gi, "ú")
      .replace(/&ntilde;/gi, "ñ")
      .slice(0, 24);

    return {
      importe,
      concepto: concepto || "Ticket",
      categoryId: category?.categoryId ?? null,
      categoryName: category?.categoryName ?? null,
      suggestedCategoryName:
        category != null
          ? null
          : rawSuggestion || null,
    };
  } catch (err) {
    if (err instanceof Error && /abort|timeout/i.test(err.message)) {
      throw new Error("La lectura del ticket tardó demasiado.");
    }
    if (err instanceof Error) throw err;
    throw new Error("No se pudo leer el ticket.");
  }
}
