# Contexto general del proyecto Financial Sage

Fecha de referencia: 16 de abril de 2026.

## 1. Visión general

Financial Sage es una aplicación web progresiva enfocada en la gestión de finanzas personales y de pareja. El proyecto está construido con una arquitectura moderna basada en Next.js, TypeScript y Supabase, y actualmente ya cuenta con una experiencia funcional para navegación principal, autenticación y uso desde móvil.

El objetivo reciente del trabajo realizado se ha centrado en tres frentes principales:

- estabilizar la experiencia móvil,
- habilitar la instalación de la PWA,
- permitir pruebas reales desde teléfono fuera del navegador de escritorio.

## 2. Stack y estructura principal

La aplicación usa Next.js con App Router, TypeScript y Tailwind CSS. La persistencia y autenticación se apoyan en Supabase. El diseño visual sigue una línea tipo Material Design con una paleta verdosa y superficies suaves.

La estructura principal del proyecto está organizada en rutas de aplicación, componentes reutilizables, utilidades de Supabase y lógica de negocio para dashboard, gastos y familia.

## 3. Funcionalidades principales ya presentes

Hasta este momento, la app ya incluye:

- panel principal para visualizar información financiera,
- flujo de login y registro,
- vistas para historial, tarjetas y perfil,
- formulario para agregar gastos,
- navegación inferior tipo aplicación móvil,
- integración con datos reales desde Supabase.

También existe soporte tanto para uso individual como para uso en pareja, con componentes de dashboard diferenciados y lógica de movimientos, aportes y deuda.

## 4. Trabajo realizado recientemente en la PWA

Se hicieron varios ajustes para que la aplicación pudiera instalarse en el móvil como si fuera una app nativa.

### 4.1 Manifiesto de la aplicación

Se revisó y mejoró la configuración del manifiesto para que describa correctamente la identidad de la app, su comportamiento como aplicación instalada y la información visual necesaria para Android.

### 4.2 Iconos de instalación

Se detectó que faltaban los iconos requeridos por la PWA. Se generaron y añadieron los recursos necesarios para que el sistema operativo pueda mostrar la app correctamente al instalarla.

### 4.3 Service worker

Se añadió el registro del service worker para activar el comportamiento progresivo de la aplicación y permitir que el navegador la reconozca como instalable.

### 4.4 Experiencia de instalación dentro de la app

Se incorporó un aviso de instalación visible dentro de la interfaz para facilitar al usuario móvil la acción de añadir la app a la pantalla de inicio.

## 5. Trabajo realizado para acceso desde móvil

Uno de los problemas iniciales era que el móvil no podía acceder correctamente a la app local o la marcaba como conexión no segura.

Para resolver esto se hicieron varias tareas:

- instalación correcta de la herramienta necesaria para certificados locales en Windows,
- generación de certificados SSL para localhost y para las IPs reales de la red local,
- preparación de certificados dentro de la carpeta de configuración del proyecto,
- exposición de la app mediante red local,
- publicación temporal mediante túneles HTTPS para abrirla desde el teléfono.

## 6. Incidencias detectadas y cómo se fueron resolviendo

### 6.1 Problema con certificados locales

Al inicio, la extensión de proxy SSL no encontraba la herramienta necesaria en el sistema porque estaba instalada solo como dependencia del proyecto y no como binario accesible globalmente. Esto se resolvió con una instalación válida para Windows y con la generación real de certificados.

### 6.2 Advertencia de sitio peligroso en Android

El problema no venía de la app como tal, sino de los enlaces temporales usados para exponerla en internet. Al usar dominios efímeros de túneles, Android podía tratarlos como poco confiables o cambiar de origen entre sesiones.

### 6.3 Fallo de login en la app instalada

Se verificó que no era un problema de CORS de Supabase. El origen real fue que la aplicación instalada en Android había quedado asociada a un túnel antiguo que ya no existía. Al reinstalar usando el enlace activo, el acceso volvió a funcionar.

### 6.4 Botón de instalar no interactivo

Se detectó que un elemento de interfaz estaba superponiéndose al botón de instalación en móvil. Se ajustó la capa visual para que el toque llegue correctamente al botón.

## 7. Estado actual de la autenticación

La autenticación está operativa y conectada a Supabase. El flujo de inicio de sesión y registro funciona desde la app cuando se usa el origen correcto.

Se comprobó además que Supabase sí responde correctamente a las solicitudes del entorno público usado en las pruebas, por lo que no hay una evidencia actual de bloqueo por CORS en el login.

## 8. Estado actual del proyecto

A día de hoy, el proyecto se encuentra en un estado funcional para desarrollo y pruebas reales desde móvil. La aplicación puede abrirse, iniciar sesión, navegar y utilizarse como PWA instalada.

Los avances más importantes ya consolidados son:

- experiencia móvil operativa,
- login funcional,
- PWA instalable,
- manifiesto y recursos validados,
- service worker activo,
- acceso remoto temporal para pruebas.

## 9. Limitaciones actuales

Aunque la app ya funciona, todavía hay algunos puntos a tener en cuenta:

- los túneles públicos usados para pruebas cambian de dirección y no son permanentes,
- una app instalada desde un dominio temporal puede quedar apuntando a un origen que luego deja de existir,
- para una validación definitiva conviene desplegar en un dominio estable.

## 10. Recomendación para la siguiente etapa

La siguiente mejora natural del proyecto sería publicar la aplicación en un entorno estable de despliegue. Eso permitiría:

- evitar problemas por cambio de URL,
- mantener una instalación PWA persistente,
- validar el comportamiento real en producción,
- compartir la app sin depender del equipo local.

## 11. Conclusión

El trabajo reciente dejó la app en una etapa mucho más madura que al inicio. Antes existían bloqueos de acceso móvil, problemas con certificados, advertencias de seguridad, errores por túneles temporales y dificultades de instalación. Ahora la aplicación ya cuenta con una base sólida para pruebas reales desde Android, autenticación funcional y soporte PWA operativo.

Este documento sirve como resumen de todo lo realizado hasta ahora y como base para analizar el siguiente conjunto de mejoras del producto.