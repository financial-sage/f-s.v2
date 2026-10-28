# ADR-0009 — Recomendaciones persistentes con IA (sin chat)

## Estado

Aceptado — 2026-10-22

## Contexto

Guidance V1 (ADR-0008) ya **explica** la realidad financiera con reglas deterministas, modal y `/guidance`, sin LLM ni cards en el dashboard.

La visión de producto (`docs/product/features/recommendations/`, `docs/SinDescuadre-IA.md`) pide ir más allá: **propuestas de acción** que persisten, se pueden aceptar / posponer / descartar, tienen en cuenta **ahorros**, y con el tiempo permiten **balances** (mes vs mes anterior; 6 / 12 meses o bajo demanda).

El chat / AI Assistant **no** está en alcance todavía. Se necesita IA para **redactar** en tono CARE, no para conversar ni para inventar hechos.

## Decisión

1. Introducir **Recommendations** como feature de producto con pack en `docs/product/features/recommendations/` y este ADR como fuente operativa.
2. **Candidatas por reglas de dominio** (opción A): el motor elige *qué* recomendar a partir de hechos (margen, cuentas, bolsillos, ahorro, ritmo de gasto, etc.).
3. **IA solo redacta** título, cuerpo, por qué e impacto sobre hechos ya calculados. Nunca calcula saldos ni inventa cifras. Si faltan datos → no se genera la rec o se marca “aún no sabemos”.
4. Las recomendaciones son **persistentes** (almacenadas) con ciclo de vida: Nueva → Vista → Aceptada | Pospuesta | Descartada → (opcional) Resuelta.
5. **UX de entrada:** aviso **suave fuera del scroll** del dashboard (chip / franja fija / anclaje bajo header o sobre bottom nav), más superficie dedicada (`/recommendations` o sección en `/guidance`). **Prohibido** card/banner/strip dentro del scroll de Inicio (se mantiene el espíritu de ADR-0008). **Actualización ADR-0011:** la entrada pasa a pastilla decorativa → modal + historial (Notas); el chip queda absorbido.
6. **Sin chat** en esta fase. El “¿cómo llevo los últimos X meses?” es un **informe bajo demanda** (selector de periodo + narrativa IA sobre agregados), no un hilo libre.
7. “Aceptar” **no ejecuta** movimientos solos: marca estado y/o navega a un flujo de dominio existente (ahorro, cuentas, historial, etc.).
8. Entrega por **fases** (ver pack):
   - **Fase 1** — Recs persistentes (reglas + redacción IA + estados + aviso suave).
   - **Fase 2** — Balance mes vs mes anterior.
   - **Fase 3** — Balance de periodo (3 / 6 / 12 o a petición) con reconstrucción narrativa IA.
9. **Monetización:** Recommendations es feature **Premium**. Prueba gratis:
   - **Individual:** 7 días desde el primer movimiento del hogar solo.
   - **Pareja:** incluido en el trial de pareja de 7 días; bloqueado en pausa / pre-trial.
   Detalle en `docs/business/premium-model.md` y business-rules del pack.

## Consecuencias

- Hay que documentar business-rules, technical-spec, user-flow, checklist; skill + rule + entrada en `AGENTS.md`.
- Se añade persistencia (tabla(s) de recomendaciones e interacciones); Guidance V1 sigue sin tablas propias.
- Se introduce un proveedor LLM **acotado** (prompt con hechos estructurados inyectados; salida validada / sin cifras libres).
- Chat, simulador libre y ejecución autónoma de traspasos quedan fuera.
- Guidance y Recommendations coexisten: Guidance explica el presente; Recommendations propone y recuerda acciones / balances en el tiempo.

## Alternativas descartadas

- **LLM elige qué recomendar (opción B):** más riesgo de inventar prioridades; se reserva a una fase futura si las reglas se quedan cortas.
- **Solo plantillas sin IA:** válido como fallback offline, pero no cumple el objetivo de narrativa CARE rica y balances de periodo.
- **Chat como interfaz de “últimos X meses”:** fuera de alcance; se usa selector + informe.
- **Card de recomendaciones en el scroll del dashboard:** contradice ADR-0008 / home limpio.
