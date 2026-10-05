# Architecture Principles

## Propósito

Este documento establece los principios arquitectónicos que deben guiar el desarrollo de SinDescuadre.

No define una tecnología concreta ni una implementación específica.

Define las reglas que garantizan que el sistema evolucione de forma coherente con el dominio y con la visión del producto.

Toda decisión técnica debe poder justificarse utilizando alguno de estos principios.

---

# Principio 1. El dominio es la fuente de verdad

El dominio representa el conocimiento del negocio.

Ninguna decisión técnica puede modificar las reglas del dominio.

Cuando exista un conflicto entre la tecnología y el modelo de negocio, deberá adaptarse la implementación, nunca el dominio.

---



# Principio 2. La tecnología es reemplazable

Next.js, Supabase, PostgreSQL o Vercel son decisiones de implementación.

El dominio no debe depender directamente de ninguna de estas tecnologías.

La sustitución de una herramienta no debe implicar reescribir el modelo de negocio.

---



# Principio 3. El código se organiza por capacidades del negocio

La estructura del proyecto refleja los Bounded Contexts definidos en el dominio.

No se organizará el código por tipo de archivo ni por framework.

Cada módulo encapsula una capacidad del negocio y evoluciona de forma independiente.

---



# Principio 4. Las dependencias siempre apuntan hacia el dominio

Las reglas de negocio no conocen detalles de infraestructura.

Presentation → Application → Domain

Infrastructure implementa los contratos definidos por el dominio y la aplicación.

---



# Principio 5. El dominio no conoce la interfaz de usuario

El dominio produce conocimiento.

La interfaz decide cómo presentarlo.

Una recomendación financiera debe poder mostrarse en:

- una página web,
- una aplicación móvil,
- un asistente conversacional,
- una API.

El dominio nunca depende del canal de presentación.

---



# Principio 6. La infraestructura implementa contratos

Supabase, almacenamiento, autenticación o servicios externos implementan contratos definidos por la aplicación o el dominio.

La infraestructura nunca contiene reglas de negocio.

---



# Principio 7. Cada módulo protege su autonomía

Los módulos representan capacidades independientes del negocio.

La comunicación entre módulos se realiza mediante contratos explícitos o eventos del dominio.

Ningún módulo accede directamente al estado interno de otro.

---



# Principio 8. Las reglas de negocio siempre son explícitas

Toda regla relevante debe residir en el dominio.

No se aceptarán reglas ocultas en:

- componentes React,
- Server Actions,
- consultas SQL,
- funciones auxiliares,
- middleware.

El comportamiento del negocio debe ser visible y fácil de localizar.

---



# Principio 9. La simplicidad tiene prioridad

Antes de introducir una nueva abstracción se responderán dos preguntas:

- ¿Resuelve un problema real del dominio?
- ¿Reduce la complejidad del sistema?

Si la respuesta es negativa, la abstracción no debe incorporarse.

---



# Principio 10. La arquitectura debe facilitar el razonamiento

La finalidad de la arquitectura no es impresionar técnicamente.

Su objetivo es permitir comprender cómo toma decisiones el sistema.

Una arquitectura sencilla y coherente tiene prioridad sobre una arquitectura compleja.

---



# Decisiones derivadas

Como consecuencia de estos principios:

- Se utilizará una arquitectura modular basada en Bounded Contexts.
- Cada módulo contendrá sus propias capas de Application, Domain, Infrastructure y Presentation.
- Los contratos se definirán cerca del dominio.
- Las implementaciones concretas permanecerán aisladas.
- La lógica de negocio nunca dependerá del framework.

---



# Revisión de decisiones

Toda decisión técnica significativa deberá responder, como mínimo, a estas preguntas:

1. ¿Respeta el modelo del dominio?
2. ¿Reduce o aumenta el acoplamiento?
3. ¿Facilita la evolución del sistema?
4. ¿Puede comprenderse con facilidad?
5. ¿Podría sustituirse la tecnología sin afectar al negocio?

Si alguna respuesta es negativa, la decisión deberá revisarse.

---



# Resumen

La arquitectura de SinDescuadre está guiada por principios y no por tecnologías.

El dominio constituye el núcleo del sistema y todas las decisiones de implementación deben proteger su independencia, claridad y capacidad de evolución.