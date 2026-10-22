# Recommendations — Business Rules

Implementación y rutas: [technical-spec.md](./technical-spec.md). Decisión: [ADR-0009](../../../decisions/ADR-0009-persistent-recommendations-ai.md).

## Identidad y alcance

1. Recommendations **propone acciones** basadas en hechos del dominio; no es fuente de verdad financiera.
2. Las **candidatas** las eligen **reglas** (opción A). La **IA solo redacta** texto CARE sobre hechos ya calculados.
3. Recommendations **no ejecuta** gastos, traspasos, aportes a ahorro ni cambios de entitlement por sí sola.
4. **No hay chat** ni hilo conversacional en esta feature.
5. Guidance V1 sigue siendo la capa de explicación efímera; no se fusionan en un solo módulo.

## Honestidad de datos

6. Toda cifra en una recomendación o balance debe provenir de hechos/agregados calculados por el dominio (o derivados documentados en technical-spec).
7. La IA **no** inventa saldos, porcentajes ni proyecciones. Si el prompt no trae el número, el copy no lo afirma.
8. Si faltan datos para una candidata o un balance → no se genera, o se comunica “aún no sabemos” / historial insuficiente.
9. Solo hechos visibles para el usuario actual (mismas reglas de privacidad que Accounts / Funds / home).

## Persistencia y ciclo de vida

10. Toda recomendación activa se **persiste** (familia o miembro, según technical-spec).
11. Estados: `new` → `seen` → `accepted` | `deferred` | `dismissed` → (opcional) `resolved`.
12. Posponer y descartar deben respetarse al generar de nuevo (no spamear la misma candidata sin cooldown documentado).
13. El historial de interacción puede influir en futuras candidatas (p. ej. no insistir tras dismiss reciente).

## Contenido y tono

14. Cada recomendación responde: qué, por qué (hechos), impacto, CTA posible.
15. Tono CARE: claridad, acción, tranquilidad, educación breve. Sin culpa ni alarmismo.
16. Prioridades: crítica / importante / oportunidad / educativa. Como máximo un conjunto pequeño activo a la vez (ver technical-spec: tope V1).
17. Incluir candidatas de **ahorro** cuando el contexto lo permita (margen, liquidez, bolsillo ahorro, hábitos), sin imponer un % inventado.

## UX / Dashboard

18. El **scroll** de Dashboard Solo/Couple **no** incorpora cards, banners ni strips de recomendaciones.
19. La entrada en Inicio es un **aviso suave fuera del scroll** (chip / franja fija bajo header o anclaje sobre bottom nav / safe area).
20. El detalle y la lista viven en superficie dedicada (`/recommendations` o sección acordada en technical-spec); enlace también desde Perfil.
21. No se añade ítem nuevo a BottomNav en Fase 1 salvo decisión explícita posterior.
22. Tocando el aviso suave → lista o detalle de recomendaciones activas (no abre chat).

## Balances (Fases 2–3)

23. **Balance mes vs mes anterior (Fase 2):** agregados dominio mes N vs N−1; narrativa IA anclada a esos agregados.
24. **Balance de periodo (Fase 3):** el usuario elige 3 / 6 / 12 (u otro rango permitido); dominio agrega; IA reconstruye informe. No es chat.
25. Sin historial suficiente para la ventana pedida → mensaje honesto; no rellenar huecos con estimaciones no documentadas.

## Aceptar / CTA

26. “Aceptar” marca estado y, si hay CTA, navega al flujo de dominio (ahorro, cuentas, historial, etc.).
27. Ninguna acción de Recommendations escribe hechos financieros sin pasar por el flujo de dominio correspondiente con confirmación del usuario.

## Prohibido

28. Dejar que el LLM elija o invente la candidata sin regla de dominio (salvo ADR futuro).
29. Card de recomendaciones dentro del scroll del dashboard.
30. Chat / streaming conversacional en esta feature.
31. Ejecutar traspasos o aportes “en nombre del usuario” sin UI de dominio.
32. Presentar un balance de periodo como contabilidad auditada si los datos son parciales sin aclararlo.
