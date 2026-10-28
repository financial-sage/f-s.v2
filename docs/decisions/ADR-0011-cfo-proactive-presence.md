# ADR-0011 — CFO Familiar Proactivo (presencia + historial)

## Estado

Aceptado — 2026-10-26

## Contexto

Guidance V1 (ADR-0008) explica el presente sin LLM. Recommendations (ADR-0009) propone acciones persistentes con IA de redacción y un soft notice fuera del scroll.

La visión [CFO Familiar Proactivo](../CFO%20Familiar%20Proactivo.md) pide una presencia más viva: motor de hallazgos, tipos de mensaje (alerta, resumen, nudge, celebración), entrega oportuna e historial releyible — sin convertir el producto en chat ni saturar el dashboard.

## Decisión

1. Introducir **CFO Presence** como evolución de Recommendations: las filas de `family_recommendations` pasan a ser **notas CFO** con `kind` (`recommendation` | `alert` | `summary` | `nudge` | `celebration`).
2. **Entrada UX:** pastilla/emblema decorativo **fuera del scroll** (sustituye el soft notice de ADR-0009) → **modal premium** con la nota del momento. El scroll de Inicio **sigue sin cards** de IA.
3. **Historial:** toda nota mostrada/persistida se puede **volver a leer** (activas + archivo). Superficie `/recommendations` se presenta como **Notas** (pestañas Activas | Anteriores).
4. **Auto-apertura del modal:** como máximo una vez por día natural (o si aparece una nota `critical` nueva); el resto bajo demanda vía pastilla.
5. **IA:** dominio/reglas eligen hallazgos; LLM solo redacta CARE (igual ADR-0009 opción A). Sin chat.
6. **Guidance** permanece para el mapa / “¿Qué significa?”; no se fusiona en el mismo módulo.
7. Entrega por **fases** documentadas en el pack `docs/product/features/cfo-presence/`:
   - **Fase 1** — kinds + pastilla + modal + historial + reglas ampliadas acotadas.
   - **Fase 2** — push + preferencias.
   - **Fase 3** — proyecciones / scores / balances profundos.
   - **Fase 4** — tono / audio (opcional).
8. Monetización: misma gate Premium/trial que Recommendations.

## Consecuencias

- Migración: columna `kind` en `family_recommendations`; default `recommendation`.
- Skill/rule CFO Presence; actualizar `AGENTS.md` y `SinDescuadre-IA.md`.
- ADR-0008/0009 siguen vigentes; este ADR **afina la entrada UX** (pastilla + modal + archivo) sin reabrir chat ni cards en scroll.
- Push, audio y scores quedan fuera de Fase 1.

## Alternativas descartadas

- **Action Card dentro del scroll del dashboard:** contradice ADR-0008/0009.
- **Tabla nueva separada de notes:** duplicaría lifecycle; se reutiliza `family_recommendations` con `kind`.
- **Chat como interfaz del CFO:** aplazado (AI Assistant).
