# Savings — Business Rules

## Identidad

1. Cada familia tiene **exactamente un** bote de ahorro activo en el MVP (`purpose = savings`, scope `shared`, `is_system = true`).
2. El bote no es el bolsillo por defecto de gastos compartidos (`is_default = false`).
3. El bote no se archiva ni se elimina en el MVP.
4. El nombre de sistema es **Ahorro** (reservado).

## Separación de conceptos

5. Ahorro ≠ bolsillo de gasto: no aparece en selectores de gasto ordinario ni en la lista de bolsillos del dashboard.
6. Ahorro ≠ cuenta: el dinero se mueve **hacia** el bote desde una cuenta o bolsillo; el bote no sustituye la capa bancaria.
7. Ahorro ≠ Goal: no exige importe objetivo ni fecha en el MVP.

## Aportes

8. Un aporte aumenta el saldo del bote.
9. Orígenes permitidos:
   - cuenta personal operable por el actor;
   - cuenta compartida;
   - bolsillo compartido (excepto Gastos fijos);
   - bolsillo personal del actor.
10. El aporte se registra como transferencia/entrada al bote (mismo ledger `expenses` que Funds/Accounts).
11. Saldo insuficiente en **cuenta** origen: aviso, no bloqueo (regla Accounts).
12. Saldo insuficiente en **bolsillo** origen: bloqueo (regla Funds).

## Retiros

13. Un retiro disminuye el saldo del bote y aumenta cuenta o bolsillo destino.
14. Destinos: mismas reglas de operabilidad que en transferencias Funds/Accounts.
15. La UX debe pedir confirmación (el dinero deja de estar “apartado”).
16. No se permiten gastos cotidianos (`category` de consumo) imputados al bote en el MVP.

## Saldo

17. `saldo = entradas al bote − salidas del bote` (misma semántica de caja que un fondo, solo depósitos/retiros/transferencias).
18. El saldo puede ser cero; no se fomenta negativo (retiros bloquean si no hay caja suficiente).

## Métricas mensuales

19. Mes = mes calendario en la zona de la app (fecha de movimiento `expense_date`).
20. `aporte_mes` = suma de **entradas** al bote en ese mes (depósitos / patas de entrada de transferencia).
21. `aporte_mes_anterior` = lo mismo para el mes calendario anterior.
22. `delta = aporte_mes − aporte_mes_anterior`.
23. Si no hubo aportes el mes anterior, la UI muestra el aporte actual y indica “sin referencia el mes pasado” (no inventar %).
24. Los retiros **no** restan del `aporte_mes` (la comparación mide hábito de aportación, no el neto).

## Visibilidad y permisos

25. Ambos miembros de la pareja ven el bote y pueden aportar/retirar.
26. Parejas primero; modo individual se adapta después.

## Inversiones (ADR-0010)

27. Las inversiones **no** se gestionan en Ahorros; viven en Centro de cuentas (tab Inversiones).
28. El bote Ahorro no lista ni crea cuentas `kind = investment`.
29. El valor invertido **no** forma parte del saldo del bote Ahorro ni de la liquidez visible.

## Fuera de alcance (fase 2+)

30. Varios botes de ahorro / etiquetas de hábito.
31. Ahorro personal por miembro.
32. Auto-ahorro o % de ingresos.
33. Vinculación formal a Goals.
34. Catálogo de productos, ISINs o rentabilidad diaria.
