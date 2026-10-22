# Recommendations · User Flow

## Propósito

Cómo la familia descubre propuestas de acción y balances sin cargar el scroll del Inicio y sin chat.

---

# Filosofía

El Inicio sigue respondiendo en segundos: ¿cómo estamos? El aviso suave solo indica que hay algo que mirar. El detalle y el “por qué” viven fuera del scroll principal.

---

# Flujo A — Aviso suave en Inicio (Fase 1)

## 1. Contexto

El miembro está en Inicio (Solo o Couple). Hero y módulos como siempre.

## 2. Descubrimiento

Si hay recomendaciones activas (`new` / relevantes), aparece un **aviso suave fuera del scroll** (p. ej. chip fijo o franja anclada, no una card en el listado de bolsillos).

Copy breve: p. ej. “1 recomendación” / “Tienes una sugerencia”.

## 3. Apertura

Al tocar, navega a la superficie de recomendaciones (lista) o abre el detalle de la más prioritaria.

## 4. Lectura

Ve: qué propone, por qué (hechos), impacto, prioridad.

## 5. Decisión

- **Aceptar** → estado `accepted` + CTA al flujo (ahorro, cuentas, historial, …).
- **Más tarde** → `deferred` (cooldown antes de insistir).
- **No aplica** → `dismissed`.

## 6. Cierre

Vuelve al Inicio; el aviso se actualiza (se oculta o baja el contador).

---

# Flujo B — Desde Perfil / superficie dedicada

## 1. Apertura

Perfil → enlace a recomendaciones (o ruta `/recommendations`).

## 2. Lista

Recomendaciones activas ordenadas por prioridad; acceso a historial reciente (opcional en Fase 1).

## 3. Detalle

Misma decisión que en Flujo A.

---

# Flujo C — Balance mes vs mes anterior (Fase 2)

## 1. Disparo

Automático al cierre de mes (o al entrar a la superficie tras el cambio de mes), si hay datos de N y N−1.

## 2. Contenido

Hechos: gasto, ingresos, ahorro neto, cambios relevantes en bolsillos/cuentas. Narrativa IA CARE.

## 3. Acción

Puede quedar como recomendación educativa / de oportunidad, o solo como informe de lectura con CTA opcional.

---

# Flujo D — “¿Cómo llevo los últimos X meses?” (Fase 3)

## 1. Entrada

En la superficie de recomendaciones / balances: selector **3 / 6 / 12 meses** (o rango permitido). No hay caja de chat.

## 2. Cálculo

El dominio agrega el periodo. Si faltan meses → mensaje de datos insuficientes.

## 3. Informe

La IA reconstruye un balance narrativo **solo** con esos agregados e hitos.

## 4. Salida

Lectura + CTAs opcionales (revisar ahorro, historial, orientación). Sin hilo de preguntas libres.

---

# Relación con Guidance

Guidance (“¿Qué significa?”) sigue disponible como explicación del momento. No sustituye la lista persistente ni el selector de periodo.
