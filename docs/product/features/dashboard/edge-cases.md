# Dashboard · Edge Cases

## Propósito

Este documento recoge situaciones excepcionales o poco frecuentes que el Dashboard debe gestionar de forma coherente para mantener una experiencia fiable y útil.

El objetivo no es cubrir errores técnicos, sino garantizar que la experiencia siga siendo comprensible incluso cuando la realidad financiera presenta casos atípicos o información incompleta.

---

# Principios generales

Ante cualquier situación excepcional, el Dashboard debe:

- evitar conclusiones precipitadas;
- explicar el contexto disponible;
- reconocer la incertidumbre cuando exista;
- mantener la confianza del usuario.

---

# Casos identificados

## 1. Sin información suficiente

La familia todavía no ha registrado información relevante.

El Dashboard debe ayudar a construir la realidad financiera, evitando mostrar indicadores sin significado.

---

## 2. Hechos financieros extraordinarios

Un movimiento aislado de gran importe no debe generar automáticamente conclusiones sobre la situación financiera.

El sistema esperará disponer de suficiente contexto antes de modificar recomendaciones relevantes.

---

## 3. Recomendaciones en conflicto

Cuando existan varias recomendaciones incompatibles entre sí, el Decision Engine deberá priorizarlas antes de mostrarlas.

El Dashboard nunca presentará recomendaciones contradictorias como igualmente válidas.

---

## 4. Largos periodos de inactividad

Si la familia vuelve tras un periodo prolongado sin utilizar el producto, el Dashboard deberá indicar que la realidad financiera necesita actualizarse antes de generar nuevas conclusiones.

---

## 5. Información incompleta

Cuando el sistema no disponga de datos suficientes para responder una pregunta, deberá reconocer explícitamente esa limitación y solicitar la información necesaria.

---

## 6. Situaciones financieras inusuales

Realidades como ingresos irregulares, capacidad negativa o compromisos superiores a los ingresos deberán mostrarse sin asumir errores, ofreciendo contexto antes que juicios.

---

## 7. Ausencia de cambios relevantes

Si no existen novedades importantes, el Dashboard podrá comunicar que la situación permanece estable en lugar de generar información artificial.

---

## 8. Cambios simultáneos

Cuando varios acontecimientos importantes ocurran en un corto periodo de tiempo, el Dashboard deberá priorizar su presentación según el impacto sobre la realidad financiera.

---

# Evolución

Nuevos Edge Cases podrán incorporarse conforme se identifiquen situaciones reales durante el desarrollo y el uso del producto.

---

# Resumen

El Dashboard debe mantener una experiencia consistente incluso en escenarios poco habituales, priorizando siempre la claridad, la prudencia y la transparencia frente a la automatización excesiva.