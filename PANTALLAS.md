# Pantallas funcionales (MVP) – Guía de uso

Este documento describe cómo se comportan las pantallas que ya funcionan en **SinDescuadre**, con el objetivo de que se entienda el flujo completo de la app sin necesidad de mirar el desarrollo.

---

## Navegación principal (si estás logueado)

En la parte inferior hay una **barra de navegación fija** con 5 opciones:

- **Inicio**: te lleva al dashboard.
- **Tarjetas**: sección de métodos de pago (por ahora es un placeholder).
- **Agregar gasto**: botón circular grande (icono `+`).
- **Historial**: lista de movimientos y filtros.
- **Presupuesto**: control mensual por categoría.

Nota: en pantallas como **Login**, **Register**, **Onboarding** y **Perfil**, la barra puede no mostrarse para evitar que se rompa la experiencia.

---

## 1) Inicio (Dashboard) – `/`

El Inicio cambia según si tu espacio es **individual** o **pareja**.

### A. Modo individual

Ves dos tarjetas:

1. **Mi bolsillo**
   - Muestra tu saldo disponible.
   - Botón: **Registrar gasto**.
2. **Presupuesto**
   - Muestra el progreso con base en el presupuesto definido.
   - Botón: **Ver detalle** (te lleva a `Presupuesto`).

Debajo aparece **Actividad**:
- Lista de tus últimos movimientos.
- Cada movimiento se puede desplegar (para ver acciones como edición).

### B. Modo pareja

Ves dos tarjetas:

1. **Mi Fondo**
   - Tu disponibilidad personal.
   - Botón circular dorado: **Aportar a mi fondo** (abre el teclado para ingresar el monto).
2. **Fondo Común**
   - Muestra el estado del fondo común (según el modelo financiero).
   - Botón circular dorado: **Aportar al fondo común**.
   - Cuando aplica, aparece el botón para **Cobrar** o **Liquidar**.

También aparece **Actividad** (últimos movimientos) con opción de abrir acciones por cada gasto.

Además, si la pareja se acaba de unir, aparece una pantalla de transición con progreso (animación/estado de conexión y sincronización).

---

## 2) Agregar gasto – (Hoja modal desde el botón `+`)

Esta experiencia aparece al tocar **Agregar gasto** (icono `+`).

Incluye:

1. **Importe del gasto**
   - Un campo visual con `$`.
   - Al tocar el importe, se abre un **teclado numérico** para ingresar el monto.
2. **Concepto**
   - Campo de texto: “¿En qué gastaste?”
3. **Pagado por** (solo si eres pareja)
   - Seleccionas quién puso el dinero: tú / tu pareja (y opcionalmente “Fondo común” según el modo).
4. **Destino del gasto**
   - Seleccionas dónde impacta el gasto:
     - personal / fondo común (o equivalentes según el modelo).
5. **Categoría**
   - En lugar de una lista larga, aparece un selector por **iconos**.
   - Se muestran solo las categorías **activas** (las que el usuario permite usar).
6. **Fecha**
   - Seleccionas el día del movimiento.
7. **Guardar**
   - Botón final para registrar o actualizar.

Importante:
- Si estás editando un gasto existente, el título cambia a **Editar Gasto** y los campos se rellenan con los datos actuales.

---

## 3) Historial – `/history`

En Historial ves:

### Encabezado con saldos
- **Mi Fondo** siempre aparece.
- Si tienes pareja, aparece también **Fondo Común** o **Balance P2P** (depende del modelo financiero).

### Lista de movimientos
- Los movimientos se agrupan por día (etiquetas tipo “Hoy”, “Ayer”, etc.).
- Cada movimiento muestra:
  - concepto
  - fecha corta
  - etiqueta de estado (si aplica)
  - monto

### Filtros (botón de sliders)
Puedes abrir el panel de **Filtros** y filtrar por:

- **Período**: todo / este mes / mes pasado / este año.
- **Bolsillo destino**:
  - si no tienes pareja: opciones limitadas a lo personal
  - si tienes pareja: aparece fondo común/personal según aplique
- **Pagado por**:
  - si tienes pareja: puedes elegir “Yo” / “Pareja” / “Cualquiera”
- **Estado**:
  - “Pendiente” o “Liquidado” (según aplique)

En el modal también puedes:
- **Aplicar** filtros
- **Limpiar filtros** (vuelve a “Todo”)

### Acciones dentro del historial
- **Editar** un movimiento (cuando está permitido).
- **Eliminar** un movimiento:
  - al tocar eliminar aparece un modal de confirmación
  - explica que es irreversible y que ajustará saldos

---

## 4) Categorías – `/categories`

Esta pantalla reemplaza la idea de “categorías como simple icono” por un módulo donde el usuario puede **organizar** qué categorías están activas y cómo se llaman.

Qué puedes hacer:

1. **Ver la lista de categorías**
   - Se muestran con su icono.
2. **Renombrar**
   - Puedes editar el nombre de una categoría.
3. **Archivar / Activar**
   - Si archivas una categoría, deja de aparecer en el selector dentro de “Agregar gasto”.
   - Si la activas, vuelve a estar disponible.

El objetivo es que el selector de categoría en la app sea:
- más rápido,
- más personal,
- y consistente con tu presupuesto.

---

## 5) Presupuesto – `/budget` (MVP)

El objetivo del Presupuesto es que puedas definir un **límite mensual por categoría** y ver el progreso.

Pantalla principal:

1. **Header del mes**
   - Puedes cambiar entre meses anterior/siguiente.
   - Botón para volver al mes actual.
2. **Resumen**
   - Monto total gastado en categorías (del mes seleccionado).
   - Total presupuestado (si ya definiste límites).
   - Restante (presupuesto - gastado).
3. **Por categoría**
   - Lista de categorías activas.
   - Para cada categoría:
     - gastado del mes
     - límite definido (si existe)
     - progreso con barra
     - estado: OK / Cerca / Excedido

Acciones:
- Toca una categoría para **definir o editar** su límite mensual.
- Puedes **copiar el presupuesto del mes anterior** (si existía).

Al ser MVP:
- el presupuesto se calcula con base en los gastos registrados y su fecha.
- se excluyen movimientos que no se consideran gasto “de consumo” (como aportes/transferencias del sistema).

---

## 6) Tarjetas – `/cards` (próximamente)

Por ahora esta pantalla es un placeholder:
- muestra un estado “Próximamente”
- indica que podrás vincular tarjetas y ver saldos en un solo lugar.

---

## 7) Perfil / Ajustes – `/profile`

Aquí se gestiona la configuración de la cuenta.

Sección **Familia**:
- Si estás en pareja: se muestra el estado del espacio compartido.
- Si eres individual: se muestra el **código de invitación** para unirte a una pareja.
- Puedes ingresar un código para unirte (formulario dentro del apartado).

Sección **Preferencias**:
- Controles de tema y servicios de la app (por ejemplo, notificaciones/seguridad/moneda).
- Acceso a **Categorías** (Administrar).

---

## 8) Onboarding – `/onboarding`

Para usuarios nuevos o cuando no tienes familia configurada.

Pasos principales:

1. **Elegir modo**
   - Cuenta individual
   - Unirme a mi pareja
2. Si eliges **Cuenta Individual**
   - Se genera tu **código de invitación**
   - Puedes copiarlo
   - Luego entras al **dashboard**
3. Si eliges **Unirme a mi pareja**
   - Pegas o escribes un código de 6 caracteres
   - Validación y unión
   - Terminas y vuelves al dashboard

---

## 9) Login – `/login`

Pantalla de inicio de sesión:
- Correo
- Contraseña

Si el login es correcto, la app te redirige al dashboard.

Si falla, muestra el mensaje de error.

---

## 10) Register – `/register`

Pantalla de creación de cuenta:
- Nombre
- Correo
- Contraseña

Después de registrarte:
- aparece un estado de “revisa tu bandeja”
- te dirige a volver a iniciar sesión cuando confirmes tu correo.

---

## 11) Admin – `/admin`

Solo accesible para administradores autorizados.

Incluye:
- Métricas globales de la plataforma (usuarios, familias, gastos, premium).
- Panel de “campaña” que puede otorgar premium automáticamente por un periodo.

---

# Resumen rápido de “qué hacer” según la pantalla

- **Inicio**: ver saldo y actividad; registrar gasto; aportar al fondo (pareja).
- **Agregar gasto**: registrar/editar un movimiento con monto + concepto + categoría + fecha.
- **Historial**: ver movimientos y filtrar; editar o eliminar cuando aplique.
- **Categorías**: renombrar y activar/archivar para personalizar tu experiencia.
- **Presupuesto**: definir límites mensuales por categoría y seguir el progreso.
- **Perfil**: configuración, acceso a categorías y código de invitación.
- **Onboarding / Login / Register**: flujo de entrada a la cuenta.
- **Admin**: métricas y campaña (solo admin).

