import { readFileSync } from "fs";
import { GoogleGenAI } from "@google/genai";

function loadEnvLocal() {
  const raw = readFileSync(".env.local", "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const i = trimmed.indexOf("=");
    const key = trimmed.slice(0, i).trim();
    let value = trimmed.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const env = loadEnvLocal();
const apiKey = (env.GEMINI_API_KEY || "").trim();
const model = (env.GEMINI_MODEL || "gemini-3.8-flash").trim();

console.log(
  JSON.stringify(
    { hasKey: Boolean(apiKey), keyLen: apiKey.length, model },
    null,
    2
  )
);

if (!apiKey) {
  console.error("Falta GEMINI_API_KEY en .env.local");
  process.exit(2);
}

const ai = new GoogleGenAI({ apiKey });
const response = await ai.models.generateContent({
  model,
  contents: "Responde solo con la palabra OK.",
});
const text = (response.text || "").trim();
console.log(
  JSON.stringify({ ok: /ok/i.test(text), preview: text.slice(0, 120) }, null, 2)
);
