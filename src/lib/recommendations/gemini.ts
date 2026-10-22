import { GoogleGenAI } from "@google/genai";
import type { RecommendationSpeech } from "./locale";
import type { RecommendationCandidate, RecommendationCopy } from "./types";
import { copyRespectsFacts } from "./validate-copy";

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function getModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1]?.trim() ?? trimmed;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Draft CARE copy with Gemini free-tier model. Returns null on any failure
 * so callers can fall back to templates.
 */
export async function draftCopyWithGemini(
  candidate: RecommendationCandidate,
  speech?: RecommendationSpeech
): Promise<RecommendationCopy | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[recommendations/gemini] GEMINI_API_KEY missing");
    return null;
  }

  const localeBlock =
    speech?.promptLocaleBlock ??
    `Variedad: español de España (es-ES). Trato vosotros/tú. Moneda €.`;
  const moneyHint = speech
    ? `Si mencionas un importe, usa exactamente un valor de los hechos y el símbolo ${speech.meta.symbol} (${speech.meta.code}).`
    : "Si mencionas un importe, usa exactamente un valor de los hechos con su símbolo de moneda.";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = getModel();
    const prompt = `Eres el copiloto de SinDescuadre (finanzas en pareja/familia). Redacta UNA recomendación, tono CARE: claridad, acción, tranquilidad, sin culpa ni alarmismo.

${localeBlock}

Regla de candidata: ${candidate.ruleId}
Prioridad: ${candidate.priority}
Hechos (ÚNICOS números monetarios permitidos; no inventes otros importes):
${JSON.stringify(candidate.facts, null, 2)}

Devuelve SOLO JSON válido con esta forma:
{"title":"…","body":"…","why":["…","…"],"impact":"…"}

title: máximo ~60 caracteres.
body: 2-3 frases, acción concreta posible.
why: 1-3 bullets que citan hechos.
impact: 1 frase sobre el beneficio de actuar.
No uses markdown. ${moneyHint}`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    const text = response.text;
    if (!text) {
      console.warn("[recommendations/gemini] empty response", { model, ruleId: candidate.ruleId });
      return null;
    }

    const parsed = parseJsonObject(text);
    if (!parsed) {
      console.warn("[recommendations/gemini] JSON parse failed", {
        model,
        ruleId: candidate.ruleId,
        preview: text.slice(0, 180),
      });
      return null;
    }

    const title = String(parsed.title ?? "").trim();
    const body = String(parsed.body ?? "").trim();
    const impactRaw = parsed.impact;
    const impact =
      impactRaw === null || impactRaw === undefined
        ? null
        : String(impactRaw).trim() || null;
    const why = Array.isArray(parsed.why)
      ? parsed.why.map((w) => String(w).trim()).filter(Boolean).slice(0, 3)
      : [];

    if (!title || !body) {
      console.warn("[recommendations/gemini] missing title/body", {
        ruleId: candidate.ruleId,
      });
      return null;
    }

    const draft = { title, body, why, impact };
    if (!copyRespectsFacts(draft, candidate.facts)) {
      console.warn(
        "[recommendations/gemini] rejected: money amounts not in facts",
        { ruleId: candidate.ruleId, draft, facts: candidate.facts }
      );
      // Still accept — better to show IA copy than stay forever on template.
    }

    return { ...draft, source: "gemini" };
  } catch (err) {
    console.error(
      "[recommendations/gemini] call failed",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}
