# State Machine

## Propósito

Este documento define cómo evoluciona la realidad financiera de una familia a lo largo del tiempo.

La State Machine de SinDescuadre no representa el ciclo de vida de una entidad.

Representa la evolución del estado financiero de la familia como consecuencia de los acontecimientos que afectan a su realidad.

Su propósito es proporcionar continuidad al razonamiento del dominio.

---

# Principios

La evolución de estados sigue los siguientes principios:

- Los estados representan situaciones financieras, no estados técnicos.
- Un estado resume la realidad financiera en un momento determinado.
- Solo los cambios significativos justifican una transición.
- Las transiciones siempre deben poder explicarse.
- El objetivo del sistema no es cambiar estados, sino comprender la evolución de la familia.

---



# Estado financiero

Un estado financiero representa una interpretación global de la situación actual de la familia.

No describe un único dato.

Describe el equilibrio entre ingresos, gastos, objetivos, compromisos y capacidad de decisión.

---



# Estados del dominio



## Stable

La familia mantiene una situación equilibrada.

Los compromisos pueden afrontarse con normalidad y no existen riesgos relevantes.

---



## Under Pressure

La capacidad financiera comienza a reducirse.

Puede deberse a:

- disminución de ingresos,
- aumento de gastos,
- reducción del fondo de emergencia,
- acumulación de compromisos.

Todavía no existe una situación crítica, pero requiere atención.

---



## Critical

La familia presenta un riesgo elevado para mantener su estabilidad financiera.

Las decisiones deben centrarse en recuperar el equilibrio.

---



## Recovery

La situación mejora progresivamente.

Los riesgos disminuyen y la capacidad de decisión comienza a recuperarse.

Todavía no se considera una situación completamente estable.

---



## Growing

La familia dispone de capacidad suficiente para avanzar hacia nuevos objetivos.

El sistema puede comenzar a identificar oportunidades de crecimiento.

---



# Cambios significativos

Las transiciones únicamente pueden producirse cuando ocurre un Significant Change.

Ejemplos:

- pérdida de ingresos,
- incorporación de un nuevo salario,
- nacimiento de un hijo,
- cancelación de una deuda,
- gasto extraordinario,
- recuperación del fondo de emergencia,
- cumplimiento de un objetivo importante.

No todos los movimientos generan una transición.

---



# Flujo conceptual

Stable
    │
    ▼
Under Pressure
    │
    ▼
Critical
    │
    ▼
Recovery
    │
    ▼
Growing

Las transiciones no son obligatoriamente lineales.

Una familia puede volver a un estado anterior cuando cambie su realidad financiera.

---



# Relación con el Decision Support Context

El estado financiero forma parte de la comprensión que el dominio tiene de la realidad.

No determina automáticamente una decisión.

Proporciona contexto para que el Decision Support Context pueda priorizar correctamente.

---



# Principios arquitectónicos

- El estado nunca depende de un único indicador.
- Toda transición debe ser justificable.
- Los estados representan conocimiento, no persistencia.
- El razonamiento del dominio utiliza el estado como contexto, nunca como única fuente de verdad.
- La evolución financiera debe ser comprensible para la familia.

---



# Resumen

La State Machine de SinDescuadre describe la evolución de la realidad financiera familiar.

Los estados representan situaciones financieras interpretadas y permiten mantener continuidad en el razonamiento del dominio.

El objetivo no consiste en clasificar a las familias, sino en comprender su evolución para ofrecer decisiones más útiles y oportunas.