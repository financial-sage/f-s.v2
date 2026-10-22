import {
  getOpenAIClient,
  getOpenAIModel,
  isOpenAIConfigured,
  parseJsonObject,
} from "@/lib/ai/openai";
import { extraCategories, topCategories } from "@/lib/categoryMap";

const SUGGESTIBLE = [...topCategories, ...extraCategories].map((c) => ({
  id: c.id,
  label: c.label,
}));

const VALID_IDS = new Set(SUGGESTIBLE.map((c) => c.id));

export const DEFAULT_CATEGORY_ID = "misc";

/** Map pocket/fund name → best-effort category when AI has no match. */
export function categoryIdFromFundName(fundName?: string | null): string {
  const raw = (fundName ?? "").trim().toLowerCase();
  if (!raw) return DEFAULT_CATEGORY_ID;

  const rules: { re: RegExp; id: string }[] = [
    { re: /restaurant|comida|food|cena|almuerzo|merienda|bar|cafe|café/, id: "dining" },
    { re: /super|mercado|compra|grocery/, id: "super" },
    { re: /gasolina|combustible|fuel|parking/, id: "fuel" },
    { re: /uber|taxi|transporte|transp|bus|metro|tren/, id: "transport" },
    { re: /viaje|vacacion|viaje|avion|vuelo|hotel/, id: "travel" },
    { re: /hogar|casa|home|alquiler|renta|hipoteca/, id: "home" },
    { re: /luz|energia|electric/, id: "energy" },
    { re: /agua|water/, id: "water" },
    { re: /internet|wifi|fibra/, id: "wifi" },
    { re: /telefono|móvil|movil|phone|celular/, id: "phone" },
    { re: /salud|medico|médico|farmacia|doctor|hospital/, id: "health" },
    { re: /gym|gimnasio|deporte/, id: "gym" },
    { re: /ropa|moda|clothes/, id: "clothes" },
    { re: /cine|netflix|ocio|entreten/, id: "cinema" },
    { re: /juego|game|playstation|xbox/, id: "game" },
    { re: /musica|spotify|music/, id: "music" },
    { re: /educaci|edu|curso|universidad|colegio/, id: "edu" },
    { re: /regalo|gift/, id: "gifts" },
    { re: /mascota|perro|gato|pet/, id: "pets" },
    { re: /bebe|bebé|niñ|kids|hijo/, id: "kids" },
    { re: /trabajo|oficina|work/, id: "work" },
    { re: /fiesta|party|cumple/, id: "party" },
    { re: /belleza|peluquer|spa/, id: "beauty" },
    { re: /libro|book/, id: "books" },
    { re: /bici|bike/, id: "bike" },
    { re: /lujo|luxury/, id: "luxury" },
    { re: /ahorro|saving/, id: "misc" },
    { re: /fijo|fixed/, id: "home" },
  ];

  for (const rule of rules) {
    if (rule.re.test(raw)) return rule.id;
  }
  return DEFAULT_CATEGORY_ID;
}

function normalizeCategoryId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim().toLowerCase();
  if (VALID_IDS.has(id)) return id;
  // Tolerate legacy value aliases.
  if (id === "food") return "dining";
  if (id === "shopping") return "super";
  if (id === "other") return "misc";
  return null;
}

export type SuggestCategoryResult = {
  categoryId: string;
  source: "openai" | "fund" | "default";
};

/**
 * Suggest a category tile id from the expense concept.
 * Falls back to fund-name heuristics, then misc.
 */
export async function suggestCategoryForConcept(input: {
  concept: string;
  fundName?: string | null;
}): Promise<SuggestCategoryResult> {
  const concept = input.concept.trim();
  const fundFallback = categoryIdFromFundName(input.fundName);

  if (concept.length < 2) {
    return {
      categoryId: fundFallback,
      source: fundFallback === DEFAULT_CATEGORY_ID ? "default" : "fund",
    };
  }

  if (!isOpenAIConfigured()) {
    return {
      categoryId: fundFallback,
      source: fundFallback === DEFAULT_CATEGORY_ID ? "default" : "fund",
    };
  }

  try {
    const openai = getOpenAIClient();
    const model = getOpenAIModel();
    const catalog = SUGGESTIBLE.map((c) => `${c.id}=${c.label}`).join(", ");

    const response = await openai.chat.completions.create({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Eres un clasificador de gastos. Devuelves SOLO JSON {\"categoryId\":\"…\",\"confidence\":\"high|medium|low\"}. categoryId debe ser uno de la lista. Si no encaja con claridad, usa confidence low.",
        },
        {
          role: "user",
          content: `Concepto del gasto: "${concept}"
Bolsillo (pista secundaria): "${input.fundName?.trim() || "ninguno"}"
Categorías permitidas: ${catalog}

Elige la categoría cuyo icono/etiqueta mejor represente el concepto.`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";
    const parsed = parseJsonObject(text);
    const categoryId = normalizeCategoryId(parsed?.categoryId);
    const confidence = String(parsed?.confidence ?? "low").toLowerCase();

    if (categoryId && (confidence === "high" || confidence === "medium")) {
      return { categoryId, source: "openai" };
    }

    // Low confidence or invalid → fund fallback.
    return {
      categoryId: fundFallback,
      source: fundFallback === DEFAULT_CATEGORY_ID ? "default" : "fund",
    };
  } catch (err) {
    console.warn(
      "[categories/suggest] OpenAI failed",
      err instanceof Error ? err.message : err
    );
    return {
      categoryId: fundFallback,
      source: fundFallback === DEFAULT_CATEGORY_ID ? "default" : "fund",
    };
  }
}
