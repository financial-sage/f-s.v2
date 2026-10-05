# Domain Overview

## Propósito

Este documento define el modelo conceptual de SinDescuadre.

Su objetivo es describir los conceptos fundamentales del dominio y las relaciones existentes entre ellos antes de tomar decisiones de implementación.

El dominio constituye el núcleo del producto.

Las interfaces, las APIs, las bases de datos y las tecnologías son mecanismos para representar ese dominio, pero no lo definen.

Por este motivo, el diseño del dominio siempre precede al diseño técnico.

---

# Nuestra filosofía

SinDescuadre no gira alrededor de cuentas bancarias, movimientos o presupuestos.

Todos ellos son elementos importantes.

Pero ninguno representa realmente aquello que queremos comprender.

El centro del dominio es la realidad financiera de una familia.

Todo lo demás existe para ayudar a interpretarla.

---



# El concepto central

El núcleo del dominio es:

**Financial Reality**

La realidad financiera representa la interpretación actual de la situación económica de una familia.

No es un saldo.

No es un informe.

No es una colección de movimientos.

Es el resultado de comprender todo el contexto financiero disponible.

Todas las decisiones del sistema parten de este concepto.

---



# Los conceptos fundamentales del dominio

El dominio de SinDescuadre está formado por los siguientes conceptos principales:

## Family

La unidad sobre la que se construye toda la experiencia.

Representa a las personas que comparten una misma realidad financiera.

---



## Financial Reality

La interpretación completa del estado financiero actual de la familia.

Es el principal objeto de análisis del sistema.

---



## Movement

Representa cualquier acontecimiento económico que modifica la realidad financiera.

---



## Commitment

Representa una obligación económica presente o futura.

---



## Goal

Representa aquello que la familia desea conseguir utilizando sus recursos financieros.

---



## Decision Capacity

Representa el margen real que tiene la familia para tomar nuevas decisiones sin comprometer su estabilidad.

---



## Opportunity

Representa una situación que merece atención por parte de la familia.

Puede tratarse de un riesgo, una oportunidad o una prioridad.

---



## Guidance

Representa la orientación generada por el sistema para ayudar a la familia a comprender una situación y actuar en consecuencia.

---



## Timeline

Representa la evolución de la realidad financiera a través del tiempo.

---



# Cómo fluye el dominio

La relación entre estos conceptos puede resumirse de la siguiente forma:

Movement

↓

Financial Reality

↓

Decision Capacity

↓

Opportunity

↓

Guidance

Cada elemento aporta una capa adicional de comprensión.

El sistema no transforma directamente un movimiento en una recomendación.

Primero construye una interpretación de la realidad.

Después identifica prioridades.

Finalmente genera una orientación.

---



# Un dominio orientado al razonamiento

La mayoría de aplicaciones financieras organizan su dominio alrededor de transacciones y cuentas.

SinDescuadre organiza su dominio alrededor del razonamiento financiero.

Esta decisión influirá en toda la arquitectura del sistema y permitirá mantener alineadas la implementación técnica y la filosofía del producto.



## Dos niveles del dominio

El dominio de SinDescuadre está compuesto por dos grandes grupos de conceptos.

### Objetos de realidad

Representan hechos y elementos que existen en la vida financiera de una familia.

Ejemplos:

- Family

- Movement

- Commitment

- Goal

- Account

- Asset

- Liability

### Objetos de comprensión

Representan el conocimiento que el sistema construye a partir de esa realidad.

Ejemplos:

- Financial Reality

- Decision Context

- Decision Capacity

- Opportunity

- Guidance

- Risk Profile

Los primeros describen la realidad.

Los segundos permiten comprenderla.

La propuesta de valor de SinDescuadre se encuentra principalmente en este segundo grupo.