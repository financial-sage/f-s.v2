# Bienvenido a SinDescuadre

Este repositorio contiene la definición completa del producto.

## Estructura

```
docs/
├── product/          → Definición de producto (este directorio)
├── architecture/     → Modelo de dominio y diseño técnico
└── engineering/      → Estándares, testing, CI/CD y despliegue
```

```
product/
├── README.md
├── CHANGELOG.md
│
├── foundations/      → Por qué existe, cómo piensa y hacia dónde va
├── experiences/      → Pantallas y flujos de usuario
├── components/       → Bloques reutilizables de la interfaz
├── business/         → Modelos, reglas y motores de negocio
├── research/         → Investigación, feedback y experimentos
└── archive/          → Documentación obsoleta o migrada
```

## Capas

| Capa | Carpeta | Responsabilidad |
|------|---------|-----------------|
| Fundamentos | `foundations/` | Visión, filosofía, lenguaje, estrategia |
| Experiencias | `experiences/` | Qué ve y hace el usuario en cada pantalla |
| Componentes | `components/` | Piezas atómicas de la interfaz |
| Negocio | `business/` | Lógica, modelos y reglas del sistema |
| Investigación | `research/` | Evidencia que informa decisiones de producto |

La arquitectura técnica vive en `docs/architecture/`. Los estándares de ingeniería, en `docs/engineering/`.

## Antes de diseñar

Lee:

1. Product Constitution
2. Product Vision
3. Financial Philosophy
4. Design Principles

## Antes de implementar

Lee:

1. La experiencia correspondiente en `experiences/`.
2. Los componentes utilizados en `components/`.
3. Las reglas de negocio relacionadas en `business/`.
4. El modelo de dominio en `docs/architecture/domain/` — especialmente el bounded context y los agregados que afecten a lo que vas a construir.
5. Los estándares en `docs/engineering/` antes de escribir código.

## Regla principal

Si el código contradice la documentación de producto, la documentación tiene prioridad hasta que el equipo decida actualizarla.

No implementes funcionalidades que no respondan a un problema real del usuario.
