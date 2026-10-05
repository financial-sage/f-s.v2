# ADR-0005 — Multi-funds (bolsillos)

## Estado

Aceptado — 2026-10-05

## Contexto

SinDescuadre solo modela un bolsillo compartido mediante el literal `joint_fund` en `expenses.responsible_for`, más el bolsillo personal implícito del usuario.

El producto necesita varios bolsillos (fondo común, gasolina, restaurantes, personales) con saldo, aportes directos, gastos imputados a un solo fondo y transferencias.

## Decisión

1. Introducir la entidad `family_funds` como agregación de bolsillos de la familia.
2. Añadir `expenses.fund_id` como identidad del bolsillo afectado.
3. Añadir `expenses.paid_from_fund` para distinguir pago desde la caja del fondo vs adelanto personal.
4. Añadir `expenses.transfer_group_id` para emparejar transferencias.
5. Mantener `paid_by` como UUID de perfil (quién registró / adelantó).
6. Conservar `responsible_for` durante la transición para deuda P2P y compatibilidad; para fondos compartidos puede seguir siendo `joint_fund` o el `fund_id` según el flujo, priorizando `fund_id` en cálculos nuevos.

## Consecuencias

- Hay que migrar y backfilliar datos existentes.
- Dashboard, historial, aportes, liquidaciones y formularios deben seleccionar fondo.
- El Decision Engine futuro razonará sobre saldos por bolsillo, no sobre un único fondo común.

## Alternativas descartadas

- Usar solo categorías/presupuesto: no dan saldo de caja.
- Strings tipo `joint_fund_gasolina`: frágil y sin entidad.
