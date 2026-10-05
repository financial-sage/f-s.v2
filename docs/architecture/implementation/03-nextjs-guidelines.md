# Next.js Guidelines

## Propósito

Este documento define cómo se utiliza Next.js dentro de SinDescuadre.

Su objetivo es garantizar un uso consistente del framework y aprovechar sus capacidades sin comprometer la arquitectura del dominio.

Las decisiones aquí descritas complementan los principios definidos en `02-architecture-principles.md`.

---

# Principios

El uso de Next.js debe seguir estas reglas:

- El dominio nunca depende del framework.
- Next.js facilita la implementación, no define el diseño del sistema.
- Se prioriza el renderizado en servidor cuando sea posible.
- El cliente solo incorpora lógica cuando aporta valor a la experiencia de usuario.

---



# App Router

SinDescuadre utiliza exclusivamente App Router.

La carpeta `src/app` contiene:

- Rutas.
- Layouts.
- Templates.
- Loading UI.
- Error Boundaries.

No contiene reglas de negocio.

---



# Server Components

Los Server Components son la opción por defecto.

Se utilizarán para:

- Obtener datos.
- Construir dashboards.
- Mostrar información.
- Componer pantallas.

Siempre que un componente no necesite interacción del navegador, permanecerá como Server Component.

---



# Client Components

Solo se utilizarán cuando sean realmente necesarios.

Ejemplos:

- Formularios interactivos.
- Gestión de estado visual.
- Drag & Drop.
- Animaciones.
- Hooks del navegador.

No deben contener reglas de negocio.

---



# Server Actions

Las Server Actions constituyen el mecanismo principal para ejecutar acciones iniciadas por el usuario.

Ejemplos:

- Registrar un gasto.
- Crear un objetivo.
- Actualizar información familiar.

Las Server Actions coordinan casos de uso.

No implementan lógica del dominio.

---



# Route Handlers

Los Route Handlers se utilizarán únicamente cuando exista una necesidad de exponer una API.

Ejemplos:

- Integraciones externas.
- Webhooks.
- APIs públicas.
- Comunicación con terceros.

No sustituirán Server Actions cuando no sea necesario.

---



# Acceso a datos

El acceso a Supabase nunca se realizará directamente desde componentes de presentación.

La infraestructura será responsable de implementar el acceso a los datos.

---



# Estado de la aplicación

Se minimizará el estado en el cliente.

Siempre que sea posible:

- los datos vivirán en el servidor,
- el cliente representará únicamente el estado de interacción.

---



# Validaciones

Las validaciones existirán en dos niveles:

Frontend

- Mejorar la experiencia del usuario.

Backend

- Garantizar la integridad del dominio.

Nunca se confiará únicamente en las validaciones del cliente.

---



# Caché

Se aprovecharán las capacidades de caché de Next.js cuando no comprometan la consistencia del dominio.

Las decisiones sobre caché deberán responder a las necesidades del negocio y no únicamente al rendimiento.

---



# Autenticación

La autenticación será responsabilidad de Supabase Auth.

Next.js actuará como intermediario para proteger rutas y obtener el usuario autenticado.

El dominio nunca conocerá detalles del mecanismo de autenticación.

---



# Componentes

Los componentes React deben cumplir las siguientes reglas:

- Una única responsabilidad.
- Tamaño reducido.
- Fácil reutilización.
- Sin lógica de negocio.

---



# Hooks

Los hooks personalizados encapsulan comportamiento de interfaz.

Nunca implementan reglas del dominio.

---



# Formularios

Los formularios representan la entrada de información al sistema.

Su responsabilidad consiste en:

- recoger datos,
- validar experiencia de usuario,
- ejecutar Server Actions.

---



# Errores

Los errores técnicos no deben llegar directamente al usuario.

La interfaz transformará los errores en mensajes comprensibles.

---



# Principios finales

Antes de desarrollar una nueva funcionalidad se responderán las siguientes preguntas:

- ¿Puede implementarse como Server Component?
- ¿Necesita realmente un Client Component?
- ¿Debe utilizar una Server Action?
- ¿Pertenece al dominio o únicamente a la interfaz?
- ¿La lógica está en el lugar correcto?

---



# Resumen

Next.js proporciona la infraestructura de presentación de SinDescuadre.

Su utilización debe respetar el dominio, minimizar la complejidad del cliente y aprovechar las capacidades del framework sin convertirlo en el centro de la arquitectura.