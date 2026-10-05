# Technical Decisions

## Propósito

Este documento recopila las decisiones técnicas relevantes adoptadas durante la evolución de SinDescuadre.

No pretende justificar tecnologías concretas, sino registrar las razones por las que determinadas decisiones fueron tomadas.

Constituye la memoria técnica del proyecto.

---

# Principios

Las decisiones técnicas deben:

- responder a una necesidad real,
- respetar el dominio,
- minimizar la complejidad,
- facilitar la evolución,
- evitar dependencias innecesarias.

---

# Decisiones actuales

## Arquitectura

- Domain-Driven Design como enfoque principal.
- Separación clara entre dominio e infraestructura.
- Arquitectura orientada al conocimiento.

---



## Frontend

- Next.js como framework principal.
- React Server Components cuando aporten valor.
- Server Actions para operaciones del dominio.

---



## Backend

- Lógica de aplicación integrada en Next.js.
- Casos de uso desacoplados del framework.
- Servicios especializados para el dominio.

---



## Persistencia

- PostgreSQL mediante Supabase.
- Row Level Security.
- Migraciones versionadas.

---



## Autenticación

- Supabase Auth.
- Contexto autenticado independiente del dominio.

---



## Inteligencia Artificial

- IA como capa de asistencia.
- El dominio mantiene el control del razonamiento.
- Arquitectura independiente del proveedor de IA.

---



## Calidad

- TypeScript en modo estricto.
- Validación de entrada.
- Arquitectura guiada por documentación.
- Seguridad como principio transversal.

---



# Registro de decisiones futuras

Toda decisión relevante deberá registrar:

## Fecha

Momento en que se adopta la decisión.

---



## Contexto

Problema que motiva la decisión.

---



## Alternativas consideradas

Opciones evaluadas.

---



## Decisión adoptada

Solución seleccionada.

---



## Consecuencias

Impacto esperado sobre el producto.

---



# Evolución

Las decisiones podrán modificarse cuando aparezcan alternativas claramente superiores.

Toda modificación deberá quedar documentada para preservar el conocimiento del proyecto.

---



# Resumen

El documento de decisiones técnicas permite comprender la evolución de la arquitectura de SinDescuadre, registrando el contexto y la motivación de cada decisión importante para facilitar el mantenimiento y el crecimiento del producto.