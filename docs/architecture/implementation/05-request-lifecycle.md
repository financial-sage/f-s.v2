# Request Lifecycle

## Propósito

Este documento describe el recorrido completo de una petición dentro de SinDescuadre.

Su objetivo es establecer un flujo único y consistente para todas las funcionalidades del sistema, desde la interacción del usuario hasta la generación de conocimiento y la actualización de la interfaz.

Cada petición debe seguir este flujo independientemente de la tecnología utilizada para implementarla.

---

# Principios

El ciclo de una petición sigue los siguientes principios:

- Toda petición comienza con una intención del usuario.
- La aplicación coordina el flujo, pero no toma decisiones de negocio.
- El dominio interpreta la información y genera conocimiento.
- La infraestructura persiste y recupera datos.
- La interfaz representa el resultado del dominio.

---

# Flujo general

```text
Usuario
    │
    ▼
Interfaz (Next.js)
    │
    ▼
Server Action / Route Handler
    │
    ▼
Application (Use Case)
    │
    ▼
Domain
    │
    ▼
Infrastructure
    │
    ▼
Supabase
    │
    ▼
Application
    │
    ▼
Interfaz
    │
    ▼
Usuario
```

---

# Etapas del ciclo

## 1. Intención del usuario

Todo comienza con una acción significativa.

Ejemplos:

- Registrar un gasto.
- Crear un objetivo.
- Añadir un ingreso.
- Confirmar un compromiso.
- Solicitar una recomendación.

La intención expresa una necesidad del usuario, no una operación técnica.

---

## 2. Entrada al sistema

La interfaz recoge la información necesaria y ejecuta una Server Action o un Route Handler.

En esta etapa solo se realizan:

- validaciones básicas,
- comprobaciones de autenticación,
- transformación de datos de entrada.

No existen reglas de negocio.

---

## 3. Caso de uso

El caso de uso coordina la ejecución.

Sus responsabilidades son:

- obtener la información necesaria,
- invocar el dominio,
- coordinar repositorios,
- devolver un resultado.

No interpreta la realidad financiera.

---

## 4. Dominio

El dominio recibe la información necesaria para razonar.

Puede:

- construir la Financial Reality,
- detectar cambios significativos,
- generar un Decision Context,
- evaluar decisiones,
- producir Guidance.

Aquí reside el verdadero valor de SinDescuadre.

---

## 5. Persistencia

Cuando sea necesario, la infraestructura almacena los cambios.

La persistencia es una consecuencia del proceso, no su finalidad.

---

## 6. Actualización de la interfaz

Una vez completado el caso de uso:

- se revalidan los datos necesarios,
- se actualiza la interfaz,
- el usuario recibe el nuevo conocimiento generado.

La interfaz nunca reconstruye el razonamiento realizado por el dominio.

---

# Tipos de peticiones

## Escritura

Modifican la realidad registrada.

Ejemplos:

- crear,
- actualizar,
- eliminar,
- confirmar.

Estas peticiones pueden generar nuevos eventos del dominio.

---

## Lectura

Recuperan conocimiento existente.

Ejemplos:

- dashboard,
- historial,
- objetivos,
- recomendaciones.

Siempre devuelven información preparada para su consumo.

---

# Eventos del dominio

Durante el ciclo de una petición pueden generarse Domain Events.

Por ejemplo:

- ExpenseRegistered
- SalaryReceived
- GoalCompleted
- CommitmentCreated

Estos eventos permiten reaccionar a cambios significativos sin acoplar módulos entre sí.

---

# Manejo de errores

Los errores se clasifican en tres categorías:

## Errores de validación

Datos incorrectos proporcionados por el usuario.

---

## Errores del dominio

Violaciones de reglas de negocio.

---

## Errores de infraestructura

Problemas de red, almacenamiento o servicios externos.

Cada tipo de error debe tratarse en la capa correspondiente.

---

# Responsabilidades por capa

| Capa | Responsabilidad |
|------|-----------------|
| Presentation | Capturar la intención del usuario y mostrar el resultado |
| Application | Coordinar el caso de uso |
| Domain | Interpretar la realidad y generar conocimiento |
| Infrastructure | Persistir datos e integrar servicios externos |

---

# Ejemplo completo

**Escenario:** Registrar un gasto.

1. El usuario registra un gasto de supermercado.
2. La Server Action recibe la petición.
3. El caso de uso valida el contexto y recupera la información necesaria.
4. El dominio incorpora el nuevo Financial Event.
5. Se reconstruye la Financial Reality.
6. Se detecta un Significant Change (si existe).
7. El Decision Engine evalúa la nueva situación.
8. Se genera una nueva Guidance para la familia.
9. Se persisten los cambios.
10. Se revalida la interfaz y el usuario visualiza la nueva recomendación.

---

# Principios finales

Todo nuevo caso de uso deberá respetar este ciclo.

No se permitirá que una capa asuma responsabilidades que pertenecen a otra.

El objetivo no es únicamente modificar información, sino transformar hechos financieros en decisiones útiles.

---

# Resumen

El Request Lifecycle define el recorrido completo de cualquier interacción dentro de SinDescuadre.

Garantiza que todas las funcionalidades sigan un flujo coherente, donde el dominio interpreta la realidad financiera y la interfaz presenta el conocimiento generado al usuario.