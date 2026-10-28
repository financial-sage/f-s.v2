El sistema **razona en segundo plano y toma la iniciativa** para contarle al usuario, en lenguaje natural, qué está pasando con el dinero de su familia y qué conviene hacer al respecto. Es el paso de una herramienta pasiva a un **“CFO familiar” proactivo**.

Diseñar esto implica resolver tres capas: **qué se calcula** (datos e insights), **cómo se convierte en lenguaje** (generación de mensajes) y **cuándo y cómo se entrega** (el momento y el canal adecuados). Te explico cómo lo pensaría, capa por capa.

---

### 🧠 Capa 1: El motor de insights (lo que la IA “ve” antes de hablar)

Antes de que la IA pueda decir una sola palabra, necesita **comprender la situación financiera de la familia** con suficiente profundidad como para detectar lo que merece ser contado.

**Fuentes de datos y perfil familiar.** La app debe agregar cuentas (bancos, tarjetas, efectivo, inversiones) y construir un **perfil familiar explícito**: miembros del hogar, metas (colegio, vacaciones, fondo de emergencia), etapas vitales e incluso el estilo de comunicación que prefiere cada familia. Sin este contexto, los mensajes serían genéricos.

**Un motor de análisis que corra en segundo plano.** Aquí es donde se genera la materia prima del mensaje. En lugar de esperar a que el usuario pregunte, el sistema ejecuta **razonamiento proactivo sobre el historial de transacciones** de forma periódica o por eventos. Esto incluye:

- **Categorización automática** de gastos e ingresos con LLMs o modelos especializados.
- **Detección de patrones y anomalías**: por ejemplo, un aumento sutil en la carga de deuda, un cambio inesperado en el ahorro o un gasto atípico en una categoría.
- **Proyecciones de flujo de caja** para anticipar si el saldo alcanzará para cubrir los pagos recurrentes próximos.
- **Puntuaciones de salud financiera** multidimensionales que resumen el estado general y permiten comparar la evolución en el tiempo.

El resultado de esta capa no es un texto, sino **un conjunto de “hallazgos” estructurados**: cada uno con un tipo (alerta, oportunidad, tendencia), un nivel de confianza, una prioridad y los datos concretos que lo sustentan. Es la misma lógica de las *Action Cards* que priorizan solo lo más relevante en cada momento para no saturar.

### ✍️ Capa 2: La generación de lenguaje (cómo la IA “decide hablar”)

Aquí está el corazón de tu idea: convertir los hallazgos en **narrativa útil y personalizada**, no en una lista de números.

**NLG financiero, no un chatbot.** La generación de lenguaje natural (NLG) para finanzas no consiste en “conversar”, sino en **transformar datos en explicaciones contextualizadas** adaptadas a la audiencia. El sistema debe tener plantillas y guías de estilo que definan cómo se cuenta cada tipo de hallazgo.

**Tipos de mensajes que la IA puede generar de forma autónoma:**

- **Resumen narrativo periódico**: *“Esta semana gastaron un 12% menos en supermercado, pero el gasto en transporte subió porque el coche necesitó una revisión. Aun así, van 80 € por delante de lo presupuestado para este mes.”*
- **Alerta temprana con contexto y acción**: *“Ojo: con los pagos que vienen (colegio y seguro) y el ingreso que esperan, el saldo podría quedar justo antes del día 25. Si adelantan 50 € del presupuesto de ocio, no tendrían que tocar el fondo de emergencia.”*
- **Nudge conductual personalizado**: un mensaje que conecta el gasto con una meta familiar concreta, usando un tono cercano en lugar de uno técnico.
- **Celebración de logros**: *“¡Ya cubrieron el 60% del fondo para las vacaciones! Si mantienen este ritmo, lo completan dos semanas antes de lo previsto.”*

**El tono y la persona son parte del producto.** La IA debe hablar como un miembro más del equipo familiar: claro, sin jerga, con un nivel de formalidad ajustable. Investigaciones en asesoramiento conductual muestran que el encuadre importa: hablar de “familia” y “compra del súper” en lugar de “portafolio” y “rentabilidad” cambia la disposición de la gente a actuar. La app debería permitir elegir entre un **estilo cercano y motivador** o uno **más sobrio y directivo**, y recordar esa preferencia.

**Memoria conversacional y de contexto.** Aunque no sea un chat, la IA debe **recordar** lo que ya ha dicho y lo que la familia ha hecho al respecto. Si ya alertó de un gasto y el usuario lo corrigió, no debe volver a mencionarlo de la misma forma. Esto se logra con una memoria de interacciones y preferencias que da continuidad y evita la sensación de “robot con amnesia”.

### 📬 Capa 3: La entrega (cuándo y cómo la IA “toma la palabra”)

El mejor mensaje del mundo se vuelve ruido si llega en mal momento o por el canal equivocado.

**Disparadores basados en eventos y en ritmos familiares.** La IA no debe hablar solo porque ha pasado un tiempo. Debe activarse por **eventos significativos**: un saldo que cruza un umbral, una proyección de déficit, un gasto inusual, el cierre de una semana o la aproximación de una meta. También puede haber **rituales acordados**, como un resumen cada domingo por la tarde, que la familia espera y valora.

**Multicanal pero con un canal principal.** El mensaje puede aparecer como **notificación push** en el momento oportuno, como una **tarjeta destacada al abrir la app** (el equivalente a las Action Cards), o incluso como un **breve audio** si la familia prefiere escuchar mientras se desplaza. Lo importante es que la IA elija el canal en función de la **urgencia y la preferencia** del usuario, no que dispare todo por todos lados.

**Control total para evitar la fatiga de notificaciones.** La literatura sobre notificaciones financieras es clara: deben ser **oportunas, personales, útiles y controlables**. La app debe ofrecer un panel donde la familia ajuste:

- **Qué tipo de mensajes quiere recibir** (solo alertas críticas, o también resúmenes y celebraciones).
- **La frecuencia** (diaria, semanal, solo cuando sea importante).
- **El nivel de detalle** (con cifras o solo con la conclusión y la acción).
- **El horario de silencio** para no interrumpir cenas o reuniones.

### 🛡️ Consideraciones transversales para que funcione

- **Confianza y precisión:** la IA no debe “inventar” cifras. Los cálculos y las proyecciones deben venir de **herramientas deterministas** (el motor de insights), y el LLM debe limitarse a **interpretar y narrar** esos resultados, no a hacer las cuentas. Cada mensaje debería poder expandirse para mostrar **los datos exactos que lo sustentan** (las transacciones o el cálculo concreto).
- **Privacidad familiar:** los datos de una familia son sensibles. La arquitectura debe permitir un **procesamiento local o seudonimizado** cuando sea posible, y ser transparente sobre qué se envía a modelos externos y qué no.
- **Un “porqué” claro en cada mensaje:** la IA no solo dice *qué* pasa, sino *por qué* lo dice y *qué puede hacer la familia*. Un mensaje sin una acción clara (aunque sea “no hacer nada, van bien”) genera ansiedad en lugar de tranquilidad.

### 🔄 Ejemplo de flujo completo en un día cualquiera

1. **Motor de insights:** a las 3:00 a.m. corre el análisis. Detecta que el gasto en restaurantes de la familia subió un 30% en las últimas dos semanas y que, al ritmo actual, la meta de ahorro para el viaje de fin de curso se retrasará un mes.
2. **Generación de lenguaje:** el NLG construye un mensaje con el tono configurado (cercano): *“He notado que este mes han salido a comer más de lo habitual. No es un drama, pero si recortan dos salidas en las próximas dos semanas, el fondo del viaje vuelve a ir en fecha. ¿Quieren que les proponga un pequeño ajuste en la categoría de ocio?”*
3. **Entrega:** el mensaje aparece como **tarjeta destacada** al abrir la app un martes por la tarde, y **no** se envía como push porque el usuario tiene configurado que las sugerencias no urgentes solo se muestren dentro de la app.
4. **Memoria:** la familia toca “Ajustar ocio” y la app actualiza el presupuesto. La IA registra que ese tipo de sugerencia fue aceptada y, en el futuro, priorizará mensajes similares en lugar de alertas puramente informativas.

En resumen, la clave no está en tener el LLM más potente, sino en **construir un sistema que sepa qué merece ser contado, cómo contarlo para que esa familia concreta lo entienda y lo pueda accionar, y en qué momento exacto hacerlo**. La IA deja de ser una ventana de chat y se convierte en una **presencia financiera silenciosa que habla solo cuando tiene algo valioso que decir**.