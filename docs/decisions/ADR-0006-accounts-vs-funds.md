# ADR-0006 — Accounts vs Funds (cuentas vs bolsillos)

## Estado

Aceptado — 2026-10-15

## Contexto

Hoy el dinero entra al modelo principalmente por **aporte directo a un bolsillo** (`family_funds`). Eso modela bien la organización del gasto (fondo común segmentado), pero no representa dónde vive el dinero antes de repartirlo: la nómina llega a una cuenta bancaria personal, a menudo se mueve a una cuenta conjunta y después se reparte a bolsillos.

Sin una capa de cuentas, la familia no puede simular el flujo real banco → organización del gasto. Unificar todo en fondos o todo en cuentas mezclaría dos responsabilidades distintas y chocaría con ADR-0005 (multi-funds).

## Decisión

1. Introducir la entidad **Account** (cuenta) como capa distinta de **Fund** (bolsillo).
2. Una **cuenta** simula una cuenta bancaria: ubicación del dinero (personal o compartida), con saldo, ingresos y transferencias.
3. Un **bolsillo** sigue siendo la organización del gasto (fondo común segmentado), según ADR-0005.
4. El flujo canónico de pareja es: ingreso → cuenta personal → cuenta compartida → repartición a bolsillos → gastos.
5. Los bolsillos siguen pudiendo recibir **aportes directos** (camino actual) **y** transferencias desde cuentas.
6. Un gasto puede pagarse desde un bolsillo (camino preferido) o desde una cuenta (permitido; la UX empuja a usar bolsillo).
7. La primera audiencia fue **parejas**; el modo **individual** (family de 1) reutiliza cuentas personales sin compartidas ni visibilidad de pareja (`src/lib/household.ts`, business-rules § Individual).

## Consecuencias

- Hay que modelar cuentas (creación, ownership, visibilidad, saldo) y movimientos con origen/destino cuenta o fondo.
- El registro de hechos financieros debe soportar ingreso a cuenta, transferencias cuenta↔cuenta, cuenta↔bolsillo, bolsillo→cuenta y salida externa.
- Funds mantiene aportes directos; se documenta el segundo camino (transferencia desde cuenta).
- Dashboard y centro de cuentas deben mostrar saldos de cuentas visibles según permisos.
- El Decision Engine futuro podrá razonar sobre liquidez en cuentas y asignación en bolsillos por separado.

## Alternativas descartadas

- **Unificar todo en fondos**: no representa cuentas bancarias ni el paso “nómina → cuenta conjunta”.
- **Unificar todo en cuentas**: elimina el modelo de bolsillos ya decidido en ADR-0005 y pierde la segmentación del gasto compartido.
- **Solo aporte directo sin cuentas**: insuficiente para el flujo real de parejas descrito en producto.
