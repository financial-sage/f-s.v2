# Decision Engine

## Propósito

El Decision Engine es el componente responsable de priorizar la atención de la familia.

Su función consiste en analizar el contexto financiero disponible e identificar cuál es la decisión más importante que debería considerar en este momento.

No interpreta la realidad.

No genera orientación.

No comunica con el usuario.

Su única responsabilidad es determinar qué merece atención.

---

# ¿Por qué existe?

La realidad financiera de una familia suele contener múltiples acontecimientos relevantes al mismo tiempo.

Puede haber objetivos pendientes, compromisos futuros, oportunidades de ahorro, riesgos o cambios recientes.

Intentar presentar toda esa información simultáneamente genera ruido y dificulta la toma de decisiones.

El Decision Engine existe para reducir esa complejidad y establecer prioridades.

---



# ¿Qué recibe?

El Decision Engine recibe un **Decision Context** construido previamente.

Ese contexto representa una visión resumida e interpretada de la situación financiera actual.

Incluye únicamente la información necesaria para razonar.

---



# ¿Qué analiza?

Durante su evaluación considera, entre otros aspectos:

- Riesgos detectados.
- Oportunidades disponibles.
- Compromisos activos.
- Objetivos prioritarios.
- Capacidad de decisión.
- Tendencias recientes.
- Cambios significativos.

No vuelve a calcular estos elementos.

Confía en el contexto recibido.

---



# ¿Qué produce?

Como resultado genera una **Decision**.

Una Decision representa la prioridad principal del momento.

No describe cómo actuar.

Describe qué merece atención.

Ejemplos:

- Reforzar el fondo de emergencia.
- Posponer una compra importante.
- Aprovechar una oportunidad de inversión.
- Reducir deuda.
- Revisar un compromiso próximo.

---



# Responsabilidades

El Decision Engine debe:

- Evaluar el contexto.
- Comparar prioridades.
- Resolver conflictos entre distintas opciones.
- Seleccionar la decisión más relevante.

No debe:

- Interpretar movimientos financieros.
- Calcular indicadores.
- Generar mensajes para el usuario.
- Modificar la Financial Reality.
- Ejecutar acciones automáticamente.

---



# Principio fundamental

El Decision Engine nunca intenta resolver todos los problemas al mismo tiempo.

Su objetivo consiste en identificar la siguiente mejor decisión para la familia.

Una única prioridad clara siempre resulta más útil que una lista extensa de recomendaciones.

---



# Relación con el resto del dominio

El Decision Engine forma parte de una cadena de razonamiento.

Financial Reality

↓

Decision Context

↓

Decision Engine

↓

Guidance

↓ 

Experiencia de usuario



Cada componente añade una nueva capa de valor.

El Decision Engine aporta criterio.

Selecciona aquello que merece la atención de la familia y deja la comunicación de esa decisión al Guidance Engine.