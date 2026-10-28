# CFO Presence — Business Rules

Decisión: [ADR-0011](../../../decisions/ADR-0011-cfo-proactive-presence.md). Implementación: [technical-spec.md](./technical-spec.md).

## Identidad

1. Una **nota CFO** es un hallazgo estructurado + copy CARE persistido. No es fuente de verdad financiera.
2. Las candidatas las eligen **reglas de dominio**. La IA **solo redacta**.
3. No hay chat. No se ejecutan movimientos financieros sin flujo de dominio.
4. Guidance V1 no se fusiona; puede enlazarse por CTA.

## Kinds

5. `recommendation` — propone acción (comportamiento ADR-0009).
6. `alert` — aviso temprano con contexto (sin pánico; sin rojo de alarma en UI).
7. `summary` — narrativa de periodo corto; “aceptar” = archivar / marcar leída.
8. `nudge` — empujón conductual ligado a meta o ritmo.
9. `celebration` — logro; “aceptar” = archivar.

## Honestidad

10. Cifras solo desde hechos/agregados. Sin inventar.
11. Datos insuficientes → no generar o “aún no sabemos”.

## Persistencia e historial

12. Toda nota activa se persiste. Estados: `new` → `seen` → `accepted` | `deferred` | `dismissed` → (opcional) `resolved`.
13. El usuario puede **volver a leer** notas del archivo (Anteriores).
14. Dismiss / defer respetan cooldown (igual Recommendations).
15. Tope de activas por hogar: **3** (prioridad).

## UX

16. Scroll de Inicio **sin** cards de notas.
17. Entrada: **pastilla decorativa** fuera del scroll → **modal** con la nota prioritaria.
17b. La pastilla y el auto-modal **no aparecen** hasta que el tour de producto del **dashboard** esté completado (skip o done).
18. Auto-apertura del modal: como máximo **una vez por día** local, salvo nota `critical` nueva.
19. Superficie dedicada `/recommendations` presentada como **Notas** (Activas | Anteriores).
20. Soft notice previo queda **sustituido** por la pastilla.

## Monetización

21. Misma gate Premium / trial que Recommendations (ADR-0009).

## Prohibido

22. Cards de IA en el scroll del dashboard.
23. LLM eligiendo candidatas.
24. Chat / audio / push en Fase 1 (fases posteriores).
