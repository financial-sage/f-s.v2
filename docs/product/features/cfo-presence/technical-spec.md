# CFO Presence — Technical Spec

## Decisiones técnicas (Fase 1)

| Tema | Decisión |
|------|----------|
| Persistencia | Extender `family_recommendations` con `kind` |
| Código | `src/lib/recommendations/*` (+ UI CFO) |
| Entrada | `CfoPresencePill` en layout `(pwa)` |
| Modal | `CfoNoteModal` (Portal, patrón Guidance) |
| API activa | `/api/recommendations/active` → count + primary note payload |
| Historial | `listActiveRecommendations` + `listArchivedRecommendations` |
| Auto-open | `localStorage` key por familia/día |

## Schema

```sql
ALTER TABLE family_recommendations
  ADD COLUMN kind text NOT NULL DEFAULT 'recommendation'
  CHECK (kind IN ('recommendation', 'alert', 'summary', 'nudge', 'celebration'));
```

## Reglas Fase 1 (además de las existentes)

| rule_id | kind | Condición (resumen) |
|---------|------|---------------------|
| `spend_pace_nudge` | nudge | Gasto del mes alto vs liquidez visible |
| `savings_milestone` | celebration | Ahorro cruza umbral (p. ej. 100 / 500) una vez |
| `month_pulse_summary` | summary | Suficientes movimientos del mes; máx. una open |

## UX components

- `CfoPresencePill` — reemplaza `RecommendationsSoftNotice`
- `CfoNoteModal` — detalle + acciones + link a Anteriores
- Página `/recommendations` — activas + enlace “Recomendaciones anteriores”

## Fases 2–4

Ver [README.md](./README.md). Sin tablas nuevas obligatorias en F1; preferencias push en F2.
