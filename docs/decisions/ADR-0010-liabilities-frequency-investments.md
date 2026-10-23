# ADR-0010 — Liability accounts, multi-period frequency, investment as valued asset

## Estado

Aceptado — 2026-10-22

## Contexto

Las pruebas con usuarios (Colombia) piden:

1. **Tarjetas de crédito** (muy usadas; deuda y pago mensual).
2. **Inversiones** (CDT, fondos, etc.) sin convertir la app en un broker.
3. **Gastos por periodos** (bimensual, trimestral, anual), no solo mensuales.

Añadir tres módulos nuevos en navegación contradice la filosofía ([claridad antes que control](../product/foundations/02-financial-philosophy.md)) y el criterio de no cargar el dashboard (ADR-0008 / ADR-0009). Ya existen capas: **Account** (ADR-0006), **Fund / Savings** (ADR-0005 / ADR-0007) y **gastos fijos** (plantillas + pagos del mes).

## Decisión

1. **Sin nav nueva.** TC e inversión viven bajo Cuentas / Ahorros; la frecuencia vive en gastos fijos / compromisos.
2. **Frecuencia multi-periodo** en `fixed_expenses`: `monthly | bimonthly | quarterly | semiannual | annual`, con ancla de mes. Solo se generan pagos del mes cuando toca. El Decision Engine y resúmenes de capacidad usan **equivalente mensual** (`importe / meses_del_periodo`). UX por defecto = mensual (“Más opciones” / “¿Cada cuánto?”).
3. **Account `kind`:** `checking` (default, liquidez) | `credit` (pasivo) | `investment` (activo valorado).
4. **Tarjeta (`credit`):** saldo de ledger negativo = deuda. Pago = transferencia cuenta checking/shared → credit (sube el saldo, baja la deuda). Sin intereses, cuotas ni extracto en V1. No cuenta en “liquidez visible”.
5. **Inversión (`investment`):** saldo positivo = valor actual. Aportes/retiros = transferencias con cuentas de liquidez; el usuario puede **actualizar el valor**. Sin catálogo de productos ni rentabilidad diaria. No cuenta en liquidez del mes. **Solo en Centro de cuentas** (tab Inversiones), no en Ahorros.
6. **Pago de tarjeta:** flujo primario desde cuenta `checking` (**Transferir / Pagar** → destino `credit`). La tarjeta muestra deuda y ajuste; no un pago enredado desde ella.
7. **Commitments** (feature futura) reutiliza el mismo vocabulario de frecuencia / equivalente mensual; V1 implementa frecuencia en gastos fijos.
8. **UX:** placeholders globales; evitar rojo de pánico en deuda/saldos (ver `.cursor/rules/ux-surfaces.mdc`).

## Consecuencias

- Migraciones: `kind` en `family_accounts`; `frequency` + `anchor_month` en `fixed_expenses`.
- UI: selector de tipo al crear cuenta; etiqueta “Debes” en TC; bloque de inversiones bajo Ahorros; selector colapsado de frecuencia en gastos fijos.
- Liquidez visible = solo cuentas `checking`.
- Documentar en glosario, accounts, savings, commitments.

## Alternativas descartadas

- **Módulos “Tarjetas” / “Inversiones” / “Suscripciones” en el menú:** carga la app y fragmenta el ritual.
- **Solo “pago de tarjeta” como gasto fijo sin saldo de deuda:** insuficiente para quien quiere ver lo que debe.
- **Catálogo de productos de inversión (Colombia):** fuera de visión; es broker, no comprensión.
- **Motor de intereses / cuotas en V1:** complejidad prematura; cuotas pueden ser compromisos más adelante.
