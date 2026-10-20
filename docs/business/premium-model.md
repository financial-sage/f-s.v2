# Premium v1 — modelo de lanzamiento

## Resumen

SinDescuadre lanza con un free usable en **modo individual** y un **trial de pareja de 7 días** que arranca con el primer gasto/ingreso del hogar. El pago es **por código de familia**: cualquier miembro puede activar Premium y desbloquea el hogar entero.

## Free

| Recurso | Límite |
|---------|--------|
| Modo | Solo individual (pareja = trial o Premium) |
| Bolsillos de gasto extra | 1 (además de bolsillos de sistema) |
| Cuentas | 1 |
| Plantillas de gastos fijos | 3 |

## Pareja y trial

1. Un usuario crea la familia (código). Mientras no haya pareja, ve **modo individual** (esperado).
2. Cuando la pareja se une, ven **modo pareja** sin reloj todavía.
3. Al registrar el **primer gasto o ingreso** (cualquier miembro), arranca el trial:
   - `couple_trial_started_at` / `couple_trial_ends_at` (+7 días)
   - El otro miembro recibe un mensaje de felicitación (confeti sutil) al abrir la app.
4. Durante el trial: countdown visible; pareja activa; límites free de bolsillos/cuentas/fijos **no** aplican (mismo tratamiento que Premium para cupos v1).
5. Si vence sin pago: **pareja en pausa**
   - UX vuelve a individual + límites free
   - Datos de pareja **conservados** (no se borra ni desvincula)
   - Movimientos compartidos nuevos: bloqueados hasta Premium
6. Cualquier miembro puede pagar / activar Premium **por el código de familia** → hogar desbloqueado.

## Entitlement (orden de evaluación)

1. Hogar Premium (`premium_until` futuro o `is_premium_household`) → pareja + sin límites free.
2. Trial activo (`now < couple_trial_ends_at`) → pareja activa.
3. Dos miembros, trial aún no iniciado → pareja UI sin countdown.
4. Dos miembros, trial vencido → pareja en pausa.
5. Un solo miembro → individual.

## Celebración primer movimiento

Cuando se crea el primer expense/deposit del family con dos miembros:

- Se inicia el trial (si no estaba iniciado).
- Se guarda celebración pendiente para el **otro** usuario.
- Al abrir la app, modal: “{nombre} registró su primer gasto/ingreso” + confeti sutil (navy + dorado).
- Se marca como vista (no se repite).

## Pago (v1)

- Stub / activación por código de familia hasta Stripe o IAP.
- Activar Premium marca el hogar (`is_premium_household` / `premium_until`) y, por compatibilidad, `profiles.is_premium` de ambos miembros.

## Fuera de alcance v1

- Pasarela de pago real (Stripe / App Store / Play).
- Analytics avanzados de conversión.
