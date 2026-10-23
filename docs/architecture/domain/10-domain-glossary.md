# Domain Glossary

## Propósito

Este documento constituye el diccionario oficial del dominio de SinDescuadre.

Su objetivo es proporcionar una referencia única para todos los conceptos utilizados en el proyecto, garantizando que cada término tenga un significado claro, consistente y compartido.

Cuando exista cualquier duda sobre el significado de un concepto, este documento será la fuente de verdad.

---

# Principios

El glosario sigue los siguientes principios:

- Cada término tiene una única definición.
- Las definiciones describen conceptos del negocio, no implementaciones técnicas.
- Ningún término debe duplicar el significado de otro.
- El glosario evoluciona junto con el dominio.

---



# A



### Account

Ubicación simulada del dinero o de un pasivo/activo valorado (personal o compartida).

Tipos (`kind`): **checking** (liquidez bancaria), **credit** (tarjeta / pasivo) e **investment** (activo con valor actual). Es distinta de un **Fund** (bolsillo): la cuenta es dónde vive o se debe el dinero; el bolsillo es la organización del gasto. Ver ADR-0006, ADR-0010 y la feature Accounts.

---



### Asset

Recurso económico que aporta valor al patrimonio familiar.

En producto V1, un activo invertido se modela como cuenta `kind = investment` con valor actual actualizable (ADR-0010), no como catálogo de productos.

---



### Aggregate

Límite de consistencia encargado de proteger las invariantes de un conjunto de entidades relacionadas.

---



# C



### Commitment

Obligación financiera futura que condiciona la capacidad de decisión de la familia.

Puede tener **frecuencia** multi-periodo; la capacidad comprometida usa el **equivalente mensual**. Ver feature Commitments y ADR-0010.

---



### Credit account

Cuenta de pasivo (`kind = credit`), p. ej. tarjeta de crédito. El saldo de deuda se muestra como “Debes”; el pago reduce la deuda vía transferencia desde una cuenta de liquidez. No forma parte de la liquidez visible.

---



### Core Domain

Parte del dominio donde reside la principal ventaja competitiva de SinDescuadre.

Actualmente corresponde al **Decision Support Context**.

---



# D



### Decision

Conclusión obtenida por el dominio tras interpretar la realidad financiera.

No representa todavía un mensaje para el usuario.

---



### Decision Context

Conjunto de factores relevantes para evaluar la siguiente decisión financiera.

---



### Domain Event

Hecho relevante que modifica el estado del dominio.

---



### Domain Service

Capacidad del dominio que coordina varios conceptos cuando la responsabilidad no pertenece de forma natural a una única entidad o agregado.

---



# F



### Family

Unidad financiera sobre la que trabaja SinDescuadre.

Puede representar una persona, una pareja o cualquier grupo que comparta decisiones económicas.

---



### Financial Event

Hecho económico registrado por el sistema.

Representa datos.

No interpretaciones.

---



### Financial Reality

Representación interpretada de la situación financiera actual de la familia.

---



### Frequency (recurrence)

Periodicidad de un gasto fijo o compromiso: mensual, bimensual, trimestral, semestral o anual.

El sistema genera el pago del mes solo cuando toca; para capacidad de decisión usa el **equivalente mensual** (`importe / meses_del_periodo`).

---



# G



### Goal

Objetivo financiero que la familia desea alcanzar.

---



### Guidance

Explicación comprensible de una decisión financiera.

Su propósito consiste en acompañar, no imponer.

---



### Investment account

Cuenta de activo valorado (`kind = investment`): nombre libre (p. ej. CDT, fondo) y valor actual que la familia actualiza. Aportes y retiros desde liquidez; no implica rentabilidad diaria ni catálogo de mercado.

---



# O



### Opportunity

Situación detectada por el dominio donde la familia puede mejorar su realidad financiera.

---



# R



### Risk

Circunstancia que puede comprometer la estabilidad financiera de la familia.

---



### Role

Responsabilidad que un miembro desempeña dentro de la unidad familiar.

---



# S



### Significant Change

Cambio suficientemente relevante como para justificar una nueva evaluación del dominio.

---



### State

Representación de la situación financiera global de la familia en un momento determinado.

---



### Supporting Domain

Parte del dominio que proporciona información al Core Domain, pero que no constituye el elemento diferenciador del producto.

---



# U



### Ubiquitous Language

Lenguaje compartido por negocio, diseño, desarrollo e inteligencia artificial para describir el dominio de forma consistente.

---



# Evolución del glosario

Todo nuevo concepto incorporado al dominio deberá añadirse a este documento antes de utilizarse de forma generalizada.

El objetivo es mantener un lenguaje coherente y evitar la aparición de términos ambiguos o redundantes.

---



# Resumen

El Domain Glossary es el diccionario oficial de SinDescuadre.

Garantiza que todos los participantes del proyecto compartan el mismo significado para cada concepto y constituye la referencia principal del Lenguaje Ubicuo definido para el dominio.