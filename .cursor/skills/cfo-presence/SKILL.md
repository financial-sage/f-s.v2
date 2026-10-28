---
name: cfo-presence
description: >-
  Implements CFO Familiar Proactive Presence for SinDescuadre: note kinds
  (recommendation/alert/summary/nudge/celebration), decorative pill → modal,
  re-readable archive, domain rules + CARE NLG. Use when the user asks for CFO
  presence, notas del CFO, ADR-0011, pastilla, CfoNoteModal, or proactive AI notes.
---

# CFO Presence — agent harness

## Mandatory first reads

1. `docs/product/features/cfo-presence/README.md`
2. `docs/product/features/cfo-presence/business-rules.md`
3. `docs/product/features/cfo-presence/technical-spec.md`
4. `docs/decisions/ADR-0011-cfo-proactive-presence.md`

Related: Recommendations ADR-0009 (same table); Guidance ADR-0008 (separate).

## Locked decisions

| Topic | Answer |
|-------|--------|
| Chat | No |
| Dashboard scroll cards | No |
| Entry | Pill outside scroll → modal |
| History | Activas + Anteriores |
| LLM | Copy only |
| Persist | `family_recommendations` + `kind` |

## Implementation

- Lib: extend `src/lib/recommendations/*`
- UI: `CfoPresencePill`, `CfoNoteModal`; page `/recommendations` as Notas
- Phases 2–4: push, deep engine, tone/audio — document only until requested
