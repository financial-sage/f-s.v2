# System Overview

## Propósito

Este documento describe la arquitectura general de SinDescuadre y la relación entre sus principales componentes.

Su objetivo es proporcionar una visión global del sistema antes de profundizar en cada una de sus partes.

La arquitectura sigue un principio fundamental:

> El dominio dirige el sistema.
> La tecnología implementa el dominio.

---

# Principios

Toda decisión técnica debe respetar los siguientes principios:

- El dominio es independiente de la tecnología.
- La experiencia de usuario consume capacidades del dominio.
- La infraestructura soporta al dominio.
- Las dependencias siempre apuntan hacia el dominio.
- El razonamiento financiero constituye el núcleo del sistema.

---



# Arquitectura general

SinDescuadre está compuesto por cinco grandes capas.

## User Experience

Responsable de la interacción con el usuario.

Incluye:

- Next.js App Router
- Server Components
- Client Components
- Formularios
- Dashboard
- Chat
- Visualizaciones

Su única responsabilidad consiste en presentar información y recoger acciones del usuario.

---



## Application

Coordina los casos de uso.

No contiene reglas de negocio.

Sus responsabilidades incluyen:

- Ejecutar casos de uso.
- Coordinar servicios.
- Gestionar transacciones.
- Aplicar autorización.

---



## Domain

Representa el corazón del sistema.

Incluye:

- Entidades
- Value Objects
- Aggregates
- Domain Events
- Domain Services

Aquí vive el modelo de negocio de SinDescuadre.

---



## Infrastructure

Implementa las dependencias externas.

Incluye:

- Supabase
- PostgreSQL
- Storage
- Authentication
- Logging
- Integraciones
- IA

El dominio nunca depende directamente de esta capa.

---



## Platform

Servicios que soportan la aplicación.

Por ejemplo:

- Vercel
- CI/CD
- Monitorización
- Analítica
- Configuración

---



# Flujo general

Usuario

↓

Next.js

↓

Application

↓

Domain

↓

Infrastructure

↓

Supabase

↓

Application

↓

UI

---



# Tecnologías

Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend

- Next.js Route Handlers
- Server Actions

Persistencia

- PostgreSQL
- Supabase

Autenticación

- Supabase Auth

Hosting

- Vercel

---



# Principios arquitectónicos

- Ninguna tecnología define el dominio.
- Toda regla de negocio pertenece al dominio.
- Toda dependencia apunta hacia el dominio.
- La infraestructura puede reemplazarse sin modificar el modelo de negocio.

---



# Resumen

SinDescuadre está construido alrededor de un modelo de dominio independiente de la tecnología.

Next.js, Supabase y Vercel proporcionan la plataforma necesaria para implementar ese modelo sin condicionarlo.