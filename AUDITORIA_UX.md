# Auditoría UX — SinDescuadre

**Fecha:** 4 de noviembre de 2026  
**Rol:** Senior Product Manager + Diseño UX/UI  
**Alcance:** Aplicación PWA tal como está implementada hoy (`src/app/(pwa)`, componentes, docs de producto y ADRs).  
**Método:** Revisión estructural de rutas, navegación, paneles y formularios; contraste con reglas de dominio (ADR-0006/0007/0010/0011) y copy en español de la UI.

### Contexto de producto (mapa mental que el usuario debe aprender)

SinDescuadre enseña tres capas de dinero:

| Concepto | Qué es | Dónde vive en la UI |
|----------|--------|---------------------|
| **Cuenta** | Dónde está el dinero (banco / liquidez / TC / inversión) | `/accounts` |
| **Bolsillo** | Cómo se organiza el gasto del mes | `/bolsillos` + selector en gasto |
| **Ahorro** | Dinero apartado a propósito (no se gasta) | `/savings` |

Esa separación es correcta de dominio, pero es la **principal fuente de complejidad percibida**: el usuario final no llega buscando “tres entidades contables”, llega buscando “registrar lo que gasté” y “saber cómo vamos”.

### Inventario de superficie

| Ruta | Módulo |
|------|--------|
| `/` | Inicio (Dashboard solo / pareja) |
| `/history` | Historial |
| `/accounts` | Centro de cuentas |
| `/bolsillos` | Bolsillos |
| `/savings` | Ahorros |
| `/fixed-expenses` | Gastos fijos |
| `/categories` | Categorías |
| `/budget` | Presupuesto |
| `/guidance` | Orientación |
| `/recommendations` | Notas del CFO |
| `/profile` (+ privacy/support) | Perfil |
| `/onboarding`, `/login`, `/register`, … | Auth + primeros pasos |
| FAB **gasto** | Nuevo / editar gasto (sheet global) |
| `/cards` | Stub “Próximamente” (fuera del menú principal) |

**No existe hoy** carga de extractos bancarios ni panel de conciliación clásico. El acercamiento a “leer un ticket” es **Escanear** en el formulario de gasto (OCR de foto/PDF).

**Navegación:** un FAB **Menú** con 9 destinos en rejilla 3×3 + FAB **gasto**. Ningún módulo secundario está en la barra inferior fija; hay que abrir el menú para descubrirlos.

Escala de complejidad: **1** = súper intuitivo · **5** = requiere formación previa o un tour para no fallar.

---

## 1. Onboarding / Primeros pasos

**Nombre del Módulo / Flujo:** Onboarding (`/onboarding`)

**¿Qué hace hoy el usuario aquí?**
1. Tras registrarse sin familia, entra al wizard **Primeros pasos**.
2. Elige modo: **Individual** o **Pareja**.
3. Si pareja: pantalla de honestidad → **Tengo un código** o **Crear nuestra familia** → copiar/pegar código de invitación.
4. Configura **tema** (Claro / Oscuro / Sistema).
5. Elige **moneda**.
6. Crea **Tu primera cuenta** (nombre por defecto “Efectivo”) — se introduce el modelo cuenta ≠ bolsillo.
7. Configura **bolsillo de gasto** (usar el por defecto o crear otro).
8. Entra a la app (`Entrar a SinDescuadre`).
9. Después, tours contextuales (gasto, cuentas, etc.) aparecen por spotlight al usar cada módulo.

**Nivel de Complejidad Percibida:** **3.5 / 5**

**Puntos de Fricción Identificados:**
- 6–9 pantallas antes del valor (“ver mi dinero”); pareja es especialmente largo.
- Mezcla de vocabulario: **familia**, **espacio**, **pareja**, **modo individual** mientras el creador aún no tiene pareja unida.
- Obliga a entender **cuenta vs bolsillo** en el setup, antes de haber vivido un gasto real.
- Tours posteriores son otro onboarding fragmentado (localStorage por tour); se siente como “formación continua”.
- Docs de producto del onboarding vacíos vs wizard rico en código → riesgo de drift producto/UX.

**Oportunidades de Simplificación:**
- Reducir a **3 pasos de valor**: modo → (invitar opcional) → “registra tu primer gasto”; crear cuenta/bolsillo con defaults invisibles.
- Diferir explicación cuenta/bolsillo hasta el primer ingreso o la primera transferencia.
- Unificar “familia / espacio / pareja” en un solo término de producto.
- Convertir tours en tips de una línea dentro del sheet, no overlays que bloquean.

---

## 2. Autenticación

**Nombre del Módulo / Flujo:** Login / Registro / recuperación

**¿Qué hace hoy el usuario aquí?**
1. `/login`: correo + contraseña o **Entrar con Google**.
2. `/register`: nombre, correo, contraseña (o Google) → mensaje de confirmación de email.
3. Recuperación: forgot / reset password.
4. Tras éxito → home (o onboarding si no hay familia).

**Nivel de Complejidad Percibida:** **1.5 / 5**

**Puntos de Fricción Identificados:**
- Confirmación de email añade un paso de fricción clásico (esperado).
- Nota de “abrir desde el teléfono” en desktop puede confundir si el usuario ya está en web.

**Oportunidades de Simplificación:**
- Mantener Google como camino primario; password como “Más opciones”.
- Deep-link claro post-confirmación hacia onboarding corto.

---

## 3. Navegación global (Menú)

**Nombre del Módulo / Flujo:** Shell de navegación (BottomNav)

**¿Qué hace hoy el usuario aquí?**
1. Toca **Menú** (icono del módulo actual).
2. Se abre panel 3×3 con: Inicio, Historial, Cuentas, Bolsillos, Ahorros, Gastos fijos, Categorías, Presupuesto, Perfil (menos el actual).
3. En paralelo, FAB **gasto** abre el sheet de nuevo movimiento.
4. En home, docks laterales: **Tu realidad hoy** (orientación) y **N notas** (CFO, si aplica).

**Nivel de Complejidad Percibida:** **3 / 5**

**Puntos de Fricción Identificados:**
- **9 módulos pares** ocultan jerarquía: todo parece igual de importante.
- Descubrimiento: Categorías y Presupuesto son un par; Cuentas / Bolsillos / Ahorros son otro trío — pero el menú no lo comunica.
- El icono central cambia al módulo actual (“Menú” dice una cosa; el icono otra): elegante, pero poco convencional.
- Dos pastillas con sparkles (orientación vs notas) compiten por atención junto al FAB.

**Oportunidades de Simplificación:**
- Menú en **2 niveles**: “Dinero” (Cuentas, Bolsillos, Ahorros) y “Plan” (Fijos, Categorías, Presupuesto).
- Fijar 3–4 destinos frecuentes + “Más”.
- Una sola entrada de “ayuda inteligente” que unifique orientación y notas.

---

## 4. Inicio (Dashboard)

**Nombre del Módulo / Flujo:** Dashboard Solo / Pareja (`/`)

**¿Qué hace hoy el usuario aquí?**
1. Ve saludo + chip Premium.
2. **Solo:** hero **Saldo disponible** del bolsillo, tiles a Cuentas / Mi ahorro / Pagos fijos, señal del mes, movimientos recientes.
3. **Pareja:** hero con toggle **Bolsillos ↔ Cuentas**, gasto del mes, strip de **Mi bolsillo**, botón **Cobrar** si hay deuda interna, chips de actividad, movimientos.
4. Puede abrir FAB gasto, orientación, notas CFO, o “Ver todo” → historial.

**Nivel de Complejidad Percibida:** **3.5 / 5** (pareja) · **2.5 / 5** (solo)

**Puntos de Fricción Identificados:**
- En pareja, el toggle Bolsillos/Cuentas asume que el usuario ya entiende ambas capas.
- **Cobrar** suena a cobro bancario; en realidad es liquidar deuda interna de la app (requiere tour dedicado).
- Densidad de señales: Premium + orientación + notas + mes + deuda + movimientos.
- Copy “Pagos fijos” en tile vs “Gastos fijos” en menú.

**Oportunidades de Simplificación:**
- Un único número hero con subtítulo claro (“en bolsillos” o “en cuentas”) y un “Ver desglose” opcional.
- Renombrar **Cobrar** → **Saldar** / **Recuperar** (probado con usuarios).
- Empujar deuda y notas fuera del primer viewport si no son accionables hoy.

---

## 5. Nuevo gasto / Editar gasto (+ escaneo de ticket)

**Nombre del Módulo / Flujo:** Registro de movimiento (sheet global)

**¿Qué hace hoy el usuario aquí?**
1. Toca **gasto** → sheet **Nuevo gasto**.
2. Introduce **importe** (keypad de la app) **o** **Escanear** ticket/foto/PDF → espera OCR → opcional detalle/comparativa de precios.
3. Escribe concepto (**¿En qué gastaste?**).
4. Si hay cuentas: **Pagar desde** → **Bolsillo** | **Cuenta**.
5. En pareja: **Pagado por** (Mi / pareja / **50/50** / Bolsillos) y, si aplica, **Destino** (Bolsillos / Mío / pareja) + chips de bolsillo compartido.
6. Si 50/50: ajusta importes por persona → al guardar, modal **Mitad y mitad / ¿A quién pertenece?** (personal de cada uno vs bolsillo compartido).
7. Elige **Categoría** (y subcategoría) en sheet anidado.
8. Fecha opcional → **Guardar**.
9. Si concepto vacío: modal de sugerencias. Tras scan, posible sheet de comparación de ticket.

**Nivel de Complejidad Percibida:** **4.5 / 5** (pareja, camino completo) · **2.5 / 5** (solo, camino mínimo)

**Puntos de Fricción Identificados:**
- En pareja puede superar **8–11 micro-decisiones** y 2–3 modales en un solo “gasto”.
- La palabra **Bolsillos** aparece en **Pagado por** y en **Destino** con significados distintos (quién pagó vs a qué caja imputar).
- **Cuenta vs Bolsillo** reaparece en el momento de más urgencia (pagar en el súper).
- Editar gasto muestra controles de pago/split que **no recrean** toda la semántica del alta → falsa sensación de control.
- Escaneo añade espera + revisión; valioso, pero alarga el camino feliz.
- Inconsistencia de labels: **Mi** / **Mío**, **50/50** vs **Mitad y mitad**.

**Oportunidades de Simplificación:**
- Camino por defecto de **1 pantalla**: importe + concepto + Guardar; el resto en **Más opciones**.
- Inferir pagador = yo, destino = bolsillo por defecto / sugerido por categoría o ticket.
- Un solo selector “¿De dónde sale y a quién corresponde?” con lenguaje humano (sin dos filas Pagado por / Destino).
- Escaneo: “listo para guardar” con un solo CTA; comparar precios como acción secundaria post-guardado.
- En edición, ocultar o deshabilitar lo que no se puede cambiar, con copy explícito.

---

## 6. Historial

**Nombre del Módulo / Flujo:** Historial de movimientos (`/history`)

**¿Qué hace hoy el usuario aquí?**
1. Abre **Historial** (preview truncado en Inicio con la misma regla de visibilidad).
2. Ve resumen tipográfico y lista con divisores.
3. Puede abrir **Filtros**: tipo, periodo, bolsillo, pagado por, estado (**Pendiente** / **Liquidado**).
4. Abre detalle, edita, borra, ve tickets asociados.

**Nivel de Complejidad Percibida:** **2.5 / 5**

**Puntos de Fricción Identificados:**
- **Pendiente / Liquidado** es jerga de liquidación entre miembros, no de “pago pendiente al comercio”.
- Filtros multidimensionales para un usuario que solo quiere “¿qué gasté este mes?”.
- Confusión de nombre con “Recomendaciones anteriores” / archivo de notas (otro “historial”).

**Oportunidades de Simplificación:**
- Defaults fuertes: Este mes + Todos; filtros avanzados colapsados.
- Renombrar estado a **Por saldar / Saldado** (o similar) en contextos de pareja.
- Mantener preview de Inicio = Historial (ya correcto); no añadir otra lista.

---

## 7. Centro de cuentas

**Nombre del Módulo / Flujo:** Cuentas | Créditos | Inversiones (`/accounts`)

**¿Qué hace hoy el usuario aquí?**
1. Abre **Cuentas** → tabs **Cuentas / Créditos / Inversiones**.
2. Ve hero (**Liquidez visible** / **Total por pagar** / **Valor invertido**).
3. Crea con **Nueva cuenta / tarjeta / inversión** (alcance personal/compartida, visibilidad, nombre, deuda o valor).
4. En checking: **Ingreso** (keypad) o **Transferir**.
5. En **Transferir / Pagar**: elige tipo (cuenta o tarjeta / un bolsillo / desde bolsillo / fuera) → configura destino → importe.
6. Pago de tarjeta: desde cuenta bancaria → Transferir → chip **Pagar · [tarjeta]** (no hay CTA “Pagar” en la fila de la TC).
7. Inversión: **Valor actual**, **Mover**, **Historial**.
8. **Más opciones**: editar, visibilidad, archivar.

**Nivel de Complejidad Percibida:** **4 / 5**

**Puntos de Fricción Identificados:**
- Tres tipos de “cuenta” bajo un mismo centro; tab **Cuentas** vs nav **Cuentas** vs “Centro de cuentas”.
- Un solo sheet **Transferir / Pagar** concentra mover, aportar a bolsillo, recuperar, pagar TC y salida externa.
- Pago de TC **poco descubrible** (solo hint + flujo desde banco).
- Jerga: **Liquidez**, **Fuera**, **SALIDA EXTERNA**, **Debes**, **Ajustar deuda**.
- Coexistencia con aporte directo a bolsillo (dos caminos válidos al mismo dinero) sin guía de “cuál usar cuándo”.
- Docs de user-flow aún mencionan nudge a bolsillo en gasto desde cuenta; la UI actual no lo hace → inconsistencia producto.

**Oportunidades de Simplificación:**
- Acciones con nombres de intención: **Recibí nómina**, **Pasé a bolsillos**, **Pagué la tarjeta**, **Saqué efectivo**.
- CTA explícito **Pagar tarjeta** en tab Créditos que abra el mismo wizard preseleccionado.
- Wizard de transferencia en pasos con una pregunta por pantalla (origen ya conocido).
- Empty states que enseñen el flujo canónico: ingreso → (opcional conjunta) → bolsillos.

---

## 8. Bolsillos

**Nombre del Módulo / Flujo:** Bolsillos — Balance + Administrar (`/bolsillos`)

**¿Qué hace hoy el usuario aquí?**
1. Ve hero **Queda en total** / gastado del mes.
2. Acciones: **Comparativa**, **Transferir**, **Administrar**.
3. Lista **Por bolsillo** → sheet de detalle (saldo, aportar, transferir, ajustar, filtro mes, quién gastó, movimientos).
4. **Ajustar** pide confirmar si dejar registro en historial.
5. Tab **Administrar**: crear/editar (nombre, color, supermercado, por defecto), aportar, archivar.
6. Transferencias entre bolsillos desde Balance y desde Admin (dos UIs).

**Nivel de Complejidad Percibida:** **3.5 / 5**

**Puntos de Fricción Identificados:**
- Alta anidación de sheets (detalle → filtro → keypad → confirmación de ajuste).
- **Ajustar** + “¿Dejar registro?” es mentalidad de contable, no de pareja.
- Duplicidad Transferir/Aportar respecto a Cuentas.
- Bolsillos de sistema / “bolsillo de fijos” aparecen en otros módulos sin contexto.

**Oportunidades de Simplificación:**
- Una lista + un detail; Admin fusionado como “Editar bolsillos” dentro de la misma vista.
- Eliminar o esconder **Ajustar** detrás de Más opciones.
- Un solo componente de transferencia reutilizado desde Cuentas y Bolsillos.

---

## 9. Ahorros

**Nombre del Módulo / Flujo:** Ahorros / Mi ahorro (`/savings`)

**¿Qué hace hoy el usuario aquí?**
1. Ve **Saldo acumulado** y bloque **Este mes** vs mes anterior.
2. Toca **Aportar al ahorro**.
3. Elige origen: **Cuenta** | **Bolsillo** | **Directo** → importe → confirma.
4. Revisa movimientos recientes (aportes / posibles retiros).

**Nivel de Complejidad Percibida:** **2.5 / 5**

**Puntos de Fricción Identificados:**
- Tercer “pote” junto a cuentas y bolsillos; el vacío y el tour ayudan, pero el menú no prioriza.
- Origen **Directo** (“sin trazabilidad”) contradice el modelo de cuentas que se enseña en onboarding.
- Docs contemplan retiro; la UI de aporte no expone retirar → movimientos de retiro pueden parecer “fantasma”.
- Proximidad conceptual con tab **Inversiones** en Cuentas (ambos “riqueza”).

**Oportunidades de Simplificación:**
- Un solo CTA **Apartar** con origen por defecto = cuenta principal; otros orígenes en Más opciones.
- Quitar **Directo** o renombrarlo a “Sin cuenta (solo registro)”.
- Añadir retiro visible o no mostrar movimientos de retiro hasta que exista CTA.
- En menú, agrupar Ahorros bajo “Dinero” junto a Cuentas.

---

## 10. Gastos fijos

**Nombre del Módulo / Flujo:** Gastos fijos (`/fixed-expenses`)

**¿Qué hace hoy el usuario aquí?**
1. Navega el mes; en pareja elige tab **Familia** | **Míos**.
2. Ve resumen (pagados, este mes, falta, bolsillo asociado).
3. **Pagar** un fijo (keypad, valor real, fecha) o **Deshacer**.
4. **Agregar gasto fijo**: de quién es, frecuencia (mensual…anual), más opciones.
5. Puede **Aportar** al bolsillo de fijos; ver lista de pagados en sheet.

**Nivel de Complejidad Percibida:** **3.5 / 5**

**Puntos de Fricción Identificados:**
- Acoplamiento invisible a bolsillo de sistema (**Gastos fijos** / **Mi bolsillo**).
- Jerga: **Peso mensual**, valor base vs valor del periodo, frecuencias multi-periodo.
- Labels divergentes: menú **Gastos fijos** vs dashboard **Pagos fijos**; scopes **Míos** vs **Solo tú** / **Individual** en otros módulos.
- Muchas superficies para un ritual mensual que debería ser checklist.

**Oportunidades de Simplificación:**
- Vista checklist del mes: toggle pagado con importe prellenado; editar solo si cambia el monto.
- Defaults de frecuencia mensual; multi-periodo en Más opciones.
- Unificar naming a **Gastos fijos** en toda la app.
- Autogenerar aporte sugerido al bolsillo de fijos al entrar al mes.

---

## 11. Categorías

**Nombre del Módulo / Flujo:** Categorías (`/categories`)

**¿Qué hace hoy el usuario aquí?**
1. Ve categorías **Familia** / **Solo tú** (o solo personales).
2. Expande padres, añade subcategorías, edita icono, archiva.
3. Crea con sheet (nombre + iconos Más/Menos).

**Nivel de Complejidad Percibida:** **2.5 / 5**

**Puntos de Fricción Identificados:**
- Existe como módulo de primer nivel aunque es configuración de soporte del gasto/presupuesto.
- Subcategorías opcionales pero presupuesto solo en padre → hay que “entender la regla”.
- Otro eje ortogonal al bolsillo: al gastar el usuario elige **bolsillo + categoría**.

**Oportunidades de Simplificación:**
- Mover Categorías bajo Presupuesto o Perfil → “Etiquetas”.
- En el gasto, sugerir categoría automáticamente (ya hay heurística/OCR) y no exigir sheet si hay alta confianza.
- Plantillas por defecto buenas; crear custom solo cuando haga falta.

---

## 12. Presupuesto

**Nombre del Módulo / Flujo:** Presupuesto (`/budget`)

**¿Qué hace hoy el usuario aquí?**
1. Elige mes; tabs **Familia** | **Individual** (pareja).
2. Ve gastado / presupuesto / restante.
3. Toca categoría → keypad para límite mensual.
4. Puede copiar del mes anterior; link a administrar categorías.

**Nivel de Complejidad Percibida:** **2.5 / 5**

**Puntos de Fricción Identificados:**
- Separado de Categorías en el menú (dos visitas para un solo mental model “límites”).
- Scope **Individual** no alinea con **Solo tú** / **Míos**.
- Sin guía de “¿cuánto debería poner?” (salvo notas CFO premium).

**Oportunidades de Simplificación:**
- Unificar Categorías + Presupuesto en **Plan del mes**.
- Sugerir límites a partir del gasto histórico (1 tap “Usar promedio”).
- Homogeneizar labels de alcance en toda la app.

---

## 13. Orientación (Guidance)

**Nombre del Módulo / Flujo:** Orientación contextual (`Tu realidad hoy` + `/guidance`)

**¿Qué hace hoy el usuario aquí?**
1. Toca pastilla **Tu realidad hoy** → modal con insight (sin LLM).
2. Opcionalmente **Ver orientación completa** → `/guidance` (mapa de dinero, sugerencias, CTA).
3. También desde Perfil → Orientación.

**Nivel de Complejidad Percibida:** **2 / 5**

**Puntos de Fricción Identificados:**
- Docs aún hablan de **¿Qué significa?**; la UI dice **Tu realidad hoy**.
- Compite visualmente con notas CFO (misma familia de pastilla).
- Valor alto solo si el resto del modelo (cuentas/bolsillos) ya se entiende; si no, el “mapa” puede abrumar.

**Oportunidades de Simplificación:**
- Posicionar orientación como **única** capa de “¿cómo vamos?” en home free.
- Unificar naming producto/docs.
- CTAs del insight que ejecuten la acción (aportar, pagar fijo) en un tap.

---

## 14. Notas del CFO / Recomendaciones

**Nombre del Módulo / Flujo:** CFO Presence + Recommendations (`/recommendations`)

**¿Qué hace hoy el usuario aquí?**
1. (Premium/trial) ve pastilla **N notas**; a veces auto-abre modal 1×/día.
2. Lee nota (Sugerencia / Aviso / Resumen / Empujón / Logro).
3. Actúa: CTA, **Entendido**, **Más tarde**, **No aplica**, o **Recomendaciones anteriores**.
4. Pastilla navega a página **Notas**; archivo en **Recomendaciones anteriores**.
5. Sin entitlement: gate Premium.

**Nivel de Complejidad Percibida:** **2.5 / 5** (uso) · **3.5 / 5** (descubrir qué es vs orientación)

**Puntos de Fricción Identificados:**
- Naming mezclado: **Notas**, **recomendaciones**, **Notas para ti**, gate “Recomendaciones Premium”.
- Dos sistemas de “inteligencia” (Guidance free vs CFO paid) sin frontera clara para el usuario.
- Auto-open diario puede sentirse interruptivo si el ritual aún no está asentado.
- Empujón / kinds son útiles internamente; hacia fuera pueden sonar a marketing.

**Oportunidades de Simplificación:**
- Un brand name estable (**Notas del CFO** o **Para ti**) en pastilla, página, archivo y perfil.
- Free = explicar; Premium = actuar — comunicar esa línea en una frase.
- No auto-abrir hasta que el usuario complete 3–5 gastos o marque “quiero tips”.

---

## 15. Liquidación entre miembros (Cobrar)

**Nombre del Módulo / Flujo:** Saldar deudas internas (Dashboard pareja)

**¿Qué hace hoy el usuario aquí?**
1. En Inicio, si hay importes por recuperar, aparece **Cobrar**.
2. Abre sheet: cobrar a bolsillos o a la pareja; selecciona gastos; confirma.
3. Los movimientos pasan a estado liquidado; se refleja en historial.

**Nivel de Complejidad Percibida:** **4 / 5**

**Puntos de Fricción Identificados:**
- Vocabulario bancario (**Cobrar**) para un asiento interno.
- Solo aparece en ciertos estados; el modelo mental “quién adelantó qué” no se enseña en el alta del gasto.
- Se solapa conceptualmente con transferencias cuenta↔bolsillo.

**Oportunidades de Simplificación:**
- Renombrar y explicar en una línea en el propio botón.
- Tras un gasto “yo pagué / destino compartido”, ofrecer “¿Lo saldamos ahora o después?”.
- Agrupar en un único “Balance entre nosotros” en pareja.

---

## 16. Perfil, preferencias y Premium

**Nombre del Módulo / Flujo:** Perfil (`/profile`) + paywall

**¿Qué hace hoy el usuario aquí?**
1. Avatar, espacio compartido, invitar / unirse a otro espacio.
2. Preferencias: tema, moneda, código Premium, Orientación, Notas, Soporte, Privacidad.
3. Chip Premium en home → beneficios / planes Mensual·Anual / Paddle / código.

**Nivel de Complejidad Percibida:** **2 / 5**

**Puntos de Fricción Identificados:**
- Límites free (bolsillos, cuentas, fijos) aparecen como error de techo sin educación previa del valor.
- Pareja en pausa / trial con reglas distintas (solo vs pareja) es difícil de anticipar.
- Soporte y privacidad OK; poca fricción.

**Oportunidades de Simplificación:**
- Techos free con mensaje proactivo (“Te queda 1 bolsillo”) antes del bloqueo.
- Una página **Premium** clara: qué desbloquea (notas, límites) sin jerga de trial en el camino crítico.

---

## 17. Tarjetas (stub)

**Nombre del Módulo / Flujo:** `/cards` — “Próximamente”

**¿Qué hace hoy el usuario aquí?**
1. Si llega a la ruta, ve placeholder de vincular tarjetas.

**Nivel de Complejidad Percibida:** **1 / 5** (pero ruido de producto)

**Puntos de Fricción Identificados:**
- La TC real ya vive en **Cuentas → Créditos**; una ruta “Tarjetas” futura puede duplicar expectativa.
- No está en el menú 3×3 actual (bien), pero la ruta existe.

**Oportunidades de Simplificación:**
- No lanzar “Tarjetas” como módulo aparte; extender Créditos / vinculación bancaria dentro de Cuentas.
- Evitar segunda metáfora de “métodos de pago” si el modelo es cuenta/bolsillo.

---

## 18. Admin (interno)

**Nombre del Módulo / Flujo:** `/admin` (soporte)

**¿Qué hace hoy el usuario aquí?**
- Uso interno (tickets de soporte). Fuera del usuario final de pareja.

**Nivel de Complejidad Percibida:** N/A (no consumidor)

---

# Hallazgos transversales

1. **Modelo de tres capas (cuenta / bolsillo / ahorro)** es sólido para producto avanzado y costoso para el primer día.
2. **Verbos repetidos** — Transferir, Aportar, Cobrar, Pagar — en módulos distintos con semánticas distintas.
3. **Scopes con 3 nombres** — Familia / Míos · Solo tú · Individual — para la misma idea.
4. **Menú plano de 9 ítems** sin jerarquía de tareas (“registrar”, “mover dinero”, “planificar”).
5. **Pareja multiplica la complejidad** del gasto y del dashboard más que cualquier otro eje.
6. **IA/orientación** está bien contenida (modal + rutas, sin ensuciar el scroll), pero **dos pastillas** diluyen el mensaje.
7. La app **no** pide extractos ni conciliación bancaria: el riesgo no es “fintech de banco”, es **sobre-modelar el hogar**.

---

# Top 3 flujos a rediseñar primero

### 1. Nuevo gasto en pareja (prioridad máxima)

Es el verbo diario del producto y hoy puede exigir más de 10 decisiones (pagar desde, pagado por, destino, 50/50, pertenencia, categoría, scan…).  
**Objetivo de rediseño:** “importe → listo”, con defaults inteligentes; split y cuenta solo en Más opciones.  
**Impacto:** baja la complejidad percibida del producto entero; si el gasto duele, nada más importa.

### 2. Modelo dinero: Cuentas ↔ Bolsillos ↔ Ahorros (y Transferir / Pagar)

Tres módulos + el mismo verbo “mover dinero” obligan a formación (onboarding + tours). El pago de tarjeta y el aporte a bolsillo están escondidos en un wizard genérico.  
**Objetivo de rediseño:** un **hub “Mover dinero”** por intención (nómina, a bolsillos, pagar tarjeta, apartar ahorro) y menú agrupado; diferir la pedagogía de capas hasta que el usuario tenga el primer ingreso.  
**Impacto:** reduce la confusión estructural que los tours no pueden parchear.

### 3. Liquidación de pareja (**Cobrar**) + estados Pendiente/Liquidado

Es el momento emocionalmente sensible (“me debes”) y el naming es el más bancario/engañoso. Además nace de decisiones tomadas en el formulario de gasto.  
**Objetivo de rediseño:** renombrar, explicar en contexto, y acoplar al alta del gasto (“¿lo saldamos?”); un solo “Balance entre nosotros”.  
**Impacto:** convierte la deuda interna de fricción/pánico en ritual claro — alineado con el mantra de no usar rojo de alarma y con claridad antes que control.

---

## Recomendación de pausa (cómo usar esta auditoría)

Durante la pausa de desarrollo, priorizar **investigación cualitativa** sobre estos tres flujos (5–8 parejas / usuarios solo) antes de más features:

- ¿Pueden registrar un gasto compartido sin ayuda en &lt; 30 s?
- ¿Saben decir en una frase la diferencia cuenta / bolsillo / ahorro después de 1 semana?
- ¿Entienden **Cobrar** sin el tour?

Cualquier feature nueva (extractos, conciliación bancaria, chat IA, más tipos de cuenta) **aumentará** la complejidad percibida si estos tres no se simplifican primero.

---

*Documento generado a partir del código y docs actuales de SinDescuadre. No sustituye tests con usuarios; los prioriza.*
