# 11. Security Architecture

## Propósito

La seguridad en SinDescuadre no es una característica adicional del sistema.

Forma parte de la propuesta de valor del producto.

Las familias depositan en SinDescuadre información extremadamente sensible sobre su realidad financiera, por lo que la protección de esos datos constituye una responsabilidad fundamental de toda la arquitectura.

Este documento establece los principios, responsabilidades y mecanismos que garantizan la confidencialidad, integridad, disponibilidad y trazabilidad de la información.

---

# Principios

Toda decisión relacionada con la seguridad deberá respetar los siguientes principios.

## Security by Design

La seguridad se diseña desde el inicio.

Nunca se añade al finalizar el desarrollo.

Toda nueva funcionalidad debe considerar:

- autenticación,
- autorización,
- privacidad,
- auditoría,
- protección de datos.

---

## Least Privilege

Toda persona, servicio o proceso dispondrá únicamente de los permisos mínimos necesarios para realizar su función.

Los privilegios se conceden explícitamente y nunca por defecto.

---

## Defense in Depth

La protección no depende de un único mecanismo.

Cada capa aporta su propia protección.

Ejemplos:

- Cliente.
- Next.js.
- Application.
- Supabase Auth.
- Row Level Security.
- PostgreSQL.
- Infraestructura.

La vulneración de una capa no debe comprometer el sistema completo.

---

## Zero Trust

Ninguna petición se considera confiable por defecto.

Toda operación debe validar:

- identidad,
- sesión,
- permisos,
- contexto,
- integridad de los datos.

---

## Privacy by Design

Solo se recopilan los datos estrictamente necesarios para proporcionar valor al usuario.

Toda información almacenada debe tener una justificación funcional.

---

# Modelo de seguridad

```text
Persona
        │
        ▼
Autenticación
        │
        ▼
Sesión válida
        │
        ▼
Contexto autenticado
        │
        ▼
Autorización
        │
        ▼
Caso de uso
        │
        ▼
Dominio
        │
        ▼
Persistencia protegida
```

---

# Protección de la identidad

La identidad se gestiona mediante Supabase Auth.

Responsabilidades:

- autenticación,
- recuperación de cuenta,
- verificación de correo,
- gestión de sesiones,
- proveedores externos.

El dominio nunca conoce estos mecanismos.

---

# Protección de los datos

Toda la información financiera pertenece a una familia.

Ninguna consulta podrá acceder a datos fuera de su contexto autorizado.

Toda operación deberá estar limitada por:

- FamilyId
- Membership
- Permisos

---

# Row Level Security

Todas las tablas con información del dominio deberán utilizar políticas RLS.

Las políticas constituyen la última línea de defensa frente a accesos no autorizados.

La seguridad nunca dependerá exclusivamente de la aplicación.

---

# Gestión de secretos

Nunca se almacenarán en el repositorio:

- claves privadas,
- tokens,
- secretos,
- credenciales.

Toda configuración sensible utilizará variables de entorno.

Las claves de servicio permanecerán exclusivamente en el servidor.

---

# Comunicación

Toda comunicación utilizará HTTPS.

No se aceptarán conexiones inseguras.

Las cookies relacionadas con autenticación deberán ser seguras y, cuando corresponda, HttpOnly.

---

# Validación

Toda entrada será validada en dos niveles.

## Cliente

Validación orientada a mejorar la experiencia de usuario.

---

## Servidor

Validación obligatoria para garantizar la integridad del dominio.

Ninguna regla de negocio dependerá únicamente del cliente.

---

# Auditoría

Toda acción relevante podrá registrarse.

Ejemplos:

- inicio de sesión,
- creación de objetivos,
- modificación de compromisos,
- eliminación de información,
- incorporación de miembros.

La auditoría facilita el diagnóstico y la trazabilidad sin invadir la privacidad del usuario.

---

# Protección frente a errores

Los errores técnicos nunca expondrán:

- consultas SQL,
- rutas internas,
- excepciones completas,
- tokens,
- información sensible.

La interfaz mostrará mensajes claros y seguros.

---

# Dependencias

Toda dependencia incorporada al proyecto deberá evaluarse antes de su adopción.

Se priorizarán bibliotecas:

- mantenidas,
- ampliamente utilizadas,
- con soporte activo,
- compatibles con actualizaciones de seguridad.

---

# Desarrollo seguro

Durante el desarrollo deberán cumplirse las siguientes prácticas.

- TypeScript en modo estricto.
- Validación mediante esquemas.
- Revisión de dependencias.
- Eliminación de código muerto.
- Principio de menor complejidad.
- Revisión de cambios antes de integrar.

---

# Copias de seguridad

La estrategia de recuperación deberá contemplar:

- copias periódicas,
- restauración,
- versionado de migraciones,
- recuperación ante incidentes.

La disponibilidad forma parte de la seguridad.

---

# Evolución

La arquitectura de seguridad evolucionará junto con el producto.

Toda nueva funcionalidad deberá analizar su impacto sobre:

- confidencialidad,
- integridad,
- disponibilidad,
- privacidad,
- trazabilidad.

---

# Principio final

La confianza del usuario constituye uno de los activos más valiosos de SinDescuadre.

Cada decisión técnica debe reforzar esa confianza.

---

# Resumen

La seguridad en SinDescuadre es una responsabilidad transversal que afecta a todo el sistema.

La arquitectura protege la identidad, los datos y la privacidad mediante múltiples capas de defensa, minimizando riesgos y garantizando que las familias puedan confiar en la plataforma para gestionar su realidad financiera.