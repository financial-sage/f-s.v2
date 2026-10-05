# Authentication

## Propósito

Este documento define cómo se gestiona la autenticación y autorización dentro de SinDescuadre.

La autenticación tiene como objetivo identificar a la persona que utiliza el sistema.

La autorización determina qué operaciones puede realizar dentro de una unidad financiera familiar.

El dominio permanece completamente independiente del mecanismo utilizado para autenticar usuarios.

---

# Principios

La autenticación sigue los siguientes principios:

- La identidad pertenece a la infraestructura.
- La autorización pertenece a la aplicación.
- El dominio nunca conoce Supabase Auth.
- Toda operación requiere un contexto autenticado.

---



# Modelo conceptual

SinDescuadre diferencia claramente cuatro conceptos.

```text
Persona
        │
        ▼
Identidad
        │
        ▼
Familia
        │
        ▼
Permisos
```

---



## Persona

Representa al individuo que utiliza la aplicación.

Es un concepto del negocio.

---



## Identidad

Representa el mecanismo técnico utilizado para autenticar a la persona.

Actualmente se implementa mediante Supabase Auth.

La identidad no pertenece al dominio.

---



## Familia

Representa la unidad financiera sobre la que se toman decisiones.

Toda la información financiera pertenece a una familia.

---



## Permisos

Determinan qué acciones puede realizar una persona dentro de una familia.

La autorización siempre se evalúa sobre una familia concreta.

---



# Flujo de autenticación

```text
Usuario

↓

Supabase Auth

↓

Session

↓

Application

↓

Current User Context

↓

Use Case

↓

Domain
```

El dominio nunca interactúa directamente con Supabase Auth.

---



# Contexto autenticado

Antes de ejecutar cualquier caso de uso, la aplicación construye un contexto autenticado.

Ejemplo conceptual:

- PersonId
- FamilyId
- MembershipId
- Permissions

Este contexto acompaña toda la ejecución del caso de uso.

---



# Responsabilidades



## Supabase Auth

Responsable de:

- autenticación,
- sesiones,
- recuperación de contraseña,
- proveedores externos,
- emisión de tokens.

---



## Application

Responsable de:

- validar la sesión,
- construir el contexto autenticado,
- verificar permisos,
- seleccionar la familia activa.

---



## Domain

Responsable únicamente de aplicar las reglas del negocio.

Nunca verifica tokens, cookies o sesiones.

---



# Autorización

Toda operación debe comprobar:

1. Existe una sesión válida.
2. La persona pertenece a la familia.
3. Posee permisos suficientes.
4. El caso de uso puede ejecutarse.

---



# Roles

Los roles representan capacidades dentro de la familia.

Ejemplos iniciales:

- Owner
- Adult
- Child
- Guest

Estos roles podrán evolucionar según las necesidades del producto.

---



# Gestión de múltiples familias

La arquitectura permite que una misma persona pertenezca a varias unidades familiares.

La aplicación mantiene siempre una familia activa sobre la que se ejecutan los casos de uso.

---



# Seguridad

La protección de los datos se realiza mediante:

- Supabase Auth.
- Row Level Security (RLS).
- Políticas de acceso.
- Validación de permisos en la aplicación.

La seguridad nunca depende únicamente del cliente.

---



# Cambios futuros

El mecanismo de autenticación podrá sustituirse sin modificar el dominio.

El resto del sistema solo conoce el contexto autenticado construido por la aplicación.

---



# Resumen

La autenticación identifica personas.

La autorización controla el acceso a una familia.

El dominio trabaja exclusivamente con un contexto autenticado y permanece completamente independiente de Supabase Auth.