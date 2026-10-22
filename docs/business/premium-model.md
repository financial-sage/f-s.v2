# Premium — modelo de negocio

## Resumen

SinDescuadre ofrece un free usable en **modo individual** y un **trial de pareja de 7 días** que arranca con el primer gasto/ingreso del hogar.

El pago real es una **suscripción individual vía Paddle** (mensual o anual). Si el suscriptor invita a su pareja al hogar, **ambos** quedan Premium sin un segundo cobro.

## Free

| Recurso | Límite |
|---------|--------|
| Modo | Solo individual (pareja = trial o Premium) |
| Bolsillos de gasto extra | 1 (además de bolsillos de sistema) |
| Cuentas | 1 |
| Plantillas de gastos fijos | 3 |
| Recomendaciones (IA) | Ver prueba gratis abajo; sin Premium ni trial → bloqueado |

## Recomendaciones (feature Premium)

Recomendaciones persistentes + redacción IA + aviso suave en inicio + `/recommendations` (y balances en fases 2–3) son **Premium**.

| Perfil | Acceso |
|--------|--------|
| **Individual free** | Prueba gratis **7 días** desde el **primer gasto/ingreso** del hogar solo |
| **Individual Premium** | Incluido |
| **Pareja (pre-trial)** | Bloqueado hasta el primer movimiento (aún no hay trial) |
| **Pareja (trial 7 días)** | Incluido (mismo trial de pareja) |
| **Pareja en pausa** | Bloqueado → paywall |
| **Pareja Premium** | Incluido |

Superadmin puede forzar regeneración IA en `/recommendations` para pruebas (bypass de gate).

## Pareja y trial

1. Un usuario crea la familia (código). Mientras no haya pareja, ve **modo individual**.
2. Cuando la pareja se une, ven **modo pareja** sin reloj todavía.
3. Al registrar el **primer gasto o ingreso**, arranca el trial de 7 días.
4. Si vence sin pago: **pareja en pausa** (datos conservados).
5. Cualquier miembro puede pagar Premium en la app móvil → el hogar queda Premium.
6. En **individual**, el primer movimiento también marca el inicio de la prueba de Recomendaciones (7 días), sin abrir trial de pareja.

## Pago (Paddle)

- Checkout **solo en móvil** (paywall PWA) con Overlay de Paddle.
- Planes: **mensual** y **anual**.
- La suscripción pertenece al usuario pagador (`billing_subscriptions`).
- Entitlement del hogar: si **cualquier** miembro tiene sub activa → Premium compartido (`premium_source=paid`).
- Webhooks en `/api/paddle/webhook` sincronizan estado y cobros (`billing_transactions`).
- Admin muestra recaudación del mes (VIP/stub excluidos).

## Otros orígenes de Premium

| Origen | Uso |
|--------|-----|
| `paid` | Suscripción Paddle |
| `vip` | Amigos/testers (admin); Premium gratis, no es ingreso |
| `stub` | Activación por código de familia (ops/beta) |
| `campaign` | Campañas promo de registro (legacy) |

## Entitlement (orden)

1. Hogar Premium (`is_premium_household` / `premium_until` / sub Paddle activa de un miembro).
2. Trial activo.
3. Dos miembros, trial no iniciado → pareja UI sin countdown.
4. Dos miembros, trial vencido → pareja en pausa.
5. Un solo miembro → individual.

### `canUseRecommendations`

1. Premium hogar → sí (`premium`).
2. Pareja en trial → sí (`couple_trial`).
3. Individual con `first_movement_at` y &lt; 7 días → sí (`solo_trial`).
4. Resto → no (`locked`).

## Fuera de alcance actual

- Checkout en escritorio (`/web`).
- IAP App Store / Play.
- Portal de cliente avanzado (cancelación vía email/flujo Paddle).
