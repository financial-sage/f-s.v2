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

export type GeminiDraftResult =
  | { ok: true; copy: RecommendationCopy }
  | { ok: false; error: string };

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
 * Draft CARE copy with Gemini free-tier model.
 * Returns structured ok/error so callers (and superadmin tools) can surface failures.
 */
export async function draftCopyWithGemini(
  candidate: RecommendationCandidate,
  speech?: RecommendationSpeech
): Promise<GeminiDraftResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const error = "GEMINI_API_KEY no está configurada en el servidor";
    console.warn("[recommendations/gemini]", error);
    return { ok: false, error };
  }

  const localeBlock =
    speech?.promptLocaleBlock ??
    `Variedad: español de España (es-ES). Trato vosotros/tú. Moneda €.`;
  const moneyHint = speech
    ? `Si mencionas un importe, usa exactamente un valor de los hechos y el símbolo ${speech.meta.symbol} (${speech.meta.code}).`
    : "Si mencionas un importe, usa exactamente un valor de los hechos con su símbolo de moneda.";

  const model = getModel();

  try {
    const ai = new GoogleGenAI({ apiKey });
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
      const error = `Respuesta vacía del modelo (${model}) para ${candidate.ruleId}`;
      console.warn("[recommendations/gemini]", error);
      return { ok: false, error };
    }

    const parsed = parseJsonObject(text);
    if (!parsed) {
      const error = `JSON inválido (${model}/${candidate.ruleId}): ${text.slice(0, 180)}`;
      console.warn("[recommendations/gemini]", error);
      return { ok: false, error };
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
      const error = `Falta title/body (${candidate.ruleId})`;
      console.warn("[recommendations/gemini]", error);
      return { ok: false, error };
    }

    const draft = { title, body, why, impact };
    if (!copyRespectsFacts(draft, candidate.facts)) {
      console.warn(
        "[recommendations/gemini] money amounts not in facts (accepted anyway)",
        { ruleId: candidate.ruleId, draft, facts: candidate.facts }
      );
    }

    return {
      ok: true,
      copy: { ...draft, source: "gemini" },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const error = `Llamada Gemini falló (${model}/${candidate.ruleId}): ${message}`;
    console.error("[recommendations/gemini]", error);
    return { ok: false, error };
  }
}
