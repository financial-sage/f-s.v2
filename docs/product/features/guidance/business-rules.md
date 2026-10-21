# Guidance — Business Rules

Implementación y rutas: [technical-spec.md](./technical-spec.md).

## Identidad y alcance

1. Guidance explica hechos **ya publicados** por el dominio; no es fuente de verdad financiera.
2. V1 usa plantillas deterministas. No hay llamadas a LLM ni chat.
3. Guidance no crea, edita ni borra gastos, cuentas, bolsillos, presupuestos ni entitlements.
4. Guidance no sustituye al Decision Engine futuro ni a Recommendations persistentes.

## Honestidad de datos

5. Toda cifra mostrada en un insight debe provenir del snapshot de contexto (o de un derivado explícito documentado en technical-spec).
6. Si falta un dato necesario para una afirmación, el insight usa `confidence: unknown` y copy del tipo “aún no sabemos”, nunca un número inventado.
7. No se presentan interpretaciones (estabilidad, “vas bien/mal”) como si fueran saldos contables.
8. Solo se usan hechos visibles para el usuario actual (mismas reglas de privacidad que Accounts/Funds en el home).

## Prioridad y contenido

9. Por visita al home, hay **como máximo un** insight principal expuesto en el modal “¿Por qué?”.
10. `/guidance` puede mostrar el mismo insight principal y, opcionalmente, contexto adicional de solo lectura; no satura con listas largas en V1.
11. El tono sigue CARE: claridad, acción concreta posible, tranquilidad, educación breve.
12. El sistema acompaña; no culpa, no alarmismo, no sustituye la decisión de la familia.
13. Cada insight principal debe poder responder: qué dice, por qué (hechos), qué puede hacer el usuario después (CTA a ruta existente o ninguno).

## UX / Dashboard

14. El layout visual de Dashboard Solo/Couple **no** incorpora cards, banners ni strips de insight.
15. La única adición permitida en Inicio es un **microenlace** de texto (p. ej. “¿Qué significa?”) junto a un label ya existente.
16. El detalle vive en modal y/o en `/guidance`.
17. No se añade ítem nuevo a BottomNav para Guidance.
18. Desde Perfil debe existir un enlace claro a `/guidance`.

## Reglas de generación V1 (orden de prioridad)

Al elegir el insight principal, evaluar en orden; usar el primero aplicable:

19. Saldo negativo en bolsillo activo, algún bolsillo listado o liquidez de cuentas → alertar con hechos y tono calmado (sin culpa ni alarma). Si la cuenta está en negativo, priorizar ese foco frente al bolsillo. CTA a orientación detallada / cuentas / historial según el caso.
19b. Cuenta visible con liquidez exactamente 0 → informar con calma (“cuenta en cero”); si hay saldo en bolsillos, aclarar que el dinero está ahí. No tratar el cero como fracaso.
20. Sin cuentas visibles → invitar a abrir/registrar cuentas (CTA `/accounts`) con tono calmado.
21. Hay liquidez en cuentas visible pero bolsillo/hero bajo relativo al contexto → explicar separación cuenta vs bolsillo (sin juzgar).
22. Hay gastos del mes y datos de bolsillo → insight de margen/compromiso con hechos citados (spent / balance disponibles).
23. Si no hay base suficiente → insight `unknown` genérico (“cuando registres movimientos, podremos explicar mejor tu margen”).

24. Nunca más de un insight “urgente”; si varios aplican, gana el de mayor prioridad en esta lista.

## Prohibido

25. Inventar saldos, proyecciones o “capacidad de decisión” sin fórmula documentada y datos de entrada.
26. Ejecutar acciones financieras desde Guidance sin confirmación en el flujo de dominio correspondiente.
27. Mezclar Guidance V1 con UI conversacional del AI Assistant.
28. Tratar un saldo negativo como fracaso moral del usuario; solo como hecho a explicar y acción posible.
