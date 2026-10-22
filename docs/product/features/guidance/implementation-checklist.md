# Guidance — Implementation checklist

Usar por slice (ver [technical-spec.md](./technical-spec.md)).

**Estado: V1 cerrada — 2026-10-22**

## Slice A — Fundaciones

- [x] Pack `docs/product/features/guidance/` completo
- [x] ADR-0008 aceptado en repo
- [x] Skill + rule + `AGENTS.md`
- [x] `src/lib/decision/context.ts` + `insights.ts`
- [x] Reglas 19–23 cubiertas con al menos unknown + cuentas + margen básico

## Slice B — UX sutil

- [x] `GuidanceWhyModal` con Portal
- [x] Microenlace en Solo y Couple (sin card)
- [x] Modal muestra title, summary, highlights, CTA
- [x] Dashboard layout visualmente intacto

## Slice C — Página y perfil

- [x] `/guidance` autenticada
- [x] Link desde Perfil
- [x] Mismos insights que el modal (misma lib)

## Slice D — Pulido

- [x] Copy CARE / product language
- [x] Casos solo / pareja / sin cuentas / sin gastos / multi-negativo + cuenta 0
- [x] Sin ítem nuevo en BottomNav
- [x] Mapa de dinero colapsable + recomendación en `/guidance`
