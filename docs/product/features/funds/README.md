# Funds (Bolsillos)

## Propósito

Los fondos son bolsillos de dinero de la familia. Cada uno tiene saldo propio, recibe aportes directos y absorbe gastos imputados exclusivamente a él.

Esta Feature generaliza el comportamiento histórico del **fondo común** para permitir varios bolsillos compartidos (gasolina, restaurantes, etc.) y bolsillos personales.

---

# Decisiones de producto

| Tema | Decisión |
|------|----------|
| Naturaleza | Un fondo es un **bolsillo** con el mismo comportamiento que el fondo común actual |
| Alcance | Puede ser **compartido** (familia) o **personal** (un miembro) |
| Gasto | Un gasto se imputa a **un solo fondo** (no se reparte entre fondos) |
| Transferencias | Sí, entre fondos de la misma familia |
| Aportes | Directos a cada fondo |

---

# Conceptos

## Fondo compartido

Bolsillo de la unidad familiar. Cualquier miembro puede aportar y registrar gastos imputados a él.

El **Fondo común** es el fondo compartido por defecto del sistema. No se puede archivar ni eliminar.

## Fondo personal

Bolsillo de un único miembro. Solo ese miembro lo usa como caja personal.

Cada miembro tiene al menos un fondo personal de sistema.

## Saldo

```
saldo = aportes
      − gastos pagados desde la caja del fondo
      − retiros / liquidaciones de salida
      − transferencias salientes
      + transferencias entrantes
```

Los adelantos personales (alguien paga de su bolsillo un gasto imputado a un fondo compartido) generan **deuda fondo ↔ persona**, no reducen necesariamente la caja del fondo hasta la liquidación.

---

# Relación con categorías y presupuesto

- **Fondo** = bolsillo con saldo.
- **Categoría** = etiqueta analítica del gasto.
- **Presupuesto** = límite de planificación (puede asociarse después a fondo y/o categoría).

Un gasto de restaurante puede imputarse al fondo “Restaurantes”; la categoría sigue siendo opcional para reportes.

---

# Experiencias

- Ver saldos por fondo en el Dashboard.
- Crear fondos compartidos adicionales.
- Aportar directamente a un fondo.
- Registrar un gasto imputado a un fondo.
- Transferir entre fondos.
- Liquidar deudas persona ↔ fondo compartido.
