# CFO Presence (presencia proactiva + historial)

## Estado

**Definido — 2026-10-26** (ADR-0011). Fase 1 en implementación. Fases 2–4 documentadas, no bloquean el primer ship.

## Propósito

CFO Presence hace **viva** la capa de apoyo: el sistema detecta hallazgos, los convierte en **notas** en lenguaje natural (CARE) y las entrega en el momento adecuado **sin** cargar el scroll del dashboard ni abrir un chat.

Evoluciona Recommendations (ADR-0009): mismas reglas + IA de redacción, más tipos de mensaje, pastilla (auto-modal 1×/día; toque → lista Activas), e **historial releyible**.

Visión narrativa: [CFO Familiar Proactivo](../../../CFO%20Familiar%20Proactivo.md). Decisión: [ADR-0011](../../../decisions/ADR-0011-cfo-proactive-presence.md).

---

# Decisiones de producto

| Tema | Decisión |
|------|----------|
| Base | Extiende `family_recommendations` con `kind` |
| Kinds | `recommendation` \| `alert` \| `summary` \| `nudge` \| `celebration` |
| Entrada Inicio | Pastilla decorativa **fuera del scroll** → modal |
| Scroll dashboard | **Sin** cards / banners de IA |
| Historial | Activas + Anteriores (releer) |
| Auto-modal | Máx. 1×/día (o critical nueva) |
| Chat | No |
| IA | Solo redacción; reglas eligen |
| Premium | Igual que Recommendations |
| Guidance | Sigue aparte (`/guidance`) |

---

# Fases

## Fase 1 — Presencia + historial (este ship)

- `kind` + reglas ampliadas (nudge / celebration / summary / alert ligeros).
- Pastilla + modal + auto-apertura acotada.
- Página Notas: activas + enlace sutil a anteriores.
- Soft notice absorbido.

## Fase 2 — Push + preferencias

- Web push (infra existente) para notas permitidas (p. ej. critical).
- Preferencias: tipos, frecuencia, silencio.

## Fase 3 — Motor más profundo

- Balance mes / periodo (ADR-0009 F2–F3).
- Proyección de flujo determinista.
- Scores de salud ligeros documentados.

## Fase 4 — Tono y audio (opcional)

- Estilo cercano vs sobrio.
- Audio breve bajo demanda.

---

# Relación con otras features

| Feature | Relación |
|---------|----------|
| Recommendations | Misma persistencia; CFO redefine UX de entrada e historial |
| Guidance | Explica el mapa; no persiste notas |
| Notifications / push | Fase 2 |
| AI Assistant | Chat aplazado |

---

# Referencias

- [business-rules.md](./business-rules.md)
- [technical-spec.md](./technical-spec.md)
- [user-flow.md](./user-flow.md)
- [implementation-checklist.md](./implementation-checklist.md)
