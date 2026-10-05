# Aggregates

## Propósito

Este documento define los Aggregates del dominio de SinDescuadre y las reglas de consistencia que protegen.

Un Aggregate no representa un conjunto de entidades relacionadas ni una agrupación de tablas en la base de datos.

Su propósito es proteger las invariantes del negocio y garantizar que determinadas reglas nunca puedan romperse.

En SinDescuadre los Aggregates son pocos, intencionadamente.

El valor del producto reside en el razonamiento del dominio, no en la complejidad de sus entidades.

---

# Principios

Los Aggregates de SinDescuadre siguen los siguientes principios:

- Protegen reglas de negocio críticas.
- Mantienen consistencia transaccional.
- Definen límites claros de modificación.
- Son independientes entre sí.
- Nunca existen para reflejar la estructura de la base de datos.

---



# Aggregate: Family



## Propósito

Representar una unidad familiar coherente.

### Responsabilidades

- Mantener la composición de la familia.
- Gestionar altas y bajas de miembros.
- Garantizar la coherencia de los roles.
- Proteger las reglas relacionadas con la estructura familiar.



### Invariantes

- Todo miembro pertenece a una única familia.
- No puede existir una familia sin responsable.
- Los roles definidos deben ser válidos.
- La estructura familiar siempre debe permanecer consistente.

---



# Aggregate: Goal



## Propósito

Representar un objetivo financiero y su evolución.

### Responsabilidades

- Gestionar el ciclo de vida del objetivo.
- Mantener sus hitos.
- Registrar el progreso.
- Garantizar la coherencia de su estado.



### Invariantes

- Todo progreso pertenece a un único objetivo.
- Un objetivo solo puede completarse una vez.
- Los hitos deben respetar el orden definido.
- El estado del objetivo debe ser coherente con su progreso.

---



# Objetos que no son Aggregates

No todos los conceptos importantes del dominio necesitan un Aggregate.

## Financial Reality

No representa una fuente de verdad persistente.

Es una interpretación construida a partir de otros datos del dominio.

---



## Decision Context

Representa el contexto utilizado para razonar.

No mantiene invariantes propias.

---



## Decision

Es el resultado de un proceso de razonamiento.

No protege reglas de consistencia transaccional.

---



## Guidance

Representa la explicación de una decisión.

Su propósito es comunicar conocimiento, no mantener estado.

---



## Financial Event

Representa un hecho ocurrido.

No gobierna otras entidades ni mantiene consistencia sobre ellas.

---



# Relación con los Domain Services

Los Aggregates protegen el estado del dominio.

Los Domain Services coordinan la colaboración entre Aggregates y generan nuevo conocimiento.

Ambos conceptos son complementarios.

Los Aggregates mantienen la consistencia.

Los Domain Services construyen el razonamiento.

---



# Evolución del dominio

La incorporación de un nuevo Aggregate solo estará justificada cuando aparezcan nuevas reglas de negocio que requieran mantener consistencia propia.

La aparición de una nueva entidad no implica necesariamente la creación de un nuevo Aggregate.

---



# Principios arquitectónicos

En SinDescuadre:

- Los Aggregates son pequeños y con responsabilidades claras.
- Cada Aggregate protege un conjunto específico de invariantes.
- Ningún Aggregate conoce el estado interno de otro.
- La comunicación entre Aggregates se realiza mediante eventos o contratos explícitos.
- El razonamiento del dominio nunca debe residir dentro de un Aggregate cuando requiera información de varios contextos.

---



# Resumen

Los Aggregates de SinDescuadre existen únicamente para proteger las reglas de negocio que requieren consistencia.

El núcleo del producto no reside en los Aggregates, sino en el proceso de razonamiento que transforma hechos financieros en decisiones útiles.

Por esta razón, el modelo mantiene un número reducido de Aggregates y delega la interpretación del dominio en las capacidades descritas por los Domain Services.