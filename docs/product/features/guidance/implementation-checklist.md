# Guidance — Implementation checklist

Usar por slice (ver [technical-spec.md](./technical-spec.md)).

## Slice A — Fundaciones

- [ ] Pack `docs/product/features/guidance/` completo
- [ ] ADR-0008 aceptado en repo
- [ ] Skill + rule + `AGENTS.md`
- [ ] `src/lib/decision/context.ts` + `insights.ts`
- [ ] Reglas 19–23 cubiertas con al menos unknown + cuentas + margen básico

## Slice B — UX sutil

- [ ] `GuidanceWhyModal` con Portal
- [ ] Microenlace en Solo y Couple (sin card)
- [ ] Modal muestra title, body, why, CTA
- [ ] Dashboard layout visualmente intacto

## Slice C — Página y perfil

- [ ] `/guidance` autenticada
- [ ] Link desde Perfil
- [ ] Mismos insights que el modal (misma lib)

## Slice D — Pulido

- [ ] Copy CARE / product language
- [ ] Casos solo / pareja / sin cuentas / sin gastos
- [ ] Sin ítem nuevo en BottomNav
