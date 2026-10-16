# Accounts · User Flow

## Propósito

Este documento describe los recorridos principales del centro de cuentas y de los hechos que mueven dinero entre cuentas, bolsillos y el exterior.

El objetivo es que la pareja registre dónde está el dinero y cómo lo reparte, sin confundir cuenta bancaria con bolsillo de gasto.

---

# Filosofía

Registrar un movimiento en una cuenta no es contabilidad bancaria formal.

Es comunicar al sistema: “el dinero llegó aquí” o “lo moví allá”, para que la realidad financiera refleje el flujo real de la pareja.

---

# Flujo principal: centro de cuentas

## 1. Apertura

El miembro abre el centro de cuentas.

El sistema muestra las cuentas que puede ver según visibilidad (propias, visibles para la pareja y compartidas).

---

## 2. Comprensión

De un vistazo puede responder:

- ¿Cuánto hay en mis cuentas?
- ¿Cuánto hay en la cuenta compartida?
- ¿Hay saldos en negativo que deba revisar?

---

## 3. Acción

Desde el centro puede:

- crear una cuenta;
- registrar un ingreso;
- transferir;
- pagar un gasto desde una cuenta;
- registrar una salida externa.

---

# Flujos detallados

## Crear cuenta

1. El usuario elige crear cuenta.
2. Indica nombre y tipo: **personal** o **compartida**.
3. Si es personal, elige visibilidad: **solo yo** o **visible para la pareja**.
4. El sistema crea la cuenta con saldo inicial 0 (salvo que más adelante se permita saldo inicial explícito).
5. La cuenta aparece en el centro según permisos.

---

## Registrar ingreso (p. ej. nómina)

1. El usuario elige la **cuenta destino** (típicamente su cuenta personal).
2. Indica monto, fecha y opcionalmente concepto/categoría de ingreso.
3. El sistema aumenta el saldo de la cuenta.
4. Si el saldo estaba negativo, el aviso de negativo puede desaparecer o atenuarse.
5. El reparto a cuenta compartida o bolsillos **no** ocurre en este paso; el usuario puede continuar con una transferencia.

---

## Transferir cuenta → cuenta

1. El usuario elige origen y destino (p. ej. personal → compartida).
2. Indica monto y confirma.
3. Si el origen quedaría en negativo, el sistema **avisa** y permite continuar.
4. El sistema registra el par de movimientos enlazados y actualiza ambos saldos.
5. Ambos miembros ven el efecto en la cuenta compartida; en la personal, según visibilidad.

---

## Transferir cuenta → bolsillo

1. El usuario elige cuenta origen y bolsillo destino.
2. Indica monto y confirma (con aviso si hay sobregiro).
3. Baja el saldo de la cuenta y sube el del bolsillo.
4. Esto no es un gasto: es asignación de liquidez al bolsillo.

---

## Transferir bolsillo → cuenta

1. El usuario elige bolsillo origen y cuenta destino (propia o compartida, según permisos).
2. Indica monto y confirma.
3. Baja el bolsillo y sube la cuenta.
4. Útil para “devolver” dinero del bolsillo a la liquidez bancaria simulada.

---

## Gasto pagado desde cuenta

1. El usuario registra un gasto y elige origen de pago: **cuenta** (en lugar de bolsillo).
2. El sistema muestra un **nudge**: sugiere pagar desde un bolsillo cuando tenga sentido.
3. Si confirma origen cuenta, elige qué cuenta y completa el gasto (monto, categoría, etc.).
4. Disminuye el saldo de la cuenta; no toca saldos de bolsillos.
5. Aviso si queda en negativo.

---

## Salida externa

1. El usuario indica cuenta origen, monto y motivo (dinero que sale del sistema).
2. Confirma (con aviso de negativo si aplica).
3. Baja el saldo de la cuenta; no hay contrapartida interna.

---

## Cambiar visibilidad (cuenta personal)

1. El dueño abre la cuenta personal.
2. Cambia entre **solo yo** y **visible para la pareja**.
3. El otro miembro gana o pierde visibilidad de saldo y movimientos de inmediato.

---

# Resultado esperado

Tras usar el centro de cuentas, cada miembro debe poder decir:

- dónde está el dinero (cuentas visibles);
- qué se movió a la cuenta compartida;
- qué se repartió a bolsillos;
- qué se pagó excepcionalmente desde una cuenta.

---

# Relación con otros flujos

- **Aporte directo a bolsillo**: sigue disponible en Funds; no obliga a pasar por el centro de cuentas.
- **Gasto desde bolsillo**: flujo preferido de Funds / registro de movimientos.
- **Dashboard**: puede enlazar al centro de cuentas o mostrar un resumen de liquidez visible.
