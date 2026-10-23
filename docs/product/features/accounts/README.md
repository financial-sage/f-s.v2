# Accounts (Cuentas)

## Propósito

Las cuentas simulan cuentas bancarias donde la familia recibe y mueve dinero antes de organizarlo para gastar.

Esta Feature introduce un **centro de cuentas** para parejas: cada miembro administra una o varias cuentas personales, puede haber cuentas compartidas, y desde ellas se transfieren fondos hacia los bolsillos (o se registran pagos excepcionales desde la propia cuenta).

Los bolsillos siguen siendo la capa de organización del gasto (ver [Funds](../funds/README.md) y [ADR-0006](../../../decisions/ADR-0006-accounts-vs-funds.md)).

Implementación (schema, ledger, RLS, slices): [technical-spec.md](./technical-spec.md).

---

# Decisiones de producto

| Tema | Decisión |
|------|----------|
| Naturaleza | Una cuenta simula una **ubicación** del dinero o un pasivo/activo valorado; no un bolsillo |
| Capas | **Cuenta** ≠ **Bolsillo**; no se unifican |
| Kind | `checking` (liquidez) · `credit` (tarjeta / deuda) · `investment` (valor actual) — [ADR-0010](../../../decisions/ADR-0010-liabilities-frequency-investments.md) |
| Tipos de alcance | **Personal** y **compartida** (creables por la familia) |
| Flujo canónico | Ingreso → cuenta personal → cuenta compartida → repartición a bolsillos → gastos |
| Entrada a bolsillos | **Ambos caminos**: aporte directo (Funds) + transferencia desde cuenta |
| Pago de gastos | Preferido desde bolsillo; **cualquier gasto puede salir de cuenta** (UX empuja a bolsillo) |
| Visibilidad | Configurable al crear: **solo yo** o **visible para la pareja** |
| Ingresos | Solo a cuenta; el reparto es un paso aparte |
| Saldo | Negativo permitido con aviso |
| Cuenta compartida | Ambos miembros pueden ver, ingresar, transferir y pagar |
| Audiencia inicial | Parejas; individual después |

---

# Conceptos

## Cuenta personal

Cuenta bancaria simulada de un miembro (p. ej. donde llega la nómina).

El dueño la crea y opera. La visibilidad hacia la pareja se define al crearla (o se ajusta después según reglas de la feature).

## Cuenta compartida

Cuenta bancaria simulada de la unidad familiar (p. ej. cuenta conjunta).

Cualquier miembro de la pareja puede verla (es compartida), ingresar, transferir y pagar desde ella.

## Visibilidad

- **Solo yo**: el otro miembro no ve saldo ni movimientos de esa cuenta personal.
- **Visible para la pareja**: ambos ven saldo y movimientos.

Las cuentas compartidas son visibles para ambos por definición.

## Saldo

```
saldo = ingresos
      + transferencias entrantes
      − transferencias salientes
      − gastos pagados desde la cuenta
      − salidas externas
```

El saldo puede quedar **negativo**. El sistema avisa, pero no bloquea el registro.

- **checking:** saldo = liquidez; suma a “liquidez visible”.
- **credit:** saldo de ledger negativo = deuda (“Debes”); el pago es transferencia desde checking/shared. No suma a liquidez.
- **investment:** saldo = valor actual; aportes/retiros y ajuste de valor. No suma a liquidez del mes.

## Relación con bolsillos

- **Cuenta** = dónde está el dinero (banco simulado).
- **Bolsillo** = cómo se organiza para gastar (fondo común segmentado).

Mover dinero de cuenta a bolsillo no es un gasto: es una transferencia interna. El aporte directo a bolsillo (sin pasar por cuenta) sigue siendo válido.

---

# Flujo canónico (pareja)

1. Un miembro registra su nómina (u otro ingreso) en su **cuenta personal**.
2. Transfiere parte (o todo) a la **cuenta compartida**.
3. Desde la cuenta compartida (o desde la personal) **reparte** hacia bolsillos.
4. Los gastos del día a día se pagan preferentemente desde bolsillos.
5. Si hace falta, un gasto puede pagarse desde una cuenta (con nudge hacia bolsillo).

---

# Relación con otras Features

## Funds (Bolsillos)

Los bolsillos reciben aportes directos y transferencias desde cuentas. Las transferencias entre bolsillos siguen las reglas de Funds.

## Financial Events / Movements

Ingresos a cuenta, transferencias y gastos con origen cuenta o bolsillo son hechos financieros que actualizan saldos y la realidad familiar.

## Dashboard

Puede mostrar saldos de cuentas visibles y recordatorios de liquidez, sin sustituir el centro de cuentas.

## Family

Las cuentas viven en el contexto de la familia; ownership y visibilidad respetan la unidad de pareja.

---

# Experiencias

- Ver el centro de cuentas (saldos visibles según permisos).
- Centro con tabs **Cuentas | Créditos | Inversiones**.
- Crear cuenta personal o compartida según el tab (banco, tarjeta o inversión).
- Pagar tarjeta desde cuenta bancaria (**Transferir / Pagar** → destino tarjeta).
- Configurar visibilidad de una cuenta personal.
- Registrar un ingreso en una cuenta.
- Transferir entre cuentas (personal ↔ compartida, cuenta ↔ cuenta).
- Transferir de cuenta a bolsillo y de bolsillo a cuenta.
- Registrar un gasto pagado desde una cuenta (con sugerencia de usar bolsillo).
- Registrar una salida externa (dinero que sale de SinDescuadre).

---

# Documentos de la feature

| Doc | Contenido |
|-----|-----------|
| [README](./README.md) | Propósito y decisiones de producto |
| [business-rules.md](./business-rules.md) | Reglas numeradas |
| [user-flow.md](./user-flow.md) | Flujos de usuario |
| [technical-spec.md](./technical-spec.md) | Schema, ledger, RLS, rutas de código, slices |

# Evolución

- Modo **individual** (family de 1): solo cuentas personales; ver business-rules § Individual. Helper de contexto: `src/lib/household.ts` (`memberCount` / `HouseholdKind`).
- Kids / Child roles: deferred — ver `docs/product/experiences/children.md` (placeholder) y authenticated-context.
- Plantillas de repartición de nómina quedan fuera de este corte (ver technical-spec → Fuera de MVP).
- `states.md` y `edge-cases.md` pueden añadirse tras el Slice B de UI.
