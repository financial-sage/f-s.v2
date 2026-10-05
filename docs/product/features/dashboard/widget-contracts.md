# Dashboard · Widget Contracts

## Propósito

Este documento define el contrato común que deben cumplir todos los Widgets Cognitivos del Dashboard.

El objetivo es garantizar una experiencia coherente, independientemente del tipo de widget o de su implementación técnica.

---

# Filosofía

Los widgets son representaciones de conocimiento.

No contienen lógica de negocio.

El Decision Engine determina qué widgets aparecen, qué información muestran y cuál es su prioridad.

El frontend se limita a representarlos.

---

# Contrato común

Todo widget deberá definir los siguientes elementos.

## Identificador

Nombre único dentro del Dashboard.

Ejemplo:

- financial-status
- primary-goal
- next-commitment

---

## Pregunta

Pregunta principal que responde el widget.

Cada widget responderá únicamente a una pregunta.

---

## Objetivo

Descripción del conocimiento que pretende comunicar.

---

## Prioridad

Nivel de importancia asignado por el Decision Engine.

Ejemplos:

- Critical
- High
- Medium
- Low

---

## Condición de aparición

Reglas que determinan cuándo el widget puede mostrarse.

Si las condiciones no se cumplen, el widget no aparecerá.

---

## Datos requeridos

Información mínima necesaria para construir el widget.

La ausencia de datos nunca deberá generar conclusiones incorrectas.

---

## Acción principal

Acción que puede ejecutar la familia desde el widget.

---

## Explicación

Todo widget deberá poder explicar:

- por qué aparece;
- por qué tiene esa prioridad;
- qué información utiliza.

El AI Assistant reutilizará esta explicación durante las conversaciones.

---

## Estado

Cada widget podrá encontrarse en alguno de los siguientes estados:

- Disponible.
- Destacado.
- Sin información suficiente.
- Oculto.
- Deshabilitado.

---

# Responsabilidades

El widget nunca deberá:

- tomar decisiones;
- modificar reglas de negocio;
- generar recomendaciones;
- realizar cálculos financieros.

Su única responsabilidad consiste en comunicar conocimiento generado por el sistema.

---

# Relación con el Decision Engine

El Decision Engine construye la colección de widgets que compondrá el Dashboard.

Cada widget representa una decisión previamente tomada por el motor de razonamiento.

---

# Resumen

Los Widget Contracts establecen un modelo uniforme para todos los Widgets Cognitivos, separando claramente la lógica de negocio de la representación visual y facilitando una implementación consistente y escalable.