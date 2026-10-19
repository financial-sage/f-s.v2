# ADR-0007 — Savings vs Funds vs Accounts

## Estado

Aceptado — 2026-10-19

## Contexto

Las parejas organizan el mes repartiendo liquidez a bolsillos de gasto y, además, **apartan ahorro**. Mezclar ese dinero con bolsillos de gasto confunde el ritual (“esto no se toca este mes”). Mezclarlo solo como cuenta bancaria no expresa el hábito de aportación mensual ni la comparación mes a mes.

Ya existen:

- **Accounts** — dónde vive el dinero ([ADR-0006](./ADR-0006-accounts-vs-funds.md)).
- **Funds** — organización del gasto ([ADR-0005](./ADR-0005-multi-funds.md)).
- **Goals** (producto) — metas con importe/fecha/salud; demasiado pesado para el ritual mensual.

## Decisión

1. Introducir **Savings (Ahorros)** como capacidad distinta: dinero apartado a propósito.
2. En el MVP: **un bote familiar** implementado como fondo de sistema `purpose = 'savings'` en `family_funds` (mismo patrón que `fixed_expenses`).
3. Los movimientos reutilizan el ledger y las transferencias cuenta↔fondo / fondo↔fondo.
4. No se imputan gastos cotidianos al bote en el MVP.
5. La UI muestra saldo acumulado, aporte del mes y **delta vs mes anterior**.
6. **Goals** sigue siendo la capa de metas a largo plazo; el bote puede alimentarlas en una fase posterior.
7. Audiencia inicial: **parejas**.

## Consecuencias

- `ensureFamilyFunds` debe crear el bote Ahorro si falta.
- Selectores de gasto y lista de bolsillos del dashboard excluyen `purpose = savings`.
- Ruta `/savings` + acciones facade en `actions/savings.ts`.
- Documentación en `docs/product/features/savings/`.

## Alternativas descartadas

- **Tabla `family_savings` propia en MVP**: duplica transferencias ya resueltas en Funds/Accounts.
- **Usar solo una cuenta “Ahorro”**: no modela el hábito de aportación ni separa “apartado” del resto de liquidez bancaria de forma clara en el ritual mensual.
- **Varios objetivos desde el día 1**: añade fricción; se pospone a fase 2.
- **Unificar con Goals**: Goals exige meta/fecha/salud; el MVP solo necesita apartar y comparar meses.
