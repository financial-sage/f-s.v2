import {
  getOpenAIClient,
  getOpenAIModel,
  isOpenAIConfigured,
  parseJsonObject,
} from "@/lib/ai/openai";
import type { RecommendationSpeech } from "./locale";
import type { RecommendationCandidate, RecommendationCopy } from "./types";
import { copyRespectsFacts } from "./validate-copy";

export { isOpenAIConfigured as isLlmConfigured };

export type LlmDraftResult =
  | { ok: true; copy: RecommendationCopy }
  | { ok: false; error: string };

/**
 * Draft CARE copy with OpenAI. Returns structured ok/error for callers
 * (and superadmin tools) to surface failures.
 */
export async function draftCopyWithLlm(
  candidate: RecommendationCandidate,
  speech?: RecommendationSpeech
): Promise<LlmDraftResult> {
  if (!isOpenAIConfigured()) {
    const error = "OPENAI_API_KEY no está configurada en el servidor";
    console.warn("[recommendations/llm]", error);
    return { ok: false, error };
  }

  const localeBlock =
    speech?.promptLocaleBlock ??
    `Variedad: español de España (es-ES). Trato vosotros/tú. Moneda €.`;
  const moneyHint = speech
    ? `Si mencionas un importe, usa exactamente un valor de los hechos y el símbolo ${speech.meta.symbol} (${speech.meta.code}).`
    : "Si mencionas un importe, usa exactamente un valor de los hechos con su símbolo de moneda.";

  const model = getOpenAIModel();
  const kind = candidate.kind ?? "recommendation";
  const ruleBrief =
    candidate.ruleId === "welcome_panel"
      ? `Esta es la PRIMERA nota de bienvenida (perfil recién creado, sin movimientos).
Explica para qué sirven estas notas: avisos, empujones, logros y sugerencias anclados a hechos reales, sin chat y sin inventar urgencias.
Cuenta qué puede esperar en las próximas semanas. Hoy solo da la bienvenida y calma.
No critiques saldos a cero. tone: cálido, breve, educativo. No inventes importes.`
      : kind === "celebration"
        ? `Redacta una CELEBRACIÓN breve de un hito real. Tono alegre pero sobrio (sin emojis excesivos ni dramatismo). No pidas acción urgente.`
        : kind === "summary"
          ? `Redacta un RESUMEN narrativo corto del periodo (pulso). Explica qué está pasando con claridad; una sola pista de siguiente paso al final.`
          : kind === "nudge"
            ? `Redacta un EMPUJÓN suave (nudge): conecta el hecho con un ajuste pequeño posible. Sin culpa ni alarmismo.`
            : kind === "alert"
              ? `Redacta un AVISO temprano con contexto y una acción posible. Calma primero; nada de panico ni lenguaje de crisis.`
              : `Redacta UNA recomendación accionable sobre la situación actual.`;

  try {
    const openai = getOpenAIClient();
    const prompt = `Eres el acompañante silencioso de SinDescuadre (finanzas en pareja/familia). Tono CARE: claridad, acción, tranquilidad, sin culpa ni alarmismo. Hablas solo cuando hay algo valioso que decir. Nunca te presentes como “CFO” ni uses jerga corporativa.

${localeBlock}

Tipo de nota (kind): ${kind}
Regla de candidata: ${candidate.ruleId}
Prioridad: ${candidate.priority}
${ruleBrief}
Hechos (ÚNICOS números monetarios permitidos; no inventes otros importes):
${JSON.stringify(candidate.facts, null, 2)}

Devuelve SOLO JSON válido con esta forma:
{"title":"…","body":"…","why":["…","…"],"impact":"…"}

title: máximo ~60 caracteres.
body: 2-3 frases${
      candidate.ruleId === "welcome_panel"
        ? " de bienvenida y orientación (no una alarma)"
        : kind === "celebration"
          ? " de reconocimiento del logro"
          : kind === "summary"
            ? " de narrativa del periodo"
            : ", con contexto y siguiente paso posible"
    }.
why: 1-3 bullets que citan hechos (sin inventar cifras).
impact: 1 frase sobre el beneficio de ${
      candidate.ruleId === "welcome_panel"
        ? "usar estas notas con el tiempo"
        : kind === "celebration"
          ? "reconocer el progreso"
          : "actuar o entender"
    }.
No uses markdown. ${moneyHint}`;

    const response = await openai.chat.completions.create({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Respondes solo con JSON válido. No inventas importes fuera de los hechos.",
        },
        { role: "user", content: prompt },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";
    if (!text.trim()) {
      const error = `Respuesta vacía del modelo (${model}) para ${candidate.ruleId}`;
      console.warn("[recommendations/llm]", error);
      return { ok: false, error };
    }

    const parsed = parseJsonObject(text);
    if (!parsed) {
      const error = `JSON inválido (${model}/${candidate.ruleId}): ${text.slice(0, 180)}`;
      console.warn("[recommendations/llm]", error);
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
      console.warn("[recommendations/llm]", error);
      return { ok: false, error };
    }

    const draft = { title, body, why, impact };
    if (!copyRespectsFacts(draft, candidate.facts)) {
      console.warn(
        "[recommendations/llm] money amounts not in facts (accepted anyway)",
        { ruleId: candidate.ruleId, draft, facts: candidate.facts }
      );
    }

    return {
      ok: true,
      copy: { ...draft, source: "openai" },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const error = `Llamada OpenAI falló (${model}/${candidate.ruleId}): ${message}`;
    console.error("[recommendations/llm]", error);
    return { ok: false, error };
  }
}

/** @deprecated Use draftCopyWithLlm */
export const draftCopyWithGemini = draftCopyWithLlm;
/** @deprecated Use isLlmConfigured */
export const isGeminiConfigured = isOpenAIConfigured;
