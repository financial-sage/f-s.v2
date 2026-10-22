# Guidance (IA contextual V1)

## Estado

**V1 cerrada — 2026-10-22.** En producción de producto: motor determinista, modal, `/guidance`, microenlace en home. Sin LLM. Siguiente fase (chat / recomendaciones persistentes) = features aparte.

## Propósito

Guidance es la capa que **explica** la realidad financiera ya conocida por SinDescuadre, con tono CARE, sin decidir por la familia y sin inventar hechos.

No es chat. No es un panel de estadísticas en el dashboard. Es un copiloto sutil: microenlaces, modales “¿Por qué?” y una página ligera `/guidance`.

La fuente de verdad sigue siendo el dominio (hechos → realidad). Guidance solo traduce significado ya derivado de datos publicados.

Implementación: [technical-spec.md](./technical-spec.md). Filosofía: [SinDescuadre-IA.md](../../../SinDescuadre-IA.md). Decisión: [ADR-0008](../../../decisions/ADR-0008-contextual-guidance-v1.md).

---

# Decisiones de producto

| Tema | Decisión |
|------|----------|
| Alcance V1 | Insights **deterministas** (plantillas); **sin LLM** ni chat |
| Dashboard | **Sin tarjetas nuevas**; layout Solo/Couple se mantiene |
| Entrada UX | Microenlace “¿Qué significa?” → modal; link en Perfil → `/guidance` |
| Prioridad | **Un** insight principal por visita (más contexto en `/guidance`) |
| Datos faltantes | “Aún no sabemos” es válido; inventar cifras no lo es |
| Mutación | Guidance **nunca** escribe hechos financieros |
| Relación con AI Assistant | Conversación = fase posterior (`features/ai-assistant`) |
| Relación con Recommendations | Motor accept/defer = fase posterior (`features/recommendations`) |

---

# Filosofía

- Hechos antes que interpretaciones.
- Capacidad de decisión y margen, no solo saldo.
- Copiloto, no juez.
- Claridad, acción, tranquilidad, educación (CARE).
- El dashboard no se “carga”: la explicación vive fuera del scroll principal.

---

# Conceptos

## Decision context

Snapshot de lectura construido desde datos ya cargados (home / cuentas / bolsillos): liquidez visible, saldos de bolsillo, presencia de cuentas, etc.

## Insight

Mensaje corto con:

- `title` / `summary` (CARE, modal)
- `highlights[]` (pocas cifras clave en el modal)
- `pageLead` (encuadre en `/guidance`; el mapa lleva el desglose)
- `confidence` (`high` \| `medium` \| `low` \| `unknown`)
- `cta` opcional hacia `/guidance` u otras rutas existentes

## Recomendación

Acción sugerida en `/guidance` (`selectPrimaryRecommendation`): título, cuerpo, CTA. No muta datos.

## Modal “¿Por qué?”

Hoja modal que muestra el insight principal y highlights. No añade secciones permanentes al Inicio.

## Página `/guidance`

Vista dedicada: `pageLead`, mapa de dinero colapsable («Revisa dónde está tu dinero») y recomendación, sin competir con el hero del dashboard.

---

# Qué no es Guidance V1

- Chat o streaming con modelo de lenguaje.
- Simulador “¿qué pasaría si…?”.
- Recomendaciones persistentes con aceptar / posponer / descartar.
- Banner, card o strip de insight en el scroll de Inicio.
- Cálculos presentados como saldos objetivos cuando faltan datos.

---

# Audiencia

Individual y pareja. Las reglas de visibilidad de cuentas (Accounts) se respetan: solo hechos que el usuario puede ver.

---

# Referencias

- [business-rules.md](./business-rules.md)
- [user-flow.md](./user-flow.md)
- [technical-spec.md](./technical-spec.md)
- [ADR-0008](../../../decisions/ADR-0008-contextual-guidance-v1.md)
- [AI Assistant](../ai-assistant/README.md) (visión conversacional)
- [Recommendations](../recommendations/README.md) (visión de motor)
- [Dashboard](../dashboard/README.md) (experiencia principal; Guidance no la redefine)
