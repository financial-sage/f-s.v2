# 🧪 Matriz de Pruebas Definitiva - SinDescuadre

> **Objetivo:** Validar la estabilidad de la PWA, la precisión del motor contable inmutable y la fluidez de la interfaz de usuario en dispositivos móviles.

---

## 🟢 1. Pruebas de Interfaz (UI) y Layout Líquido
*Evaluar la PWA en un dispositivo móvil real (o emulador estricto).*

- [x] **El Estado Vacío (Empty State):** Borrar todos los gastos. ¿Aparece el ticket en el centro con la animación de latido verde y el texto centrado?
- [ ] **Comportamiento 1 a 4 Gastos:** Agregar de 1 a 4 gastos. ¿Mantienen su altura fija (`py-4`) y queda un espacio blanco limpio al final?
- [ ] **Comportamiento 5 Gastos:** Agregar exactamente 5 gastos. ¿Se estiran dinámicamente (`flex-1`) ocupando el 100% de la tarjeta sin dejar huecos en blanco?
- [ ] **Scroll Controlado:** Agregar 6 o más gastos. ¿La pantalla global (`100dvh`) se mantiene estática y el scroll ocurre *únicamente* dentro de la tarjeta blanca?
- [ ] **Colisión del Dock:** Hacer scroll hasta el fondo de la lista. ¿El último gasto se visualiza completamente por encima del menú de navegación inferior?

---

## 🔵 2. Pruebas de Micro-interacciones (Tap-to-reveal)
*Evaluar la respuesta táctil y las animaciones de las filas.*

- [ ] **Apertura Fluida:** Tocar un gasto. ¿Se encoge suavemente (efecto scale) y revela los botones Editar (Azul) y Eliminar (Rojo) desde la derecha?
- [ ] **Acordeón Exclusivo:** Con un gasto activo, tocar uno diferente. ¿Se cierra el primero automáticamente y se abre el nuevo sin saltos visuales?
- [ ] **Cierre Manual:** Volver a tocar el gasto que está activo. ¿Se oculta el menú lateral y la fila recupera su tamaño original?

---

## 🟣 3. Pruebas del Motor Contable Inmutable
*Validar el Event Sourcing, edición y eliminación (Database & UI).*

- [ ] **Doble Propósito (Crear):** Tocar el botón (+) del Dock. ¿El modal indica "Nuevo Gasto" y todos sus campos están limpios?
- [ ] **Pre-llenado (Editar):** Abrir el menú lateral de un gasto y tocar el Lápiz Azul. ¿El modal indica "Editar Gasto" y precarga correctamente el monto, concepto y categoría?
- [ ] **Transacción Atómica (RPC):** Cambiar el monto de un gasto (ej. de $20 a $50) y actualizar.
  - [ ] ¿El modal se cierra y la UI muestra el nuevo valor instantáneamente?
  - [ ] *[Auditoría DB]* ¿Supabase refleja 3 registros para este evento (Original inactivo, Reversión inactiva, Nuevo activo)?
- [ ] **Eliminación:** Tocar el icono de Basurero en un gasto. ¿Desaparece de la lista inmediatamente y se actualizan los saldos generales?

---

## 🟠 4. Pruebas Matemáticas (Cálculos P2P y Fondo)
*Asegurar que la lógica de negocio suma y resta donde corresponde.*

- [ ] **Gasto Personal:** Crear un gasto donde "TÚ" pagas y "TÚ" eres responsable. ¿La notificación de Liquidar (punto rojo) permanece apagada?
- [ ] **Deuda a tu favor (P2P):** Crear un gasto donde "TÚ" pagas y "TU PAREJA" es responsable ($30). ¿El panel de liquidación indica que tu pareja te debe $30?
- [ ] **Deuda en contra (P2P):** Crear un gasto donde "TU PAREJA" paga y "TÚ" eres responsable ($15). ¿El panel