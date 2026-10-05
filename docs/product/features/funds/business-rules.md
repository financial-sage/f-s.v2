# Funds — Business Rules

## Identidad y alcance

1. Todo movimiento de bolsillo pertenece a exactamente un `fund_id`.
2. Un fondo es `shared` (familia) o `personal` (un `owner_profile_id`).
3. Los fondos personales no son compartidos: no generan deuda de pareja por imputación al fondo.
4. Los fondos de sistema (`is_system`) no se eliminan ni archivan:
   - un fondo compartido default “Fondo común” por familia;
   - un fondo personal por miembro.

## Creación

5. Al crear o unir una familia, el sistema garantiza los fondos de sistema.
6. Cualquier miembro puede crear fondos compartidos adicionales (p. ej. Gasolina, Restaurantes).
7. Un miembro solo puede crear fondos personales propios.
8. No puede haber dos fondos personales activos del mismo miembro con el mismo nombre (case-insensitive).
9. No puede haber dos fondos compartidos activos de la misma familia con el mismo nombre (case-insensitive).

## Aportes

10. Los aportes se registran **directamente** al fondo destino.
11. Un aporte aumenta el saldo del fondo destino.
12. El aporte personal histórico equivale a aportar al fondo personal del usuario.
13. El aporte al fondo común histórico equivale a aportar al fondo compartido default.

## Gastos

14. Un gasto se imputa a **un solo fondo**.
15. No se permite repartir un gasto entre varios fondos.
16. Si el gasto se paga **desde la caja del fondo** (`paid_from_fund = true`), disminuye el saldo del fondo.
17. Si una persona adelanta el pago de un gasto imputado a un fondo **compartido**, se genera deuda fondo ↔ persona (mismo comportamiento que el fondo común actual).
18. Un gasto imputado a un fondo **personal** de otro miembro no está permitido.

## Transferencias

19. Se puede transferir entre dos fondos activos de la misma familia.
20. Origen y destino deben ser distintos.
21. Una transferencia genera un par enlazado de movimientos (salida + entrada) con el mismo `transfer_group_id`.
22. La transferencia no crea deuda P2P ni cambia categorías de gasto ordinario.
23. Transferir desde/hacia un fondo personal ajeno no está permitido; solo el dueño opera su fondo personal (salvo que el destino/origen sea compartido y el actor sea miembro de la familia).

## Deuda y liquidación

24. La deuda fondo ↔ persona aplica solo a fondos **compartidos**.
25. Liquidar deuda del fondo genera salida del fondo (`withdrawal`) y depósito al bolsillo personal del acreedor.
26. La liquidación debe referenciar el `fund_id` del fondo compartido liquidado.

## Archivo

27. Solo se pueden archivar fondos no-sistema sin saldo pendiente ni deudas abiertas (MVP: bloquear archivo si hay movimientos recientes o saldo ≠ 0; en V1 se puede relajar).
28. Archivar no borra el historial.

## Compatibilidad

29. Mientras existan filas legacy con `responsible_for = 'joint_fund'` y sin `fund_id`, el sistema las trata como pertenecientes al fondo compartido default tras el backfill.
30. El literal `joint_fund` deja de ser la identidad de bolsillo; la identidad es `family_funds.id`.
