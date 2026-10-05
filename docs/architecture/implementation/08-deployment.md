# Deployment

## Propósito

Este documento define la estrategia de despliegue de SinDescuadre.

Su objetivo es garantizar que la aplicación pueda evolucionar de forma segura, reproducible y predecible, manteniendo la estabilidad del sistema y la confianza de los usuarios.

La estrategia de despliegue debe ser independiente de proveedores concretos y centrarse en los principios de operación del producto.

---

# Principios

El proceso de despliegue sigue los siguientes principios:

- Automatización antes que intervención manual.
- Reproducibilidad.
- Despliegues pequeños y frecuentes.
- Posibilidad de recuperación.
- Observabilidad desde el primer momento.

---



# Arquitectura de despliegue

La arquitectura inicial del producto estará compuesta por:

- Frontend: Next.js
- Backend: Server Actions y Route Handlers
- Base de datos: PostgreSQL (Supabase)
- Autenticación: Supabase Auth
- Almacenamiento: Supabase Storage
- Hosting: Vercel

La arquitectura podrá evolucionar sin afectar al dominio.

---



# Entornos

El sistema utilizará, como mínimo, los siguientes entornos:

## Development

Uso diario durante el desarrollo.

---



## Preview

Entorno generado automáticamente para validar cambios antes de su integración.

---



## Production

Entorno utilizado por los usuarios finales.

Solo recibirá cambios previamente revisados y validados.

---



# Integración continua

Cada cambio integrado deberá ejecutar automáticamente:

- comprobación de tipos,
- análisis estático,
- pruebas automatizadas,
- validación de calidad.

Si alguna verificación falla, el despliegue no continuará.

---



# Migraciones

Toda modificación del modelo de datos deberá realizarse mediante migraciones versionadas.

Nunca se modificarán estructuras directamente sobre producción.

---



# Configuración

La configuración dependerá exclusivamente del entorno.

Nunca se almacenarán secretos dentro del código fuente.

---



# Observabilidad

El sistema deberá proporcionar información suficiente para detectar:

- errores,
- degradación del rendimiento,
- incidencias,
- problemas de disponibilidad.

---



# Recuperación

Todo despliegue deberá permitir:

- restauración,
- reversión,
- recuperación de datos,
- continuidad del servicio.

---



# Evolución

La estrategia de despliegue podrá adaptarse a nuevas necesidades sin modificar la arquitectura del dominio.

---



# Resumen

El proceso de despliegue garantiza que SinDescuadre evolucione mediante entregas seguras, automatizadas y observables, reduciendo el riesgo operativo y facilitando la continuidad del servicio.