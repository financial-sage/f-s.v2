# Architecture

## Introducción

La arquitectura de SinDescuadre nace de una idea muy sencilla:

> **Las familias no necesitan más datos financieros. Necesitan comprender su realidad para tomar mejores decisiones.**

Toda la arquitectura del sistema existe para convertir información financiera en comprensión.

Cada componente, cada servicio y cada módulo debe contribuir a este objetivo.

---

# Nuestra responsabilidad

El propósito de la arquitectura no es almacenar movimientos.

No es calcular presupuestos.

No es generar gráficos.

Su responsabilidad es construir una representación fiel de la realidad financiera de una familia y utilizar esa comprensión para acompañarla en la toma de decisiones.

---



# El recorrido de la información

Todo comienza con un acontecimiento que modifica la realidad de una familia.

Ese acontecimiento inicia un proceso de interpretación que transforma datos en orientación.

El flujo conceptual es el siguiente:

Realidad

↓

Domain Events

↓

Financial Reality Model

↓

Context Builder

↓

Decision Engine

↓

Opportunity Engine

↓

Guidance Engine

↓

Experiencia de usuario

Cada etapa tiene una responsabilidad única y añade una nueva capa de valor.

---



# Organización de la arquitectura

La documentación técnica se organiza en distintas áreas de responsabilidad.

## domain/

Describe el modelo de negocio.

Aquí viven los conceptos fundamentales del dominio, el lenguaje común, los eventos, los agregados y el modelo de decisión.

Responde a la pregunta:

**¿Qué existe dentro de SinDescuadre?**

---



## application/

Describe los casos de uso del sistema.

Responde a la pregunta:

**¿Qué puede hacer el sistema?**

---



## infrastructure/

Describe la implementación técnica y las integraciones.

Responde a la pregunta:

**¿Cómo interactúa el sistema con el mundo exterior?**

---



## ai/

Describe cómo los modelos de inteligencia artificial participan en la interpretación, el razonamiento y la generación de orientación.

Responde a la pregunta:

**¿Cómo ampliamos la capacidad de comprensión del sistema?**

---



## roadmap/

Describe la evolución técnica prevista para la plataforma.

Responde a la pregunta:

**¿Hacia dónde evoluciona la arquitectura?**

---



## implementation/

Describe cómo se materializa la arquitectura en el código: estructura del proyecto, modelo de datos, ciclo de vida de las peticiones, despliegue y decisiones técnicas.

Responde a la pregunta:

**¿Cómo está construido el sistema?**

---



# Principios arquitectónicos

Toda decisión técnica debe respetar los siguientes principios:

- El dominio siempre tiene prioridad sobre la tecnología.
- La comprensión es más importante que el almacenamiento de datos.
- Cada componente debe tener una única responsabilidad.
- Las decisiones deben partir siempre de una Financial Reality interpretada.
- La experiencia de usuario nunca contiene lógica de negocio.
- El lenguaje del dominio debe mantenerse coherente en toda la plataforma.

---



# Una arquitectura orientada al razonamiento

SinDescuadre no es un gestor de movimientos financieros.

Es un sistema de apoyo para la toma de decisiones financieras familiares.

Por este motivo, la arquitectura no está organizada alrededor de bases de datos, pantallas o APIs.

Está organizada alrededor del proceso de comprender, interpretar, priorizar y acompañar.

Ese proceso constituye el verdadero núcleo del sistema y debe permanecer estable incluso cuando cambien las tecnologías o las interfaces de usuario.