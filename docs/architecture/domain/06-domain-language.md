# Domain Language

## Propósito

Este documento define el Lenguaje Ubicuo (Ubiquitous Language) de SinDescuadre.

Su objetivo es garantizar que todas las personas involucradas en el desarrollo del producto —negocio, diseño, desarrollo e inteligencia artificial— utilicen los mismos conceptos con el mismo significado.

El lenguaje del dominio es parte de la arquitectura.

Cuando un concepto cambia de significado, cambia el dominio.

Por esta razón, todos los documentos, conversaciones y decisiones técnicas deben respetar el lenguaje definido aquí.

---

# Principios

El lenguaje del dominio de SinDescuadre sigue los siguientes principios:

- Cada concepto tiene un único significado.
- Cada término representa una idea del negocio, no una implementación técnica.
- Los nombres describen el dominio, nunca la tecnología.
- Si dos conceptos necesitan significados diferentes, deben tener nombres diferentes.
- El código debe hablar el mismo idioma que la documentación.

---

# Conceptos fundamentales

## Family

Representa la unidad financiera sobre la que trabaja SinDescuadre.

No hace referencia únicamente a vínculos familiares tradicionales.

Puede representar una persona, una pareja o cualquier grupo que comparta decisiones económicas.

---

## Financial Event

Cualquier acontecimiento que modifica la realidad económica de la familia.

Ejemplos:

- Recepción de un salario.
- Pago de una factura.
- Compra inesperada.
- Cancelación de una deuda.

Los eventos representan hechos.

Nunca interpretaciones.

---

## Financial Reality

Representación interpretada de la situación financiera actual.

No es una colección de datos.

Es la comprensión que el sistema tiene de la realidad económica de la familia en un momento determinado.

---

## Decision Context

Conjunto de factores relevantes para tomar una decisión.

No toda la información forma parte del contexto.

Solo aquella que puede modificar la decisión.

---

## Decision

Conclusión obtenida por el dominio después de analizar la realidad financiera.

Una decisión representa el criterio del sistema.

Todavía no es un mensaje para el usuario.

---

## Guidance

Explicación comprensible de una decisión.

Su propósito consiste en acompañar a la familia.

Nunca imponer una acción.

---

## Goal

Resultado financiero que la familia desea alcanzar.

Un objetivo puede evolucionar con el tiempo y cambiar de prioridad.

---

## Commitment

Obligación financiera futura que condiciona la capacidad de decisión de la familia.

Ejemplos:

- Hipoteca.
- Préstamo.
- Matrícula escolar.
- Seguro anual.

---

## Significant Change

Cambio suficientemente relevante como para justificar una nueva evaluación de la realidad financiera.

No todos los eventos generan un cambio significativo.

---

## Opportunity

Situación detectada por el dominio donde la familia podría mejorar su realidad financiera.

Una oportunidad nunca representa una obligación.

Representa una posibilidad.

---

## Risk

Situación que puede comprometer la estabilidad financiera de la familia.

El riesgo forma parte de la interpretación del dominio.

No de los datos registrados.

---

# Reglas del lenguaje

Para mantener la coherencia del dominio, SinDescuadre adopta las siguientes reglas:

- Nunca utilizar términos técnicos para describir conceptos de negocio.
- Evitar sinónimos cuando ya existe un término oficial.
- Mantener el mismo nombre en documentación, código e interfaz cuando sea posible.
- Toda nueva funcionalidad debe reutilizar el lenguaje existente antes de crear nuevos conceptos.

---

# Evolución del lenguaje

El lenguaje del dominio evoluciona junto con el producto.

Cuando aparezca un nuevo concepto relevante deberá:

1. Tener una definición clara.
2. No duplicar el significado de otro concepto existente.
3. Ser incorporado a este documento antes de utilizarse en el resto del proyecto.

---

# Resumen

El Lenguaje Ubicuo es la base de comunicación de SinDescuadre.

Permite que negocio, diseño, desarrollo e inteligencia artificial compartan un mismo modelo mental del dominio.

La claridad del lenguaje reduce la complejidad del sistema y garantiza que todas las decisiones se construyan sobre conceptos consistentes.