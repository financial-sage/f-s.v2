# Domain Services

## Propósito

Este documento define las capacidades del dominio de SinDescuadre.

En el contexto de este proyecto, un Domain Service representa una capacidad de negocio que no pertenece de forma natural a una única entidad o agregado y que requiere la colaboración de diferentes conceptos del dominio.

Este documento no describe clases ni implementaciones técnicas.

Describe responsabilidades del negocio que deberán respetarse independientemente de la tecnología utilizada.

---

# Principios

Los Domain Services de SinDescuadre siguen los siguientes principios:

- Representan capacidades del dominio.
- No almacenan estado.
- No conocen detalles de infraestructura.
- No dependen de interfaces de usuario.
- Transforman información en conocimiento.
- Colaboran con entidades, agregados y objetos de valor sin reemplazar sus responsabilidades.

---

# Capacidades del dominio

## Construcción de la Financial Reality

### Propósito

Construir una representación coherente de la situación financiera actual de la familia.

### Entradas

- Family
- Financial Events
- Goals
- Commitments

### Resultado

- Financial Reality

Esta capacidad constituye el punto de partida del razonamiento financiero.

---

## Construcción del Decision Context

### Propósito

Identificar únicamente la información relevante para la siguiente decisión.

### Entradas

- Financial Reality

### Resultado

- Decision Context

El objetivo consiste en eliminar ruido y conservar únicamente aquello que puede influir en la decisión.

---

## Evaluación de decisiones

### Propósito

Determinar cuál es la decisión más importante para la familia en el momento actual.

### Entradas

- Decision Context

### Resultado

- Decision

Esta capacidad analiza prioridades, riesgos, oportunidades y objetivos para generar una única decisión prioritaria.

---

## Generación de Guidance

### Propósito

Transformar una decisión en una orientación clara y comprensible para la familia.

### Entradas

- Decision

### Resultado

- Guidance

El objetivo no es ordenar acciones, sino facilitar la toma de decisiones mediante explicaciones contextualizadas.

---

## Detección de cambios significativos

### Propósito

Determinar si un nuevo evento modifica de forma relevante la realidad financiera.

### Entradas

- Financial Event
- Financial Reality

### Resultado

- Significant Change

No todos los eventos requieren una nueva evaluación del dominio.

Esta capacidad identifica aquellos cambios que justifican reiniciar el proceso de razonamiento.

---

# Colaboración entre capacidades

Las capacidades del dominio forman una cadena de transformación de conocimiento.

Financial Events
        │
        ▼
Financial Reality
        │
        ▼
Decision Context
        │
        ▼
Decision
        │
        ▼
Guidance

Cada capacidad recibe información, la interpreta y genera un nuevo conocimiento para la siguiente etapa del proceso.

---

# Responsabilidades

Los Domain Services son responsables de:

- Coordinar conocimiento del dominio.
- Aplicar reglas que involucran múltiples conceptos.
- Transformar hechos en información útil.
- Mantener la coherencia del proceso de razonamiento.

No son responsables de:

- Persistir datos.
- Acceder directamente a bases de datos.
- Gestionar autenticación.
- Enviar notificaciones.
- Renderizar interfaces de usuario.
- Orquestar procesos de infraestructura.

---

# Relación con el Core Domain

La mayor parte de las capacidades descritas en este documento pertenecen al Decision Support Context.

Aquí reside la principal ventaja competitiva de SinDescuadre.

El valor del producto no consiste únicamente en registrar información financiera, sino en interpretarla y convertirla en orientación útil para las familias.

---

# Principios arquitectónicos

Los Domain Services deben cumplir siempre las siguientes reglas:

- Cada capacidad debe tener una única responsabilidad.
- Las entidades mantienen sus propias invariantes.
- Los Domain Services coordinan, no reemplazan, el comportamiento de las entidades.
- Ninguna capacidad debe depender de detalles tecnológicos.
- El razonamiento pertenece al dominio, no a la aplicación.

---

# Resumen

Los Domain Services representan las capacidades de negocio que permiten transformar hechos financieros en decisiones útiles.

No describen implementaciones técnicas, sino responsabilidades del dominio que deberán mantenerse independientemente de la arquitectura utilizada.

Su propósito es coordinar el proceso de razonamiento financiero que constituye el núcleo de SinDescuadre.