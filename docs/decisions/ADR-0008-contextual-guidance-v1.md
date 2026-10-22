# ADR-0008 — Contextual Guidance V1 (explicación determinista, UI sutil)

## Estado

Aceptado — 2026-10-21  
**Implementado (V1 cerrada) — 2026-10-22**

## Contexto

La visión de IA (`docs/SinDescuadre-IA.md`, `features/ai-assistant`, `features/recommendations`) describe chat, simulador y recomendaciones persistentes. El producto actual ya entrega dashboard Solo/Couple, cuentas, bolsillos y premium; el riesgo es **cargar el Inicio** con una card de “IA” o introducir LLM antes de tener hechos y UX estables.

Se necesita una primera capa que:

- explique con honestidad lo que el sistema ya sabe;
- no compita visualmente con el dashboard;
- deje un harness claro para agentes (como Accounts / ADR-0006).

## Decisión

1. Introducir el feature **Guidance** (`docs/product/features/guidance/`) como V1 de IA contextual.
2. V1 es **determinista** (plantillas + reglas sobre un decision context). **Sin LLM**.
3. El **dashboard no gana cards ni banners** de insight. Solo un microenlace hacia modal y/o navegación a `/guidance`.
4. Guidance **no muta** la realidad financiera.
5. AI Assistant (chat) y Recommendations (accept/defer) quedan **fuera de V1** y no se implementan “de pasada”.
6. Código de dominio de explicación vive en `src/lib/decision/*`; UI en modal + página dedicada.

## Consecuencias

- Hay que documentar pack + skill + rule + entrada en `AGENTS.md`.
- Home Solo/Couple solo recibe un microenlace y estado de modal.
- Futuras fases deben respetar: dominio primero; Guidance solo explica contexto autorizado.
- Recomendaciones persistentes + IA de redacción: [ADR-0009](./ADR-0009-persistent-recommendations-ai.md) (sin chat; no carga el scroll del dashboard).
- ADR-0004 (stub) puede alinearse más adelante; ADR-0008 sigue siendo la fuente operativa de Guidance V1.

## Alternativas descartadas

- **Card permanente en Inicio**: contradice el requisito de dashboard no cargado.
- **LLM desde el día uno**: coste, latencia y riesgo de inventar hechos sin capa de contexto madura.
- **Reutilizar solo `ai-assistant` docs**: esa feature es conversacional; mezclarla con V1 confunde el alcance.
- **Meter insight en BottomNav**: añade ruido de navegación sin necesidad.
