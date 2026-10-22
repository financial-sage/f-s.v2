# Guidance — Technical Spec

Complementa (no sustituye): [README](./README.md), [business-rules.md](./business-rules.md), [user-flow.md](./user-flow.md), [ADR-0008](../../../decisions/ADR-0008-contextual-guidance-v1.md).

---

# Decisiones técnicas (cerradas)

| Tema | Decisión |
|------|----------|
| Motor V1 | Funciones puras TypeScript; sin LLM |
| Persistencia | Ninguna tabla nueva en V1 |
| Contexto | `src/lib/decision/context.ts` |
| Insights | `src/lib/decision/insights.ts` |
| Modal | `src/components/GuidanceWhyModal.tsx` |
| Página | `src/app/(pwa)/guidance/page.tsx` |
| Entrada home | Microenlace en hero label Solo/Couple |
| Entrada perfil | Link en lista Preferencias → `/guidance` |
| Datos home | Reutilizar slices de `getHomePageData()` / `HomePageData` |
| BottomNav | Sin cambios |

---

# Tipos

```ts
export type InsightConfidence = "high" | "medium" | "low" | "unknown";

export interface DecisionContext {
  hasVisibleAccounts: boolean;
  accountsVisibleLiquidity: number;
  pocketOrHeroBalance: number;
  activePocketName: string | null;
  pockets: { name: string; balance: number }[];
  monthSpent: number;
  fundsCount: number;
  memberCount: number;
  isCoupleUi: boolean;
}

export interface GuidanceHighlight {
  label: string;
  value: string;
}

export interface GuidanceInsight {
  id: string;
  title: string;
  summary: string;
  highlights: GuidanceHighlight[];
  pageLead: string;
  confidence: InsightConfidence;
  cta?: { href: string; label: string };
}

export interface GuidanceRecommendation {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}
```

---

# API de lib

## `buildDecisionContext(input): DecisionContext`

Construye el snapshot desde campos ya disponibles en home (o loader de `/guidance`). No hace I/O.

## `selectPrimaryInsight(ctx: DecisionContext): GuidanceInsight`

Aplica business-rules §19–23. Pura y testeable.

## `selectPrimaryRecommendation(ctx: DecisionContext): GuidanceRecommendation | null`

Acción sugerida para `/guidance` (sin repetir el mapa de cifras).

---

# Slices de implementación

## Slice A — Fundaciones

- Pack docs + ADR-0008 (este pack).
- Skill + rule + `AGENTS.md`.
- `context.ts` + `insights.ts` con reglas mínimas.

## Slice B — UX sutil

- `GuidanceWhyModal` (espejo de `PremiumBenefitsModal`: Portal, backdrop, panel).
- Microenlace en `DashboardSolo` / `DashboardCouple` junto a “Saldo disponible” / label hero.
- Calcular insight en cliente desde props ya hidratadas **o** pasar insight desde server en page home sin cambiar layout.

## Slice C — Página y perfil

- `GET` page `/guidance` (auth + familia como otras rutas PWA).
- Link en `src/app/(pwa)/profile/page.tsx`.
- Reutilizar `buildDecisionContext` / `selectPrimaryInsight` con los mismos datos.

## Slice D — Ajuste de reglas — **hecho**

- Casos: solo, pareja, sin cuentas, con cuentas, sin gastos, multi-negativo, cuenta en 0.
- Copy alineado a CARE / product language.
- Mapa colapsable + recomendación en `/guidance`.

---

# Archivos tocados (lista cerrada V1)

- `docs/product/features/guidance/**`
- `docs/decisions/ADR-0008-contextual-guidance-v1.md`
- `.cursor/skills/guidance-module/**`
- `.cursor/rules/guidance-module.mdc`
- `AGENTS.md`
- `src/lib/decision/context.ts`
- `src/lib/decision/insights.ts`
- `src/lib/decision/spend.ts`
- `src/components/GuidanceWhyModal.tsx`
- `src/components/GuidanceWhyTrigger.tsx`
- `src/components/GuidanceMoneyMap.tsx`
- `src/components/DashboardSolo.tsx` (microenlace + estado modal)
- `src/components/DashboardCouple.tsx` (ídem)
- `src/app/(pwa)/guidance/page.tsx`
- `src/app/(pwa)/profile/page.tsx` (link)

---

# Fuera de alcance V1 (siguiente fase)

- Tablas `recommendations`, historial de insights, A/B.
- Integración OpenAI / Anthropic / streaming / chat (`features/ai-assistant`).
- Motor accept/defer persistente (`features/recommendations`).
- Cambios a BottomNav o nuevo tile en `dash-modules`.
