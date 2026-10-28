# Recommendations — Technical Spec

Complementa: [README](./README.md), [business-rules.md](./business-rules.md), [user-flow.md](./user-flow.md), [ADR-0009](../../../decisions/ADR-0009-persistent-recommendations-ai.md).

---

# Decisiones técnicas (cerradas)

| Tema | Decisión |
|------|----------|
| Candidatas | Reglas TypeScript puras sobre snapshot / agregados |
| Redacción | LLM acotado: input = hechos estructurados; output = copy CARE validado |
| Persistencia | Tabla(s) nuevas (recomendaciones + eventos de interacción) |
| Ruta UI | `/recommendations` (lista + detalle +, en fases 2–3, balances) |
| Aviso Inicio | Pastilla CFO → modal (ADR-0011); no dentro de `Dashboard*` scroll |
| Guidance | Sin cambios de contrato; puede enlazarse por CTA |
| Chat | Ningún endpoint de conversación en este feature |
| Tope activos V1 | Máx. **3** recomendaciones activas por hogar (prioridad) |

---

# Modelo de datos (orientativo Fase 1)

```ts
type RecommendationStatus =
  | "new"
  | "seen"
  | "accepted"
  | "deferred"
  | "dismissed"
  | "resolved";

type RecommendationPriority =
  | "critical"
  | "important"
  | "opportunity"
  | "educational";

interface RecommendationRecord {
  id: string;
  family_id: string;
  member_id: string | null; // null = hogar
  rule_id: string; // candidata determinista
  priority: RecommendationPriority;
  status: RecommendationStatus;
  /** Hechos inyectados al LLM / mostrados en UI (JSON tipado). */
  facts: Record<string, unknown>;
  title: string;
  body: string;
  why: string[];
  impact: string | null;
  cta_href: string | null;
  cta_label: string | null;
  defer_until: string | null; // ISO
  created_at: string;
  updated_at: string;
}
```

Migración concreta y RLS: definir en el slice de implementación (familia vía membership; sin fugas cross-family).

---

# API de lib (nombres objetivo)

## `buildRecommendationContext(input)`

Snapshot + agregados necesarios para reglas (reutiliza decision context / ledger / savings donde baste).

## `selectRecommendationCandidates(ctx): Candidate[]`

Pura. Orden de prioridad documentado en business-rules / este spec. Incluye reglas de **ahorro** cuando apliquen.

## `renderRecommendationCopy(candidate, facts): Promise<Copy>`

Llama al proveedor LLM con hechos; fallback a plantilla si el proveedor falla o no está configurado.

## `persistRecommendations(...)` / acciones de estado

`markSeen`, `accept`, `defer`, `dismiss`.

## Fases 2–3

- `buildMonthBalance(familyId, yearMonth)`
- `buildPeriodBalance(familyId, from, to)`
- `renderBalanceNarrative(aggregates): Promise<Narrative>`

---

# Reglas candidatas iniciales (Fase 1 — borrador)

Evaluar en orden; no spamear si hay dismiss/defer reciente para el mismo `rule_id`:

0. **Bienvenida (`welcome_panel`):** si `ledgerMovementCount === 0` y sin gasto del mes → única candidata; copy IA orientativo (qué es el panel, qué esperar). Una sola emisión por hogar.
1. Liquidez / cuenta en rojo, o en 0 **con** historial de movimientos → priorizar estabilidad (CTA cuentas / historial). Liquidez 0 sin historial **no** dispara esta regla.
2. Margen positivo recurrente sin aportes a ahorro → **recomendar ahorrar** (CTA flujo ahorro / bolsillo ahorro).
3. Ritmo de gasto alto vs mes en curso / bolsillos tensos → revisar gastos (CTA historial).
4. Oportunidad educativa breve si hay datos pero poca organización (cuentas/bolsillos).

Lista exacta se congela en el slice de implementación con tests sobre fixtures.

---

# Integración LLM

- Entrada: JSON de hechos + `rule_id` + locale `es`.
- Salida: `{ title, body, why[], impact }` — **rechazar** si aparecen números no presentes en `facts`.
- Sin tool-calling a la DB. Sin memoria de chat.
- Secretos solo server-side; route handler o server action.

---

# Slices de implementación

## Slice A — Fundaciones docs + harness

- Pack + ADR-0009 (este pack).
- Skill + rule + `AGENTS.md`.

## Slice B — Persistencia + reglas + plantillas

- Migración + RLS.
- `selectRecommendationCandidates` + persistencia.
- UI `/recommendations` con copy de plantilla (sin LLM aún si se prefiere vertical slice).

## Slice C — IA redacción + aviso suave

- `renderRecommendationCopy`.
- Aviso suave en layout PWA / dashboard shell (fuera del scroll).
- Acciones accept / defer / dismiss.

## Slice D — Balance mes (Fase 2)

- Agregados mes vs mes anterior + narrativa.

## Slice E — Balance periodo (Fase 3)

- Selector 3 / 6 / 12 + informe bajo demanda.

---

# Archivos previstos (Fase 1)

- `docs/product/features/recommendations/**`
- `docs/decisions/ADR-0009-persistent-recommendations-ai.md`
- `.cursor/skills/recommendations-module/**`
- `.cursor/rules/recommendations-module.mdc`
- `AGENTS.md`
- `src/lib/recommendations/**` (contexto, rules, copy, persist)
- `src/app/(pwa)/recommendations/page.tsx`
- `src/components/RecommendationsSoftNotice.tsx` (nombre orientativo)
- Migración Supabase `recommendation*` / equivalente

---

# Fuera de alcance

- Chat / AI Assistant.
- LLM elige candidatas (opción B).
- Cards en scroll del dashboard.
- Ejecución autónoma de movimientos.
- Simulador libre “qué pasaría si…”.
