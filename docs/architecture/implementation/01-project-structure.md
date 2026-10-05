# Project Structure

## Propósito

Este documento define la estructura oficial del repositorio de SinDescuadre.

La organización del código refleja el dominio del negocio y no la tecnología utilizada para implementarlo.

El objetivo es que cualquier persona pueda comprender cómo está construido el sistema observando únicamente la estructura del proyecto.

---

# Principios

La estructura del proyecto sigue los siguientes principios:

- El dominio organiza el código.
- Cada módulo representa una capacidad del negocio.
- Las dependencias siempre apuntan hacia el dominio.
- La tecnología nunca determina la organización del proyecto.
- Cada módulo puede evolucionar de forma independiente.

---



# Estructura general

```text
SinDescuadre/
│
├── docs/
├── src/
├── supabase/
├── tests/
├── scripts/
├── public/
├── .github/
├── package.json
├── README.md
└── .env.example
```



### Responsabilidades



#### docs/

Contiene toda la documentación funcional, de negocio y técnica del proyecto.

Es la fuente de verdad para cualquier decisión de implementación.

---



#### src/

Contiene el código fuente de la aplicación.

Todo el desarrollo se realiza dentro de esta carpeta.

---



#### supabase/

Incluye migraciones, políticas RLS, funciones SQL, seeds y configuración específica de Supabase.

---



#### tests/

Contiene pruebas de integración, aceptación y cualquier prueba transversal al sistema.

Las pruebas unitarias podrán convivir con los módulos cuando aporte mayor claridad.

---



#### scripts/

Automatizaciones relacionadas con el desarrollo y mantenimiento del proyecto.

---



#### public/

Recursos estáticos utilizados por la aplicación.

---



# Organización de src

```text
src/
│
├── app/
├── modules/
├── shared/
├── infrastructure/
├── lib/
└── types/
```

---



## app/

Implementa el App Router de Next.js.

Su responsabilidad es definir rutas, layouts y puntos de entrada de la aplicación.

No contiene reglas de negocio.

---



## modules/

Representa el núcleo funcional del proyecto.

Cada módulo corresponde a un Bounded Context del dominio.

```text
modules/
│
├── family/
├── financial/
├── planning/
└── decision-support/
```

Cada módulo mantiene su propia arquitectura interna.

---



## shared/

Contiene elementos reutilizables por varios módulos.

Ejemplos:

- Value Objects compartidos.
- Componentes reutilizables.
- Utilidades de dominio.
- Contratos comunes.
- Constantes.

Solo se ubicará aquí aquello que realmente pertenezca a más de un módulo.

---



## infrastructure/

Implementaciones técnicas compartidas.

Ejemplos:

- Cliente de Supabase.
- Logging.
- Observabilidad.
- Configuración.
- Integraciones externas.

---



## lib/

Funciones auxiliares que no forman parte del dominio pero facilitan la implementación.

Su uso debe mantenerse al mínimo.

---



## types/

Tipos globales utilizados por distintos módulos.

Siempre que un tipo pertenezca al dominio de un módulo deberá permanecer dentro del propio módulo.

---



# Arquitectura interna de los módulos

Todos los módulos siguen la misma organización.

```text
module/
│
├── application/
├── domain/
├── infrastructure/
└── presentation/
```

---



## application/

Coordina los casos de uso.

Puede contener:

- Commands
- Queries
- Handlers
- DTOs
- Mappers
- Use Cases

No implementa reglas de negocio.

---



## domain/

Representa el núcleo del módulo.

Puede contener:

- Entities
- Value Objects
- Aggregates
- Domain Events
- Domain Services
- Policies
- Specifications
- Factories
- Repositories (interfaces)

Aquí reside toda la lógica de negocio.

---



## infrastructure/

Implementaciones concretas necesarias para el módulo.

Ejemplos:

- Repositorios de Supabase.
- Adaptadores.
- Clientes externos.
- Persistencia.

---



## presentation/

Elementos de interfaz pertenecientes exclusivamente al módulo.

Ejemplos:

- Componentes React específicos.
- Formularios.
- Hooks propios del módulo.
- Server Actions.
- Validaciones de entrada.

---



# Dependencias

Las dependencias deben respetar el siguiente flujo.

```text
Presentation
        │
        ▼
Application
        │
        ▼
Domain
        ▲
        │
Infrastructure
```

El dominio nunca depende de Infrastructure ni de Presentation.

---



# Principios arquitectónicos

La estructura del proyecto debe cumplir siempre las siguientes reglas:

- Ningún módulo puede acceder directamente al estado interno de otro módulo.
- La comunicación entre módulos debe realizarse mediante contratos explícitos.
- Todo nuevo desarrollo debe comenzar identificando el módulo al que pertenece.
- No se crearán carpetas genéricas como `helpers`, `services` o `misc`.
- Si un elemento no pertenece claramente a un módulo o a una responsabilidad compartida, su ubicación deberá revisarse antes de incorporarlo.

---



# Evolución de la estructura

La estructura podrá evolucionar cuando aparezcan nuevas capacidades del negocio.

Nunca se modificará únicamente para adaptarse a una tecnología o framework.

El crecimiento del repositorio debe reflejar el crecimiento del dominio.

---



# Resumen

La estructura del proyecto de SinDescuadre está organizada alrededor del dominio y de las capacidades del negocio.

Cada módulo encapsula su propia arquitectura y evoluciona de forma independiente, garantizando un sistema mantenible, escalable y alineado con la visión del producto.