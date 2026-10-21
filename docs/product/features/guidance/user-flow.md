# Guidance · User Flow

## Propósito

Describir cómo la familia recibe explicación contextual sin que el Inicio se sienta más cargado.

---

# Filosofía

Cada visita al dashboard debe seguir respondiendo en segundos: ¿cómo estamos? Guidance añade, solo si el usuario lo pide, el “por qué” y el siguiente paso posible.

---

# Flujo A — Microenlace en Inicio

## 1. Contexto

El miembro está en Inicio (Solo o Couple). El hero y los módulos se ven como siempre.

## 2. Descubrimiento

Junto al label existente del hero (p. ej. “Saldo disponible”) aparece un microenlace de texto: **¿Qué significa?**

No hay card nueva ni banner de insight.

## 3. Apertura

Al tocar, se abre el modal Guidance con:

- título y cuerpo CARE del insight principal;
- lista “Por qué lo sabemos” (`why[]`);
- CTA opcional a una ruta ya existente.

## 4. Cierre

Cierra el modal y vuelve al mismo scroll/estado del dashboard.

## 5. Acción (opcional)

Si sigue el CTA, navega a `/accounts`, `/fixed-expenses`, etc., según el insight.

---

# Flujo B — Desde Perfil

## 1. Apertura

El miembro abre Perfil → Preferencias (o lista de enlaces equivalente).

## 2. Entrada

Toca **Orientación** (o copy equivalente) → `/guidance`.

## 3. Comprensión

La página muestra el insight principal y hechos citados, con el mismo tono CARE. Sin widgets de dashboard duplicados.

## 4. Acción

CTA a rutas existentes o volver atrás.

---

# Flujo C — Datos insuficientes

Si el contexto no permite una afirmación útil:

1. El modal/página muestra mensaje calmado de “aún no sabemos”.
2. Sugiere un paso de registro concreto (p. ej. abrir cuentas) sin culpa.
3. `confidence` es `unknown`.

---

# Qué no ocurre en estos flujos

- No se inserta un insight permanente en el feed del home.
- No se abre chat.
- No se modifican saldos ni se crean movimientos.
