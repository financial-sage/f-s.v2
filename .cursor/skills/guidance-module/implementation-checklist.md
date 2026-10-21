# Guidance module — agent checklist

Mirror of `docs/product/features/guidance/implementation-checklist.md`. Prefer the docs copy if they diverge after edits.

## Before coding

1. Read guidance pack + ADR-0008.
2. Confirm scope is V1 (no LLM, no dashboard card).

## Slice A

- [ ] `context.ts` / `insights.ts` pure functions
- [ ] Priority rules 19–23

## Slice B

- [ ] `GuidanceWhyModal`
- [ ] Micro-link Solo + Couple
- [ ] No new home sections

## Slice C

- [ ] `/guidance` page
- [ ] Profile link

## Slice D

- [ ] Edge cases + CARE copy
- [ ] No BottomNav item
