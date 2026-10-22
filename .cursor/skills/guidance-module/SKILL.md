---
name: guidance-module
description: >-
  Implements Contextual Guidance V1 for SinDescuadre: deterministic CARE
  insights, ¿Por qué? modal, /guidance page, subtle home micro-link (no
  dashboard cards, no LLM). Use when the user asks for guidance, IA contextual,
  decision insights, ADR-0008, ¿Qué significa?, or src/lib/decision.
---

# Guidance module — agent harness

## When this skill applies

User wants to **build or change** Contextual Guidance / IA contextual V1 (not full chat assistant, not persistent recommendations engine).

## Mandatory first reads

Read in order (do not invent product rules):

1. `docs/product/features/guidance/README.md`
2. `docs/product/features/guidance/business-rules.md`
3. `docs/product/features/guidance/technical-spec.md`
4. `docs/product/features/guidance/user-flow.md`
5. `docs/decisions/ADR-0008-contextual-guidance-v1.md`

Philosophy reference: `docs/SinDescuadre-IA.md` (does not replace the pack).

For Next.js APIs in this repo, follow `AGENTS.md` / `node_modules/next/dist/docs/`.

## Implementation order

Follow **Slices A→D** in `technical-spec.md`. Locked names:

- Lib: `src/lib/decision/context.ts`, `src/lib/decision/insights.ts`
- UI: `src/components/GuidanceWhyModal.tsx`, `src/app/(pwa)/guidance/page.tsx`
- Home: micro-link only in `DashboardSolo` / `DashboardCouple`
- Profile link to `/guidance`

Detail checklist: [implementation-checklist.md](implementation-checklist.md) and `docs/product/features/guidance/implementation-checklist.md`.

## Decision shortcuts (do not re-ask)

| Topic | Answer |
|-------|--------|
| LLM / chat in V1 | No |
| Card on dashboard | No |
| Primary UX | Modal + `/guidance` + micro-link |
| Mutate financial facts | Never |
| Missing data | “Aún no sabemos” / `unknown` |
| vs AI Assistant | Chat = later feature |
| vs Recommendations | Accept/defer engine = later |

If product conflicts with code, **docs win** until the user changes the specs.

## Done criteria for a slice

- Matches numbered rules in `business-rules.md`
- Dashboard not visually loaded with insight chrome
- Insights cite real context fields only
- User-facing copy follows `docs/product/foundations/05-product-language.md`

## V1 status

**Closed 2026-10-22** (checklist + ADR-0008 Implementado). Further work is polish or a new ADR/slice — do not reopen V1 scope (no LLM, no dashboard cards, no persistent recommendations).
