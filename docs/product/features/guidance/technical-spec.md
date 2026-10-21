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
  monthSpent: number;
  fundsCount: number;
  memberCount: number;
  isCoupleUi: boolean;
}

export interface GuidanceInsight {
  id: string;
  title: string;
  body: string;
  why: string[];
  confidence: InsightConfidence;
  cta?: { href: string; label: string };
}
```

---

# API de lib

## `buildDecisionContext(input): DecisionContext`

Construye el snapshot desde campos ya disponibles en home (o loader de `/guidance`). No hace I/O.

## `selectPrimaryInsight(ctx: DecisionContext): GuidanceInsight`

Aplica business-rules §19–23. Pura y testeable.

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

## Slice D — Ajuste de reglas

- Casos: solo, pareja, sin cuentas, con cuentas, sin gastos.
- Copy alineado a `docs/product/foundations/05-product-language.md`.

---

# Archivos tocados (lista cerrada V1)

- `docs/product/features/guidance/**`
- `docs/decisions/ADR-0008-contextual-guidance-v1.md`
- `.cursor/skills/guidance-module/**`
- `.cursor/rules/guidance-module.mdc`
- `AGENTS.md`
- `src/lib/decision/context.ts`
- `src/lib/decision/insights.ts`
- `src/components/GuidanceWhyModal.tsx`
- `src/components/DashboardSolo.tsx` (microenlace + estado modal)
- `src/components/DashboardCouple.tsx` (ídem)
- `src/app/(pwa)/guidance/page.tsx`
- `src/app/(pwa)/profile/page.tsx` (link)
- Opcional: helper en `src/lib/dashboard.ts` si se prefiere insight en SSR

---

# Fuera de alcance V1

- Tablas `recommendations`, historial de insights, A/B.
- Integración OpenAI / Anthropic / streaming.
- Cambios a BottomNav o nuevo tile en `dash-modules`.
- Carga de fixed-expenses solo para Guidance (usar CTA a `/fixed-expenses` sin agregar al snapshot hasta slice futuro).
