# Resumen: decisiones con el dinero, ayuda de SinDescuadre e IA

Documento de síntesis a partir de la documentación oficial de producto, dominio e IA (`docs/product/foundations/`, `docs/product/experiences/`, `docs/architecture/domain/`, `docs/architecture/ai/`). No sustituye esas fuentes.

---

## 1. Qué debe hacer la aplicación respecto a las decisiones con el dinero

SinDescuadre **no es un registro de gastos**. Es un **sistema de apoyo a la toma de decisiones financieras familiares**.

### El problema que resuelve

Las familias suelen saber cuánto entra y cuánto sale, pero no tienen claridad para decidir. Las apps tradicionales muestran saldos, gráficos y categorías; dejan la interpretación al usuario. Las preguntas difíciles quedan sin respuesta clara:

- ¿Podemos permitirnos esta compra?
- ¿Llegaremos bien a final de mes?
- ¿Qué impacto tendrá esta decisión dentro de meses?
- ¿Estamos avanzando hacia nuestros objetivos?
- ¿Qué deberíamos priorizar ahora?

El problema no es falta de datos: es **falta de comprensión**.

### Cadena de valor del producto

```text
Hechos financieros
        ↓
Realidad financiera (qué sabemos)
        ↓
Conocimiento / Decision Support (qué significa)
        ↓
Comprensión
        ↓
Decisiones
        ↓
Bienestar / tranquilidad financiera
```

### Capacidades que debe ofrecer

| Capacidad | En qué consiste |
| --- | --- |
| Construir la realidad financiera | Mantener una representación coherente y actualizada de la situación de la familia |
| Comprender el contexto | Interpretar hechos (qué pasó, por qué importa, qué impacto tiene) |
| Evaluar decisiones | Mostrar consecuencias posibles **antes** de actuar; la familia decide |
| Simular escenarios | Explorar “¿qué pasaría si…?” sin tocar la realidad real |
| Priorizar objetivos y compromisos | Ayudar a elegir qué merece atención cuando el margen es limitado |
| Acompañar la evolución | Recomendaciones, seguimiento y recordatorios contextualizados |
| Favorecer el aprendizaje | Explicar, contextualizar y educar de forma progresiva |
| Adaptarse al momento | Cambiar prioridades y mensajes según la situación actual |

### Filosofía de las decisiones con dinero

- El **dinero es una herramienta**, no un fin: ahorrar, gastar o invertir sirven a proyectos de vida.
- El indicador central no es el saldo, sino la **capacidad de decisión**: el margen real para actuar con tranquilidad tras considerar ingresos, compromisos, ahorro, objetivos y estabilidad.
- Se distingue **dinero comprometido** vs **margen libre** sobre el que sí se puede decidir.
- **Claridad antes que control**: menos ruido, más respuestas útiles.
- **Progreso antes que perfección**: sin culpa; evolución en el tiempo.
- **Hechos antes que interpretaciones**: Financial Reality = qué sabemos; Decision Support = qué significa; IA/UX = cómo se explica. “Aún no sabemos” es válido; inventar un número no lo es.
- El sistema **acompaña y recomienda**; **nunca sustituye** la decisión final de la persona o la familia.

### Resultado buscado

Que la familia sepa, en pocos segundos: **cómo está**, **qué puede hacer hoy** y **cuál es el siguiente paso**, con menos incertidumbre y más confianza.

---

## 2. En qué ayuda SinDescuadre al usuario

### Qué recibe el usuario en la práctica

1. **Una foto clara de su realidad**  
   Dashboard / Inicio orientado a: *¿Cómo estamos hoy y qué deberíamos hacer?* — no un panel de estadísticas.

2. **Capacidad de decisión visible**  
   No “cuánto dinero tengo”, sino **qué margen tengo** para gastar, comprometer, ahorrar o avanzar hacia objetivos sin poner en riesgo la estabilidad.

3. **Separación entre realidad y margen**  
   Compromisos y obligaciones se hacen visibles; el usuario ve qué parte del dinero ya tiene destino y qué parte es decisión libre.

4. **Prioridad única (o pocas) en cada momento**  
   El Decision Engine no intenta resolverlo todo a la vez: identifica **qué merece atención ahora** (riesgos, oportunidades, compromisos, objetivos).

5. **Recomendaciones útiles**  
   Relevantes, comprensibles y accionables. Cada una debe poder responder: *¿por qué aparece?*, *¿qué pasa si la sigo?*, *¿qué pasa si la ignoro?* El usuario puede aceptar, posponer o descartar.

6. **Registro con sentido**  
   Movimientos e ingresos/gastos actualizan hechos; compromisos preparados anticipan obligaciones; objetivos dan sentido al dinero (no reservan dinero por sí solos).

7. **Uso diario de bajo esfuerzo**  
   Cada visita debe aportar valor rápido: cambios relevantes, próximos vencimientos, recomendaciones oportunas — sin exigir uso intensivo.

8. **Simulación antes de decidir**  
   Escenarios del tipo “¿qué pasaría si compro / viajo / aumento el ahorro?” sobre una copia temporal de la realidad, sin riesgo.

9. **Acompañamiento familiar**  
   La unidad de decisión es la **familia** (ingresos, gastos, objetivos y prioridades compartidos), no solo el individuo.

10. **Lenguaje y tono CARE**  
    Claridad, acción concreta, tranquilidad (sin culpa ni alarmismo), educación progresiva.

### Lo que SinDescuadre **no** hace

- No decide por el usuario.
- No impone una única forma “correcta” de administrar el dinero.
- No presenta interpretaciones (estabilidad, capacidad) como si fueran saldos objetivos cuando faltan datos.
- No prioriza captar atención con ansiedad o dependencia.

---

## 3. Cómo ayuda la IA a tomar mejores decisiones con el dinero

### Papel de la IA: copiloto, no juez ni cajero

La IA es la **capa que explica y conversa** sobre el conocimiento del dominio. El dominio (Financial Reality + Decision Support / Decision Engine) sigue siendo la **única fuente de verdad**.

```text
Financial Reality     → qué sabemos (hechos)
Decision Support      → qué significa (interpretación, prioridades, recomendaciones)
IA / Experiencia      → cómo lo explicamos y acompañamos en lenguaje natural
```

La IA **nunca** debe:

- modificar directamente la Financial Reality;
- ejecutar reglas de negocio en secreto;
- inventar cifras o hechos;
- acceder a la base de datos en bruto;
- sustituir al Decision Engine.

Las acciones que cambian la realidad requieren **confirmación explícita** del usuario.

### En qué ayuda concretamente

| Tipo de ayuda | Ejemplos |
| --- | --- |
| **Comprensión** | ¿Por qué bajó mi capacidad de decisión? ¿Qué significa este indicador? ¿Por qué salió esta recomendación? |
| **Planificación** | ¿Qué priorizar este mes? ¿Puedo asumir un nuevo compromiso? ¿Qué objetivo conviene ahora? |
| **Exploración** | ¿Qué pasa si aumento el ahorro? ¿Si retraso esta compra? ¿Si cancelo esta deuda antes? |
| **Aprendizaje** | Explicar conceptos (fondo de emergencia, liquidez, cómo interpreta el producto la realidad) |
| **Resumen y guía** | Sintetizar un periodo; orientar hacia Planning, Goals, Timeline, simulador o flujo de recomendación |

### Framework CARE en las respuestas de IA

- **Clarity** — respuestas sencillas y contextualizadas.
- **Action** — acercar a una acción o a una mejor decisión.
- **Reassurance** — tono calmado, especialmente bajo incertidumbre.
- **Education** — cada conversación refuerza criterio y autonomía.

### Cómo se integra en la arquitectura (visión)

1. El usuario pregunta o pide explicación.
2. La aplicación construye **contexto autorizado** (realidad, compromisos, objetivos, tendencias…).
3. La IA trabaja sobre ese contexto (no sobre SQL crudo).
4. La respuesta se **valida y estructura**.
5. El Decision Engine / dominio combina reglas + resultado de IA cuando aplica.
6. La experiencia muestra la explicación o recomendación al usuario.

Principio: *la mejor respuesta no es la del modelo solo, sino la que combina correctamente dominio + IA*.

### Estado de producto (V1 vs visión completa)

| Capacidad | En documentación / estado |
| --- | --- |
| **IA contextual en Inicio** | **Guidance V1 cerrada** (ADR-0008): explicaciones deterministas (“¿Por qué?”), modal + `/guidance` — **sin chat ni LLM**. |
| **Recomendaciones persistentes** | **Definido** (ADR-0009): reglas eligen candidatas; **IA solo redacta** CARE; aviso suave fuera del scroll; aceptar / posponer / descartar. Fases: recs → balance mes vs mes → informe de periodo (3/6/12) bajo demanda. **Sin chat.** |
| **Conversación / AI Assistant** | Visión de producto: chat contextual como copiloto. **Aplazado** (no es el siguiente foco). |
| **Simulador de decisiones** | Capacidad de producto documentada; exploración de escenarios (“¿qué pasaría si…?”). |

En resumen: **hoy** Guidance explica con honestidad lo que el sistema ya sabe; **siguiente** Recommendations propone y recuerda (con IA de redacción) e incorpora balances en el tiempo; la conversación libre queda para después — siempre sin decidir por la familia ni inventar hechos.

---

## 4. Mensaje central (una frase)

> SinDescuadre ayuda a las familias a **entender su realidad financiera**, ver su **capacidad real de decidir** y recibir **recomendaciones y explicaciones** (con apoyo de IA como copiloto) para actuar con más confianza — **sin sustituir su criterio**.

---
