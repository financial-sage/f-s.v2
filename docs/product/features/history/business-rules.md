# Historial · Business Rules

## Visibilidad base

1. Un movimiento es **visible en Historial** si y solo si `isVisibleInMovementHistory` lo admite (`src/lib/movementHistory.ts`).
2. Hoy se ocultan de la lista (pero pueden afectar saldos):
   - concepto `Reembolso del fondo`;
   - liquidaciones de deuda del sistema (`Liquidación de deuda…`);
   - ajustes internos de saldo de bolsillo (`Ajuste interno de saldo` / `isHiddenFundBalanceAdjustment`);
   - movimientos del ledger de cuentas `investment`.
3. Sí se muestran (entre otros): gastos variables, depósitos, retiros, transferencias visibles, pagos de gastos fijos.
3b. Transferencias internas (`transfer_group_id`): el ledger sigue siendo un **par** (saldos), pero Historial / preview de Inicio muestran **una sola fila** (“A {destino} · Desde {origen}”).

## Dashboard ≡ Historial (preview)

4. La lista reciente de Inicio usa **la misma regla de visibilidad** que Historial.
5. Diferencias permitidas solo:
   - truncado por espacio (p. ej. hasta N filas);
   - chips de alcance en pareja (personal / compartido / …) **sobre** ese universo;
   - presentación más compacta.
6. **Prohibido** mantener un segundo criterio de exclusión en Dashboard (p. ej. ocultar `fixed_expense` o `withdrawal` solo en home).

## Cambios futuros

7. Cualquier alta/baja de tipo de movimiento en la lista se hace en `isVisibleInMovementHistory` (y tests/docs si aplica), luego se revisan filtros de UI de Historial.
8. Los saldos (bolsillo, cuenta, deuda) **no** se calculan con el filtro de lista: el ledger completo (más reglas de dominio) sigue siendo la base de balances.

## UX

9. Listas con divisores hairline; ver `.cursor/rules/ux-surfaces.mdc`.
10. Deuda / pendientes: tono neutro o ámbar, sin rojo de pánico.
