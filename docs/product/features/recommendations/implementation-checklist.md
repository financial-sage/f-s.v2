# Recommendations — Implementation checklist

Usar por slice (ver [technical-spec.md](./technical-spec.md)).

**Estado: Fase 1 en código (2026-10-22). Fases 2–3 pendientes.**

## Slice A — Fundaciones

- [x] Pack `docs/product/features/recommendations/` completo
- [x] ADR-0009 aceptado en repo
- [x] Skill + rule + `AGENTS.md`
- [x] `src/lib/recommendations/*`

## Slice B — Persistencia + reglas + UI base

- [x] Migración + RLS (`20261022120000_family_recommendations.sql`)
- [x] `selectRecommendationCandidates` (incl. ahorro)
- [x] Persistencia + estados
- [x] Página `/recommendations` (lista/detalle, plantillas)

## Slice C — IA + aviso suave

- [x] `renderRecommendationCopy` + OpenAI (`openai`) + fallback plantilla
- [x] Validación: no cifras fuera de `facts`
- [x] `RecommendationsSoftNotice` fuera del scroll
- [x] Accept / defer / dismiss
- [x] Link desde Perfil
- [x] `OPENAI_API_KEY` / `OPENAI_MODEL` en env templates

## Slice D — Balance mes (Fase 2)

- [ ] Agregados mes N vs N−1
- [ ] Narrativa IA / plantilla
- [ ] Entrada desde superficie de recomendaciones

## Slice E — Balance periodo (Fase 3)

- [ ] Selector 3 / 6 / 12
- [ ] Agregados de periodo + “datos insuficientes”
- [ ] Informe narrativo bajo demanda (sin chat)
