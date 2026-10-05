# Bounded Contexts

## Propósito

Este documento define los límites conceptuales del dominio de SinDescuadre.

Un Bounded Context representa un espacio del dominio donde el lenguaje, las reglas de negocio y los modelos tienen un significado único y consistente.

Su objetivo no es dividir la aplicación en módulos técnicos, sino proteger el conocimiento del negocio y evitar ambigüedades entre conceptos que evolucionan de forma diferente.

Los Bounded Contexts son una herramienta para mantener un modelo de dominio claro, escalable y alineado con la realidad financiera de las familias.

---

# Principios

La definición de los Bounded Contexts de SinDescuadre sigue los siguientes principios:

- Cada contexto representa una conversación de negocio diferente.
- Un concepto debe tener un único significado dentro de su contexto.
- Cada contexto tiene una responsabilidad claramente definida.
- Los contextos colaboran entre sí, pero mantienen su autonomía.
- Los límites del dominio nunca se definen por pantallas, funcionalidades o tecnologías.

---

# Contextos del dominio

## Family Context

### Propósito

Representar la composición y estructura de la unidad familiar.

Este contexto responde a la pregunta:

> ¿Quién forma parte de esta realidad financiera?

### Responsabilidades

- Gestionar la familia.
- Gestionar los miembros.
- Representar roles y relaciones.
- Mantener la consistencia de la estructura familiar.

### Conceptos principales

- Family
- Family Member
- Household
- Relationship
- Role

### No pertenece a este contexto

- Ingresos.
- Gastos.
- Objetivos financieros.
- Recomendaciones.

---

## Financial Context

### Propósito

Registrar los hechos económicos de la familia.

Este contexto responde a la pregunta:

> ¿Qué está ocurriendo financieramente?

Su responsabilidad termina cuando la información ha sido registrada correctamente.

No interpreta los datos.

### Responsabilidades

- Registrar movimientos.
- Gestionar cuentas.
- Gestionar ingresos.
- Gestionar gastos.
- Gestionar activos.
- Gestionar pasivos.
- Gestionar compromisos financieros.

### Conceptos principales

- Account
- Movement
- Income
- Expense
- Asset
- Liability
- Commitment

### No pertenece a este contexto

- Riesgo financiero.
- Salud financiera.
- Prioridades.
- Decisiones.
- Recomendaciones.

---

## Planning Context

### Propósito

Representar aquello que la familia desea conseguir.

Este contexto responde a la pregunta:

> ¿Hacia dónde quiere avanzar la familia?

Su función es modelar los objetivos financieros sin decidir si son viables o prioritarios.

### Responsabilidades

- Gestionar objetivos.
- Gestionar planes de ahorro.
- Gestionar hitos.
- Medir el progreso.

### Conceptos principales

- Goal
- Savings Plan
- Milestone
- Progress

### No pertenece a este contexto

- Interpretación financiera.
- Priorización.
- Guidance.

---

## Decision Support Context

### Propósito

Construir una comprensión de la realidad financiera y generar orientación para la familia.

Este es el Core Domain de SinDescuadre.

Su responsabilidad consiste en transformar información dispersa en conocimiento útil para la toma de decisiones.

Responde a la pregunta:

> ¿Qué significa la situación actual y cuál es la decisión más importante en este momento?

### Responsabilidades

- Construir la Financial Reality.
- Construir el Decision Context.
- Detectar cambios significativos.
- Priorizar decisiones.
- Evaluar riesgos.
- Identificar oportunidades.
- Generar Guidance.

### Conceptos principales

- Financial Reality
- Decision Context
- Decision
- Guidance
- Financial Health
- Decision Capacity
- Risk Profile
- Opportunity
- Significant Change

### No pertenece a este contexto

- Persistencia.
- Interfaces de usuario.
- Presentación de datos.
- Gestión de autenticación.

---

# Relación entre contextos

Los Bounded Contexts colaboran para construir una comprensión completa de la realidad financiera.

El flujo conceptual del dominio puede representarse de la siguiente manera:

Family Context
        │
        ▼
Financial Context
        │
        ▼
Planning Context
        │
        ▼
Decision Support Context

Los tres primeros contextos aportan información.

El Decision Support Context transforma esa información en conocimiento y orientación.

---

# Core Domain

No todos los contextos tienen el mismo valor estratégico.

## Core Domain

- Decision Support Context

Aquí reside la principal ventaja competitiva de SinDescuadre.

Es el lugar donde se interpreta la realidad financiera y se generan decisiones útiles para las familias.

## Supporting Domains

- Family Context
- Financial Context
- Planning Context

Estos contextos proporcionan la información necesaria para alimentar el Core Domain.

Aunque son esenciales para el funcionamiento del sistema, no representan el elemento diferenciador del producto.

---

# Principios arquitectónicos

Los Bounded Contexts de SinDescuadre deben respetar las siguientes reglas:

- Ningún contexto accede directamente al modelo interno de otro contexto.
- La colaboración entre contextos debe realizarse mediante contratos explícitos.
- Cada contexto puede evolucionar sin modificar el modelo interno de los demás.
- Ningún contexto debe asumir responsabilidades que pertenezcan a otro.
- La tecnología nunca define los límites del dominio.

---

# Resumen

SinDescuadre organiza su dominio mediante Bounded Contexts que representan conversaciones de negocio independientes.

Cada contexto posee un lenguaje propio, una responsabilidad específica y un modelo coherente.

El núcleo del sistema es el **Decision Support Context**, responsable de transformar hechos financieros en conocimiento útil para ayudar a las familias a tomar mejores decisiones.

Esta organización garantiza que el dominio permanezca claro, mantenible y alineado con la filosofía del producto.