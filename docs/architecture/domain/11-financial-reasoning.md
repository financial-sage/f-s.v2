# 11. Financial Reasoning

## Propósito

Este documento describe cómo SinDescuadre transforma hechos financieros en decisiones útiles para una familia.

No define algoritmos.

No describe tecnologías.

Describe el proceso de razonamiento que constituye el núcleo del dominio.

---

# El principio fundamental

Un movimiento financiero no tiene valor por sí mismo.

Su valor depende del contexto en el que ocurre.

Registrar un gasto de 500 € puede ser irrelevante para una familia y crítico para otra.

La diferencia no está en el movimiento.

Está en la realidad financiera sobre la que se interpreta.

Por este motivo, SinDescuadre nunca razona directamente sobre datos aislados.

Siempre razona sobre una realidad previamente interpretada.

---

# El proceso de razonamiento

El razonamiento financiero se desarrolla como una secuencia de transformaciones.

Cada etapa añade una nueva capa de comprensión.

## 1. Ocurre un hecho

La realidad cambia.

Un ingreso, un gasto, un compromiso o cualquier otro acontecimiento relevante modifica el contexto financiero de la familia.

Este cambio se representa mediante un Domain Event.

---

## 2. Se actualiza la Financial Reality

El sistema reconstruye su representación de la situación financiera.

No almacena únicamente datos.

Actualiza su comprensión del estado actual de la familia.

---

## 3. Se construye el Decision Context

A partir de la Financial Reality se identifican los elementos que realmente influyen en la siguiente decisión.

Se eliminan detalles irrelevantes y se conserva únicamente el contexto significativo.

---

## 4. Se prioriza

El Decision Engine analiza el Decision Context.

Compara riesgos, oportunidades, compromisos y objetivos.

Su propósito consiste en identificar cuál es la decisión que merece mayor atención en ese momento.

---

## 5. Se genera una Decision

El resultado del razonamiento es una Decision.

La Decision representa el criterio del sistema.

No es todavía un mensaje para el usuario.

Es una conclusión del dominio.

---

## 6. Se genera el Guidance

La Decision se transforma en una orientación comprensible para la familia.

El objetivo no es ordenar.

Es explicar.

El sistema acompaña a la familia para que pueda tomar una decisión informada.

---

## 7. Se comunica

La orientación se presenta mediante la experiencia de usuario.

Puede aparecer en el Dashboard, en una conversación, en una notificación o en cualquier otro canal.

La interfaz no toma decisiones.

Únicamente comunica el resultado del razonamiento del dominio.

---

# Principios del razonamiento

Todo el proceso debe respetar los siguientes principios:

* La comprensión precede siempre a la decisión.
* El contexto tiene más valor que los datos aislados.
* El sistema prioriza antes de comunicar.
* Cada etapa tiene una única responsabilidad.
* El razonamiento pertenece al dominio, no a la interfaz.

---

# Un proceso continuo

El razonamiento financiero no se ejecuta una única vez.

Se repite continuamente conforme evoluciona la realidad de la familia.

Cada nuevo acontecimiento puede modificar la comprensión del sistema.

Y cada nueva comprensión puede dar lugar a una decisión diferente.

SinDescuadre mantiene una interpretación viva de la realidad para acompañar a la familia en cada momento importante de su vida financiera.
