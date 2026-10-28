# Recommendations (persistentes + IA, sin chat)

## Estado

**Definido — 2026-10-22** (ADR-0009). Fase 1 en código; gate Premium + pruebas gratis (individual / pareja).

## Propósito

Recommendations **propone acciones** a partir de la realidad financiera ya conocida, las **persiste**, deja que la familia diga qué hace con ellas (aceptar / posponer / descartar) y, con el tiempo, ofrece **balances** (mes vs mes; periodo bajo demanda).

No es chat. No sustituye el criterio de la familia. No inventa hechos.

La fuente de verdad sigue siendo el dominio. Las **reglas** eligen *qué* recomendar; la **IA** solo escribe el texto CARE sobre hechos ya calculados (opción A, ADR-0009).

Guidance V1 (ADR-0008) **explica** el presente. Recommendations **propone y recuerda** en el tiempo.

Decisión: [ADR-0009](../../../decisions/ADR-0009-persistent-recommendations-ai.md). Filosofía: [SinDescuadre-IA.md](../../../SinDescuadre-IA.md).

---

# Decisiones de producto

| Tema | Decisión |
|------|----------|
| Qué recomienda | Reglas de dominio sobre hechos (margen, cuentas, bolsillos, **ahorros**, ritmo de gasto, …) |
| Rol de la IA | Solo **redacción** CARE (qué / por qué / impacto); no elige candidatas; no inventa cifras |
| Persistencia | Sí — estados e historial de interacción |
| Chat | **No** en esta feature |
| Dashboard scroll | **Sin** cards/banners/strips de recomendaciones |
| Entrada UX | Pastilla CFO → modal + Notas (Activas \| Anteriores); ver ADR-0011 |
| Aceptar | Marca estado y/o CTA a flujo existente; **no** ejecuta movimientos sola |
| Monetización | **Premium** + prueba gratis (individual 7d / pareja = trial de pareja) |
| Balance mes | Fase 2 — vs mes anterior |
| Balance periodo | Fase 3 — 3 / 6 / 12 meses o a petición (informe, no chat) |

---

# Fases

## Fase 1 — Recomendaciones persistentes

- Generar candidatas por reglas (incl. **recomendar ahorrar** cuando el contexto lo permita).
- Redacción IA anclada a hechos.
- Guardar + ciclo de vida (Nueva → Vista → Aceptada | Pospuesta | Descartada).
- Aviso suave fuera del scroll + lista/detalle en superficie dedicada.
- CTA a rutas existentes (`/accounts`, ahorro, historial, `/guidance`, …).

## Fase 2 — Balance mes vs mes anterior

- Agregados del ledger (gasto real, ingresos, ahorro neto, bolsillos) mes N vs N−1.
- Narrativa IA sobre esos agregados (“cómo cerró este mes respecto al anterior”).
- Puede emitir o enriquecer una recomendación de tipo “balance” / educativa.

## Fase 3 — Balance de periodo bajo demanda

- Selector 3 / 6 / 12 meses (u otro rango permitido).
- Dominio calcula agregados e hitos; IA **reconstruye** un balance narrativo.
- Si no hay historial suficiente → “aún no sabemos” / datos insuficientes, sin inventar.

---

# Estructura de una recomendación

Toda recomendación responde, como mínimo:

- **Qué** propone
- **Por qué** (hechos citados)
- **Impacto** si se actúa (y, si aplica, si no se actúa)
- **Prioridad** (crítica / importante / oportunidad / educativa)
- **Estado** en el ciclo de vida
- **CTA** opcional a ruta de dominio

---

# Relación con otras features

| Feature | Relación |
|---------|----------|
| Guidance | Explica el momento; no persiste. Recommendations propone y recuerda. |
| Accounts / Funds / Savings | Hechos de liquidez, bolsillos y ahorro alimentan reglas. |
| Dashboard | Solo aviso suave fuera del scroll; sin cards en el hero/scroll. |
| AI Assistant | Fuera de alcance; el informe de periodo **no** es chat. |
| Decision Engine | Las reglas de candidatas son el puente hacia el motor futuro. |

---

# Indicadores de éxito

La familia entiende por qué salió la recomendación, qué pasaría al seguirla, y puede actuar o descartar sin culpa. Los balances de periodo se sienten honestos: cifras del sistema + relato CARE, nunca números inventados.

---

# Referencias

- [business-rules.md](./business-rules.md)
- [user-flow.md](./user-flow.md)
- [technical-spec.md](./technical-spec.md)
- [implementation-checklist.md](./implementation-checklist.md)
- [ADR-0009](../../../decisions/ADR-0009-persistent-recommendations-ai.md)
- [Guidance](../guidance/README.md) (V1 cerrada)
- [ADR-0008](../../../decisions/ADR-0008-contextual-guidance-v1.md)
