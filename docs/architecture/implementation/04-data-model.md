# Data Model

## Propósito

Este documento define el modelo de información de SinDescuadre.

Su objetivo es establecer qué conocimiento debe persistir el sistema y qué información debe obtenerse mediante razonamiento a partir de los datos registrados.

El modelo de datos refleja el dominio del negocio y no la estructura física de la base de datos.

---

# Principios

El modelo sigue los siguientes principios:

- Solo se persisten hechos del dominio.
- El conocimiento se deriva de los hechos.
- Las decisiones nunca constituyen la fuente de verdad.
- La persistencia existe para permitir reconstruir la realidad financiera.

---



# Modelo conceptual

La información gestionada por SinDescuadre se organiza en tres niveles.

```text
Financial Facts
        │
        ▼
Financial Knowledge
        │
        ▼
Decision Support
```

---



# Financial Facts

Representan hechos objetivos registrados por el sistema.

Son persistentes.

Constituyen la memoria del dominio.

Ejemplos:

- Family
- Members
- Accounts
- Financial Events
- Commitments
- Goals
- Assets
- Debts
- Categories

Estos elementos nunca contienen interpretación.

---



# Financial Knowledge

Representa la interpretación de los hechos.

No constituye la fuente principal de verdad.

Ejemplos:

- Financial Reality
- Liquidity
- Cash Flow
- Emergency Fund
- Savings Capacity
- Financial Health
- Active Risks
- Opportunities

Este conocimiento puede reconstruirse a partir de los hechos almacenados.

---



# Decision Support

Representa el conocimiento generado para acompañar la toma de decisiones.

Ejemplos:

- Guidance
- Recommendations
- Suggested Priorities
- Warnings
- Decision Context

Estas estructuras se obtienen a partir del razonamiento del dominio.

---



# Entidades persistentes

El sistema persiste únicamente información necesaria para reconstruir el dominio.

## Family

Unidad financiera principal.

---



## Member

Personas que forman parte de la unidad familiar.

---



## Account

Lugar donde se administra dinero.

---



## Financial Event

Registro de cualquier hecho económico.

Ejemplos:

- ingreso,
- gasto,
- transferencia,
- devolución.

---



## Commitment

Obligaciones futuras.

---



## Goal

Objetivos financieros.

---



## Asset

Bienes que aportan valor al patrimonio.

---



## Debt

Obligaciones financieras pendientes.

---



## Category

Clasificación utilizada para organizar eventos financieros.

---



# Información derivada

La siguiente información se obtiene mediante razonamiento.

No constituye la fuente de verdad.

- Financial Reality
- Decision Context
- Guidance
- Risk Evaluation
- Opportunity Detection
- Priority Ranking

Su persistencia podrá utilizarse únicamente como mecanismo de optimización.

---



# Consistencia

Toda modificación persistente genera una nueva realidad financiera.

El sistema nunca actualiza directamente el conocimiento derivado.

Primero modifica los hechos.

Después reconstruye la interpretación.

---



# Evolución

El modelo podrá incorporar nuevas entidades siempre que representen hechos relevantes del dominio.

No deberán persistirse cálculos temporales, interpretaciones o recomendaciones salvo por motivos de rendimiento claramente justificados.

---



# Resumen

El modelo de datos de SinDescuadre diferencia claramente entre hechos, conocimiento y decisiones.

La persistencia conserva únicamente los hechos necesarios para reconstruir la realidad financiera, mientras que el conocimiento y las recomendaciones son generados por el dominio cuando resultan necesarios.