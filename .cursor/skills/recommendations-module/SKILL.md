---
name: recommendations-module
description: >-
  Implements persistent Recommendations with AI copy (no chat) for SinDescuadre:
  domain rules pick candidates, LLM only drafts CARE text, soft notice outside
  dashboard scroll, accept/defer/dismiss, later month and period balances.
  Use when the user asks for recomendaciones, ADR-0009, savings suggestions,
  balance mes anterior, o informe de últimos X meses.
---

# Recommendations module — agent harness

## When this skill applies

User wants to **build or change** Recommendations (persistentes + IA), soft notice, balances mes/periodo — **not** Guidance-only tweaks, **not** chat/AI Assistant.

## Mandatory first reads

Read in order (do not invent product rules):

1. `docs/product/features/recommendations/README.md`
2. `docs/product/features/recommendations/business-rules.md`
3. `docs/product/features/recommendations/technical-spec.md`
4. `docs/product/features/recommendations/user-flow.md`
5. `docs/decisions/ADR-0009-persistent-recommendations-ai.md`

Related: Guidance V1 remains separate (`ADR-0008`). Philosophy: `docs/SinDescuadre-IA.md`.

For Next.js APIs in this repo, follow `AGENTS.md` / `node_modules/next/dist/docs/`.

## Implementation order

Follow **Slices A→E** in `technical-spec.md` / `implementation-checklist.md`.

Locked ideas:

- Rules select candidates; AI only drafts copy (option A)
- Persist + lifecycle; max 3 active per household in V1 of this feature
- Soft notice **outside** dashboard scroll; no cards in scroll
- No chat; period balance = selector + narrative
- Accept never auto-moves money

## Decision shortcuts (do not re-ask)

| Topic | Answer |
|-------|--------|
| Chat | No |
| LLM picks what to recommend | No (option A) |
| Card in dashboard scroll | No |
| Soft notice outside scroll | Yes |
| Savings recommendations | Yes, when rules allow |
| Month vs previous month | Phase 2 |
| Last X months report | Phase 3 (on demand, not chat) |
| vs Guidance | Guidance explains now; Recommendations proposes & remembers |

If product conflicts with code, **docs win** until the user changes the specs.

## Done criteria for a slice

- Matches numbered rules in `business-rules.md`
- Facts before AI copy; no invented numbers
- Dashboard scroll stays free of recommendation chrome
- Accept/defer/dismiss behavior matches lifecycle
