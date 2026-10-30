import {
  getOpenAIClient,
  getOpenAIModel,
  isOpenAIConfigured,
  parseJsonObject,
} from "@/lib/ai/openai";
import {
  formatFamilyCategoryCatalog,
  matchFamilyCategoryId,
  type FamilyCategoryOption,
} from "@/lib/categories/matchFamilyCategory";
import { categoryIdFromFundName } from "@/lib/categories/legacyFundHeuristic";

export type SuggestCategoryResult = {
  categoryId: string | null;
  source: "openai" | "heuristic" | "fund" | "default";
};

/**
 * Suggest a family_categories id (parent or subcategory) from the expense concept.
 */
export async function suggestCategoryForConcept(input: {
  concept: string;
  fundName?: string | null;
  categories: FamilyCategoryOption[];
}): Promise<SuggestCategoryResult> {
  const concept = input.concept.trim();
  const categories = input.categories ?? [];

  if (categories.length === 0) {
    return { categoryId: null, source: "default" };
  }

  if (concept.length < 2) {
    const fromFund = matchFamilyCategoryId({
      categories,
      legacyTileId: categoryIdFromFundName(input.fundName),
      concept: input.fundName,
    });
    return {
      categoryId: fromFund,
      source: fromFund ? "fund" : "default",
    };
  }

  const heuristic = matchFamilyCategoryId({
    categories,
    concept,
    legacyTileId: categoryIdFromFundName(input.fundName),
  });

  if (!isOpenAIConfigured()) {
    return {
      categoryId: heuristic,
      source: heuristic ? "heuristic" : "default",
    };
  }

  try {
    const openai = getOpenAIClient();
    const model = getOpenAIModel();
    const catalog = formatFamilyCategoryCatalog(categories);

    const response = await openai.chat.completions.create({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Eres un clasificador de gastos familiares. Devuelves SOLO JSON {"categoryId":"uuid|null","confidence":"high|medium|low"}. categoryId debe ser un id exacto de la lista (preferir subcategoría si encaja; si no, el padre). Si no encaja, categoryId null y confidence low.',
        },
        {
          role: "user",
          content: `Concepto del gasto: "${concept}"
Bolsillo (pista secundaria): "${input.fundName?.trim() || "ninguno"}"

Categorías de la familia (elige UNA):
${catalog}

Reglas:
- Prefiere la subcategoría más específica si el concepto la sugiere.
- Si solo encaja el área general, elige la categoría padre.
- No inventes ids.`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";
    const parsed = parseJsonObject(text);
    const rawId =
      typeof parsed?.categoryId === "string" ? parsed.categoryId.trim() : "";
    const confidence = String(parsed?.confidence ?? "low").toLowerCase();
    const valid = categories.some((c) => c.id === rawId);

    if (valid && (confidence === "high" || confidence === "medium")) {
      return { categoryId: rawId, source: "openai" };
    }

    if (valid && confidence === "low" && !heuristic) {
      return { categoryId: rawId, source: "openai" };
    }

    return {
      categoryId: heuristic,
      source: heuristic ? "heuristic" : "default",
    };
  } catch (err) {
    console.warn(
      "[categories/suggest] OpenAI failed",
      err instanceof Error ? err.message : err
    );
    return {
      categoryId: heuristic,
      source: heuristic ? "heuristic" : "default",
    };
  }
}

/** Re-export fund heuristic used by match fallbacks. */
export { categoryIdFromFundName } from "@/lib/categories/legacyFundHeuristic";
