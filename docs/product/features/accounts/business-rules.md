# Accounts — Business Rules

Nombres de tablas/columnas, encoding en `expenses` y RLS: [technical-spec.md](./technical-spec.md).

## Identidad y alcance

1. Una cuenta pertenece a exactamente una familia (`family_id`).
2. Una cuenta es `personal` (un `owner_profile_id`) o `shared` (unidad familiar).
3. Cuenta y bolsillo son entidades distintas; un movimiento referencia origen y/o destino de tipo cuenta o fondo según el hecho.
4. El modo **pareja** (`memberCount >= 2`) usa cuentas personales y compartidas con visibilidad. El modo **individual** (`memberCount === 1`) solo usa cuentas **personales** del único miembro; no aplica visibilidad de pareja ni creación de cuentas compartidas. Detección: `src/lib/household.ts`.

## Creación

5. Cualquier miembro puede crear cuentas **personales** propias.
6. Cualquier miembro puede crear cuentas **compartidas** de la familia.
7. No hay cuentas de sistema obligatorias en el MVP: la familia crea las que necesite.
8. No puede haber dos cuentas personales activas del mismo miembro con el mismo nombre (case-insensitive).
9. No puede haber dos cuentas compartidas activas de la misma familia con el mismo nombre (case-insensitive).
10. Al crear una cuenta personal, el dueño elige visibilidad: `private` (solo yo) o `family_visible` (visible para la pareja).
11. Las cuentas compartidas son siempre visibles para ambos miembros.

## Visibilidad y permisos

12. Una cuenta personal `private` solo es visible (saldo y movimientos) para su dueño.
13. Una cuenta personal `family_visible` es visible para ambos miembros de la pareja.
14. El dueño de una cuenta personal puede cambiar la visibilidad.
15. En una cuenta **compartida**, ambos miembros pueden: ver, registrar ingresos, transferir y pagar gastos desde ella.
16. En una cuenta **personal**, solo el dueño puede operar (ingresar, transferir, pagar), aunque sea `family_visible` (el otro puede ver, no operar).
17. Transferir **hacia** una cuenta personal ajena no está permitido, salvo que el destino sea una cuenta compartida o un bolsillo al que el actor tenga derecho según Funds.

## Ingresos

18. Un ingreso se registra **solo en una cuenta** (no directamente en un bolsillo).
19. Un ingreso aumenta el saldo de la cuenta destino.
20. El reparto del ingreso (a cuenta compartida o bolsillos) es un hecho posterior (transferencia), no parte del ingreso.

## Transferencias — matriz permitida

21. Origen y destino deben ser distintos.
22. Una transferencia interna genera un par enlazado de movimientos (salida + entrada) con el mismo `transfer_group_id`.
23. Transferencias permitidas en el MVP:

| Origen | Destino | Notas |
|--------|---------|--------|
| Cuenta personal | Cuenta compartida | Actor = dueño de la personal |
| Cuenta compartida | Cuenta personal | Actor = cualquier miembro; destino = su propia personal |
| Cuenta personal | Cuenta personal (mismo dueño) | P. ej. nómina → ahorro |
| Cuenta personal | Bolsillo | Según reglas de Funds sobre el bolsillo destino |
| Cuenta compartida | Bolsillo | Cualquier miembro |
| Bolsillo | Cuenta personal | Solo hacia cuenta del actor (o compartida) |
| Bolsillo | Cuenta compartida | Cualquier miembro con derecho a operar el bolsillo origen |
| Cuenta (personal o compartida) | Externa | Salida de dinero fuera de SinDescuadre |

24. Una **salida externa** disminuye el saldo de la cuenta origen y no crea entrada en otra cuenta ni bolsillo del sistema.
25. La transferencia cuenta → bolsillo aumenta el saldo del bolsillo destino (equivalente en efecto a un aporte, pero originado desde cuenta).
26. La transferencia bolsillo → cuenta disminuye el saldo del bolsillo y aumenta el de la cuenta.
27. Las transferencias entre bolsillos siguen las reglas de [Funds](../funds/business-rules.md); no se redefinen aquí.

## Aportes directos (compatibilidad con Funds)

28. El aporte directo a un bolsillo **sigue permitido** sin pasar por una cuenta.
29. Usar aporte directo o transferencia desde cuenta es decisión del usuario; ambos actualizan el saldo del bolsillo destino.
30. Un aporte directo no altera el saldo de ninguna cuenta.

## Gastos

31. Un gasto puede pagarse desde un **bolsillo** (camino preferido) o desde una **cuenta**.
32. Si se paga desde bolsillo, aplican las reglas de Funds (imputación, `paid_from_fund`, deuda, etc.).
33. Si se paga desde cuenta, disminuye el saldo de esa cuenta y **no** reduce el saldo de ningún bolsillo.
34. Un gasto pagado desde cuenta puede llevar categoría (y demás metadatos de Financial Event); no exige imputación a un bolsillo.
35. La UX debe **sugerir** pagar desde bolsillo cuando el usuario elige origen cuenta (nudge), sin bloquear el registro.
36. No se permite pagar desde una cuenta personal ajena.

## Saldo

37. El saldo de una cuenta puede ser negativo.
38. Ante un movimiento que deje (o agrave) saldo negativo, el sistema muestra un **aviso** y permite continuar.
39. El aviso no es un error de validación bloqueante.

## Archivo

40. Se puede archivar una cuenta sin movimientos pendientes de reconciliación crítica; archivar con saldo ≠ 0 está permitido en MVP con confirmación (el saldo deja de contar como liquidez activa).
41. Archivar no borra el historial de movimientos.
42. Una cuenta archivada no puede ser origen ni destino de nuevos movimientos.

## Individual (family de 1)

43. Solo se crean y operan cuentas personales del único miembro (visibilidad fija `private` en UX).
44. Está prohibido crear cuentas `shared` mientras `memberCount === 1` (defensa en servidor).
45. Al crear el espacio individual (o al abrir el overview), se asegura al menos una cuenta personal por defecto (“Mi cuenta”) si no existe ninguna.
46. Roles tipo Child / modo niños quedan fuera de estas reglas; la extensión prevista es ampliar `HouseholdKind` / roles en authenticated-context, no un segundo modelo de cuentas.

## Evolución

47. Plantillas automáticas de repartición de nómina quedan fuera de estas reglas hasta una decisión de producto posterior.
48. Modo con niños / multi-adulto ampliará permisos y visibilidad; no reescribe la distinción Account ≠ Fund.
