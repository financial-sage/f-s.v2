

## 🧩 Resumen ejecutivo  
La forma más robusta y a prueba de errores es tratar **todo** como un sistema de *asientos contables inmutables* y usar **asientos de corrección** cuando algo ya liquidado cambia.  
Nunca edites retroactivamente un asiento que ya generó deudas o liquidaciones.

---

## 👫 Cómo deben comportarse los gastos en parejas con fondo común  
Cada gasto debe generar **dos tipos de movimientos**, según corresponda:

### 1) **Gasto p2p**  
Un gasto donde una persona paga algo que beneficia a la otra.

- Se genera una **deuda directa** entre personas.  
- Ejemplo: A paga 40€ por algo compartido → B debe 20€ a A.

### 2) **Gasto al fondo común**  
Un gasto que se descuenta del fondo común.

- Si el fondo tiene saldo → se descuenta del fondo.  
- Si el fondo NO tiene saldo → se genera una **deuda de la pareja hacia el fondo**, que luego se salda cuando ambos aportan.

### 3) **Aportes al fondo**  
- Aumentan el saldo del fondo.  
- Si había deudas previas con el fondo, se compensan automáticamente.

---

## 🔄 ¿Qué pasa cuando hay deudas p2p y deudas al fondo a la vez?  
La regla de oro:

> **Cada tipo de deuda vive en su propio “libro contable” y nunca se mezclan.**

- Las deudas p2p se compensan solo con pagos p2p.  
- Las deudas con el fondo se compensan solo con aportes al fondo.  
- Si quieres permitir compensaciones cruzadas, deben hacerse mediante un **asiento explícito de conversión**, nunca implícito.

Ejemplo de conversión explícita:  
“B debe 20€ al fondo → convertir 20€ en deuda p2p hacia A”.

---

## 🛠️ ¿Qué pasa si se edita un gasto ya liquidado?  
Aquí es donde la mayoría de apps se rompen.  
La solución profesional es:

### **Nunca modificar el asiento original.**  
En su lugar:

### 1) **Crear un asiento de reversión**  
- Si el gasto original era 40€ y ahora debe ser 60€,  
  → se crea un asiento de -40€ (reversión)  
  → y otro de +60€ (nuevo gasto).

### 2) **Recalcular las deudas derivadas**  
- La reversión cancela las deudas generadas.  
- El nuevo gasto genera las nuevas deudas.  
- Las liquidaciones previas se mantienen como hechos históricos.

### 3) **Registrar ajustes si la liquidación ya ocurrió**  
Si ya hubo pagos p2p o aportes al fondo, se crean **asientos de ajuste** para corregir el saldo actual sin alterar el pasado.

---

## 🧱 ¿Cómo debe comportarse la base de datos?  
La arquitectura más segura:

### 1) **Asientos inmutables**  
Cada acción genera un asiento.  
Nada se borra ni se edita.

### 2) **Tabla de deudas derivadas**  
Se recalculan a partir de los asientos.

### 3) **Liquidaciones como eventos independientes**  
Nunca se “reparte” una liquidación entre gastos.  
Una liquidación solo dice:  
“B pagó 20€ a A en esta fecha”.

### 4) **Historial completo**  
Permite auditoría, deshacer, y evita inconsistencias.

---

## 🧠 ¿Por qué este modelo es óptimo?  
- Evita romper la contabilidad.  
- Permite auditoría completa.  
- Permite editar cualquier cosa sin miedo.  
- Es el mismo modelo que usan bancos y apps como Splitwise.  
- Facilita sincronización, multiusuario y rollback.

---
