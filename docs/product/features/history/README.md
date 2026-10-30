# Historial (movimientos)

## Propósito

`/history` es la **fuente de verdad visual** de los movimientos del hogar: qué entra en la lista, qué se oculta y cómo se interpreta cada fila.

El listado reciente del **Dashboard** (Inicio) es un **preview truncado** de ese mismo universo — no un filtro distinto.

---

## Regla de sincronización (obligatoria)

| Superficie | Qué muestra |
|------------|-------------|
| Historial (`HistoryList`, `/history`) | Universo completo + filtros de UI (mes, bolsillo, quién pagó, …) |
| Dashboard (lista reciente) | **Mismos movimientos visibles** que Historial con filtros por defecto; solo se trunca (p. ej. N filas) y, en pareja, chips de alcance (personal / compartido) |

**Al cambiar qué aparece o se oculta en Historial, actualizar también el Dashboard vía el helper compartido** — nunca con un `filter` ad hoc solo en una pantalla.

Helper de producto/código: `src/lib/movementHistory.ts` → `isVisibleInMovementHistory` (+ `collapseTransferPairsForHistory` para unificar pares de transferencia).

---

## Qué no es Historial

- Ledger de **inversiones** → Cuentas → Inversiones (ADR-0010).
- Ajustes internos de saldo de bolsillo (concepto oculto) → cuentan en saldo, no en la lista.
- Liquidaciones / reembolsos internos de sistema → igual: saldo sí, lista no.
- Timeline narrativo (feature futura) ≠ lista de movimientos.

---

## Relación con otras features

- **Dashboard** — preview; ver [business-rules](./business-rules.md) y dashboard.
- **Funds / Accounts** — generan filas del ledger; la visibilidad se decide aquí.
- **CFO Presence** — “historial” de notas es otra superficie (`/recommendations`), no esta lista.
