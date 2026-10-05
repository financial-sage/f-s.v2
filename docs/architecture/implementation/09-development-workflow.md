# Development Workflow

## Propósito

Este documento define el proceso de desarrollo de SinDescuadre.

Su objetivo es garantizar que todas las funcionalidades evolucionen de forma coherente con el dominio, la arquitectura y la visión del producto.

El desarrollo está guiado por decisiones previamente documentadas y no por la implementación directa de código.

---

# Principios

El proceso de desarrollo sigue los siguientes principios:

- El dominio guía el desarrollo.
- La documentación precede al código.
- La arquitectura precede a la implementación.
- La calidad tiene prioridad sobre la velocidad.
- Todo cambio debe poder justificarse.

---



# Filosofía

SinDescuadre adopta un enfoque de **Documentation Driven Development (DDD²)**.

Toda funcionalidad importante nace como una idea, se documenta, se valida y finalmente se implementa.

El código representa la materialización de decisiones previamente acordadas.

---



# Ciclo de desarrollo

Toda funcionalidad sigue el mismo recorrido.

```text
Idea
    │
    ▼
Investigación
    │
    ▼
Documentación
    │
    ▼
Diseño del caso de uso
    │
    ▼
Diseño técnico
    │
    ▼
Implementación
    │
    ▼
Pruebas
    │
    ▼
Revisión
    │
    ▼
Despliegue
    │
    ▼
Observación
```

---



# 1. Idea

Toda funcionalidad comienza con una necesidad del usuario o del negocio.

Nunca comienza escribiendo código.

---



# 2. Investigación

Se analiza el problema.

Se identifican:

- necesidades,
- impacto,
- restricciones,
- alternativas.

---



# 3. Documentación

Antes de implementar una funcionalidad se actualiza la documentación correspondiente.

Puede afectar a:

- dominio,
- arquitectura,
- implementación,
- seguridad.

---



# 4. Diseño del caso de uso

Se define:

- objetivo,
- entradas,
- salidas,
- reglas de negocio,
- eventos del dominio,
- impacto sobre otros módulos.

---



# 5. Diseño técnico

Solo después de comprender el dominio se decide:

- estructura,
- componentes,
- persistencia,
- integración,
- interfaz.

---



# 6. Implementación

La implementación debe limitarse a trasladar al código las decisiones previamente documentadas.

No se introducen nuevas reglas de negocio durante esta fase sin actualizar la documentación.

---



# 7. Pruebas

Toda funcionalidad debe verificarse.

Se priorizan:

- pruebas del dominio,
- casos de uso,
- integración,
- experiencia de usuario.

---



# 8. Revisión

Todo cambio significativo debe revisarse.

La revisión evalúa:

- claridad,
- coherencia,
- simplicidad,
- alineación con la arquitectura.

---



# 9. Despliegue

Solo las funcionalidades verificadas y revisadas se incorporan al entorno correspondiente.

---



# 10. Observación

Tras el despliegue se monitoriza:

- funcionamiento,
- errores,
- rendimiento,
- experiencia de usuario,
- impacto sobre el dominio.

---



# Gestión del código

El repositorio mantiene una única fuente de verdad.

Las ramas de trabajo representan cambios aislados que se integran únicamente tras superar el proceso de revisión.

---



# Gestión de la documentación

Toda decisión relevante debe reflejarse en la documentación.

La documentación forma parte del producto y evoluciona junto con el código.

---



# Uso de inteligencia artificial

La IA constituye una herramienta de apoyo al desarrollo.

Puede utilizarse para:

- explorar alternativas,
- generar prototipos,
- revisar código,
- mejorar documentación,
- automatizar tareas repetitivas.

La responsabilidad de las decisiones técnicas permanece siempre en el equipo de desarrollo.

---



# Calidad

Antes de integrar cualquier cambio deberán responderse las siguientes preguntas:

- ¿Respeta el dominio?
- ¿Respeta la arquitectura?
- ¿Respeta la seguridad?
- ¿Es suficientemente simple?
- ¿La documentación está actualizada?

Si alguna respuesta es negativa, el cambio deberá revisarse.

---



# Evolución

El proceso de desarrollo podrá adaptarse con el crecimiento del equipo.

Los principios definidos en este documento deberán mantenerse independientemente de las herramientas utilizadas.

---



# Resumen

El Development Workflow garantiza que SinDescuadre evolucione mediante un proceso disciplinado, donde la documentación, el dominio y la arquitectura guían el desarrollo antes de escribir una sola línea de código.