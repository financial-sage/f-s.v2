# AI Architecture

## Propósito

Este documento define el papel de la inteligencia artificial dentro de SinDescuadre.

La IA complementa el sistema de apoyo a la toma de decisiones, pero nunca sustituye al dominio ni constituye la fuente de verdad del producto.

Su función principal es facilitar la comprensión, comunicación y exploración del conocimiento generado por el Decision Engine.

---

# Principios

La integración de IA sigue los siguientes principios:

- El dominio genera el conocimiento.
- La IA interpreta y comunica ese conocimiento.
- La IA nunca modifica directamente el estado del dominio.
- Toda recomendación debe poder justificarse mediante hechos del dominio.

---



# Modelo conceptual

```text
Financial Facts
        │
        ▼
Financial Reality
        │
        ▼
Decision Engine
        │
        ▼
Guidance
        │
        ▼
AI Assistant
        │
        ▼
Usuario
```

La IA siempre trabaja sobre información ya interpretada.

Nunca sobre datos sin contexto.

---



# Responsabilidades de la IA

La IA puede:

- Explicar recomendaciones.
- Responder preguntas sobre la situación financiera.
- Traducir conceptos financieros a un lenguaje sencillo.
- Resumir información compleja.
- Ayudar a explorar escenarios.
- Facilitar la educación financiera.

---



# Responsabilidades del dominio

El dominio mantiene el control sobre:

- Financial Reality.
- Decision Context.
- Guidance.
- Reglas de negocio.
- Priorización.
- Evaluación de riesgos.

Estas capacidades nunca se delegan a un modelo de IA.

---



# Explicabilidad

Toda respuesta generada por IA debe poder responder a preguntas como:

- ¿Por qué se ha generado esta recomendación?
- ¿Qué hechos la respaldan?
- ¿Qué reglas del dominio se han aplicado?
- ¿Qué alternativas existen?

La IA debe reforzar la confianza del usuario, no sustituir su criterio.

---



# Contexto proporcionado a la IA

La IA recibirá únicamente la información necesaria para cada interacción.

Ejemplos:

- Resumen de la Financial Reality.
- Guidance vigente.
- Objetivos activos.
- Riesgos identificados.
- Información solicitada por el usuario.

No se enviará información innecesaria.

---



# Privacidad

Toda información compartida con un proveedor de IA deberá respetar la política de privacidad del producto.

Siempre que sea posible:

- se minimizará el contexto,
- se eliminarán datos innecesarios,
- se evitará compartir información identificable.

---



# Proveedores de IA

La arquitectura no depende de un proveedor concreto.

La implementación podrá utilizar distintos modelos según las necesidades del producto.

El dominio permanece completamente independiente de esta decisión.

---



# Casos de uso

La IA podrá utilizarse para:

- explicar una recomendación,
- responder preguntas financieras,
- comparar escenarios,
- resumir la evolución financiera,
- ayudar a interpretar indicadores,
- asistir en la planificación.

---



# Casos de uso no permitidos

La IA no podrá:

- modificar datos financieros,
- crear hechos del dominio,
- aprobar operaciones,
- sustituir las reglas de negocio,
- acceder directamente a la base de datos.

---



# Evolución

La arquitectura permite incorporar nuevos modelos o capacidades de IA sin modificar el dominio.

La IA evoluciona como un servicio de apoyo y no como el núcleo del sistema.

---



# Principio final

La inteligencia artificial existe para ayudar a las familias a comprender mejor su realidad financiera.

La responsabilidad de interpretar esa realidad pertenece siempre al dominio.

---



# Resumen

SinDescuadre utiliza la inteligencia artificial como un asistente especializado que mejora la experiencia del usuario, explica el conocimiento generado por el sistema y facilita la toma de decisiones, manteniendo siempre al dominio como la fuente de verdad.