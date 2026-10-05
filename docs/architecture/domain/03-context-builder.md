# Context Builder

## Propósito

El Context Builder es el componente responsable de transformar la Financial Reality en un contexto comprensible para el Decision Engine.

Su misión no es tomar decisiones.

Su misión es preparar la información necesaria para que las decisiones puedan tomarse con criterio.

Representa el puente entre la interpretación de la realidad y el razonamiento del sistema.

---

# ¿Por qué existe?

La realidad financiera contiene una gran cantidad de información.

No toda esa información es igualmente relevante para cada decisión.

El Context Builder identifica, organiza y resume los aspectos más importantes del momento actual para que el Decision Engine pueda centrarse en razonar, no en recopilar datos.

---

# ¿Qué construye?

El resultado del Context Builder es un **Decision Context**.

Un Decision Context representa la fotografía interpretada de la situación actual de la familia.

Puede incluir elementos como:

* Nivel de liquidez.
* Estabilidad financiera.
* Capacidad de decisión.
* Objetivos prioritarios.
* Compromisos activos.
* Riesgos detectados.
* Oportunidades identificadas.
* Tendencias recientes.
* Cambios relevantes desde la última evaluación.

No se trata de mostrar todos los datos disponibles, sino de destacar aquello que realmente influye en la siguiente decisión.

---

# Responsabilidades

El Context Builder debe:

* Reunir la información relevante.
* Eliminar el ruido.
* Priorizar el contexto significativo.
* Mantener una representación coherente de la situación actual.

No debe:

* Generar recomendaciones.
* Priorizar acciones.
* Comunicar con el usuario.
* Aplicar reglas de negocio sobre qué hacer.

Esas responsabilidades pertenecen al Decision Engine y al Guidance Engine.

---

# Un contexto preparado para razonar

El Decision Engine no debería preguntarse dónde obtener la información.

Debe recibir un contexto ya preparado y consistente.

Esto permite que el razonamiento permanezca centrado en responder una única pregunta:

**¿Cuál es la mejor decisión para esta familia en este momento?**

---

# Beneficios arquitectónicos

Separar la construcción del contexto del proceso de decisión aporta varias ventajas:

* Reduce el acoplamiento entre componentes.
* Facilita la evolución del modelo de contexto.
* Permite mejorar la interpretación sin modificar el razonamiento.
* Hace más sencillo probar cada componente de forma independiente.

El Context Builder convierte una realidad compleja en un contexto claro.

Gracias a ello, el Decision Engine puede concentrarse exclusivamente en tomar decisiones fundamentadas.
