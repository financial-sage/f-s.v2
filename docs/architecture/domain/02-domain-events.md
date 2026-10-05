# Domain Events

## Propósito

Los Domain Events representan acontecimientos relevantes dentro del dominio de SinDescuadre.

Cada evento describe un hecho que ya ha ocurrido y que modifica la realidad financiera de una familia.

Estos eventos constituyen el punto de partida para la actualización del Financial Reality Model y la ejecución del Decision Engine.

No representan operaciones técnicas ni acciones de la interfaz.

Representan hechos del negocio.

---

# Principios

Todo Domain Event debe cumplir los siguientes principios:

* Describe un hecho que ya ocurrió.
* Tiene significado para el negocio.
* Puede modificar la interpretación de la realidad financiera.
* Es independiente de la tecnología utilizada para almacenarlo o procesarlo.

---

# Categorías de eventos

## Eventos relacionados con movimientos financieros

* MovementRecorded
* MovementUpdated
* MovementCancelled

Representan cambios en los movimientos económicos registrados por la familia.

---

## Eventos relacionados con ingresos

* IncomeReceived
* IncomeModified
* IncomeCancelled

Representan cambios en la capacidad económica disponible.

---

## Eventos relacionados con gastos

* ExpenseRegistered
* ExpenseCorrected
* ExpenseCancelled

Representan modificaciones en el consumo de recursos financieros.

---

## Eventos relacionados con compromisos

* CommitmentCreated
* CommitmentUpdated
* CommitmentCompleted
* CommitmentCancelled

Representan obligaciones económicas que afectan a la planificación futura.

---

## Eventos relacionados con objetivos

* GoalCreated
* GoalUpdated
* GoalPaused
* GoalCompleted
* GoalCancelled

Representan cambios en aquello que la familia desea construir.

---

## Eventos relacionados con la familia

* FamilyMemberAdded
* FamilyMemberRemoved
* FamilyProfileUpdated

Representan cambios en el contexto familiar.

---

## Eventos relacionados con la planificación

* BudgetPeriodStarted
* BudgetAdjusted
* FinancialPlanUpdated

Representan cambios en la planificación económica.

---

# El efecto de un evento

Un Domain Event no genera directamente una recomendación.

Su función consiste en informar al dominio de que la realidad financiera ha cambiado.

A partir de ese momento, el sistema:

1. Reinterpreta la Financial Reality.
2. Recalcula la Decision Capacity.
3. Detecta nuevas Opportunities.
4. Genera o actualiza el Guidance correspondiente.
5. Refresca la información presentada en el Dashboard.

---

# Un dominio impulsado por acontecimientos

SinDescuadre no responde únicamente a acciones del usuario.

Responde a cambios en la realidad financiera.

Cada evento representa una nueva pieza de contexto.

La acumulación de estos acontecimientos permite mantener una interpretación viva y continuamente actualizada de la situación de cada familia.
