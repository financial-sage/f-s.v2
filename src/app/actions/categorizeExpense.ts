"use server";

import {
  getOpenAIClient,
  getOpenAIModel,
  isOpenAIConfigured,
  parseJsonObject,
} from "@/lib/ai/openai";

export type CategorizeExpenseCategory = {
  id: string;
  name: string;
};

export type CategorizeExpenseConfidence = "HIGH" | "MEDIUM" | "LOW";

export type CategorizeExpenseResult = {
  categoryId: string;
  categoryName: string;
  confidence: CategorizeExpenseConfidence;
  reason: string;
};

const OPENAI_TIMEOUT_MS = 12_000;

function normalizeConfidence(raw: unknown): CategorizeExpenseConfidence {
  const value = String(raw ?? "").trim().toUpperCase();
  if (value === "HIGH" || value === "MEDIUM" || value === "LOW") return value;
  return "LOW";
}

function resolveFromCatalog(
  parsed: Record<string, unknown>,
  catalog: CategorizeExpenseCategory[],
): CategorizeExpenseResult | null {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const byName = new Map(
    catalog.map((c) => [c.name.trim().toLowerCase(), c]),
  );

  const rawId = String(parsed.categoryId ?? "").trim();
  const rawName = String(parsed.categoryName ?? "").trim();

  const match =
    (rawId && byId.get(rawId)) ||
    (rawName && byName.get(rawName.toLowerCase())) ||
    null;

  if (!match) return null;

  return {
    categoryId: match.id,
    categoryName: match.name,
    confidence: normalizeConfidence(parsed.confidence),
    reason: String(parsed.reason ?? "").trim() || "Clasificación automática",
  };
}

/**
 * Clasifica un gasto con gpt-4o-mini entre las categorías del hogar.
 * La API key nunca sale del servidor.
 */
export async function categorizeExpenseWithAI(input: {
  concepto: string;
  importe: number;
  categoriasDisponibles: CategorizeExpenseCategory[];
}): Promise<CategorizeExpenseResult> {
  const concepto = String(input.concepto ?? "").trim() || "Sin concepto";
  const importe = Number(input.importe);
  const categorias = (input.categoriasDisponibles ?? []).filter(
    (c) => c?.id && c?.name,
  );

  if (!Number.isFinite(importe) || importe <= 0) {
    throw new Error("Importe inválido para clasificar.");
  }

  if (categorias.length === 0) {
    throw new Error("No hay categorías disponibles para clasificar.");
  }

  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI no está configurado en el servidor.");
  }

  const catalogLines = categorias
    .map((c) => `- ${c.id} · ${c.name}`)
    .join("\n");

  const systemPrompt = `Eres un asistente financiero. Clasifica el gasto basándote en el concepto y el importe. Categorías permitidas:
${catalogLines}
Debes devolver ÚNICAMENTE un JSON con esta estructura: { "categoryId": "ID_ELEGIDO", "categoryName": "NOMBRE", "confidence": "HIGH|MEDIUM|LOW", "reason": "Breve motivo" }.
Reglas: categoryId debe ser exactamente uno de los ids listados; categoryName debe coincidir con ese id; no inventes categorías.
Importante: supermercados/hipermercados (Alcampo, Mercadona, Carrefour, Lidl, Día, etc.) NO son restaurantes. Prefiere categorías de supermercado/compras/alimentación/despensa. Si no hay una adecuada, elige la menos mala y marca confidence LOW.`;

  const userPrompt = `Gasto: ${concepto}, Importe: ${importe}`;

  try {
    const openai = getOpenAIClient();
    const model = getOpenAIModel(); // default gpt-4o-mini

    const response = await openai.chat.completions.create(
      {
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
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

    const resolved = resolveFromCatalog(parsed, categorias);
    if (!resolved) {
      throw new Error("La categoría sugerida no está en tu lista.");
    }

    return resolved;
  } catch (err) {
    if (err instanceof Error && /abort|timeout/i.test(err.message)) {
      throw new Error("La clasificación tardó demasiado.");
    }
    if (err instanceof Error) throw err;
    throw new Error("No se pudo clasificar el gasto.");
  }
}
