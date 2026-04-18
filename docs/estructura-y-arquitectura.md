# Estructura del proyecto y arquitectura

## Estructura del proyecto con nombres de ficheros

```text
financial-sage-pwa/
├── AGENTS.md
├── CLAUDE.md
├── eslint.config.mjs
├── lh-pwa.json
├── lighthouse-pwa.json
├── middleware.ts
├── next-env.d.ts
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── README.md
├── tsconfig.json
│
├── database/
│   └── sb-fs.sql
│
├── docs/
│   ├── contexto-app-y-pwa.md
│   ├── logica-editar-eliminar.md
│   └── QA/
│       └── Pruebas-editar-eliminar.md
│
├── examples-stitch/
│   ├── agregarfondo.html
│   ├── dashboard-individual.html
│   ├── dashboard-parejas.html
│   ├── dashboard.html
│   ├── gasto.html
│   ├── login.html
│   ├── profile.html
│   ├── registro.html
│   ├── teclado1.html
│   └── teclado2.html
│
├── public/
│   ├── manifest.json
│   ├── sw.js
│   ├── avatars/
│   └── icons/
│
├── scripts/
│   └── tunnel.js
│
└── src/
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── actions/
    │   │   ├── debt.ts
    │   │   ├── editExpense.ts
    │   │   ├── expenses.ts
    │   │   ├── family.ts
    │   │   ├── settleFundDebt.ts
    │   │   └── settleP2P.ts
    │   ├── add-expense/
    │   │   └── page.tsx
    │   ├── api/
    │   │   └── expenses/
    │   │       └── route.ts
    │   ├── cards/
    │   │   └── page.tsx
    │   ├── history/
    │   │   └── page.tsx
    │   ├── login/
    │   │   └── page.tsx
    │   ├── onboarding/
    │   │   └── page.tsx
    │   ├── profile/
    │   │   └── page.tsx
    │   └── register/
    │       └── page.tsx
    │
    ├── components/
    │   ├── AddExpenseForm.tsx
    │   ├── BottomNav.tsx
    │   ├── BudgetProgress.tsx
    │   ├── CustomNumpad.tsx
    │   ├── DashboardCouple.tsx
    │   ├── DashboardSolo.tsx
    │   ├── DebtCard.tsx
    │   ├── ExpenseModalProvider.tsx
    │   ├── FAB.tsx
    │   ├── Header.tsx
    │   ├── InstallPrompt.tsx
    │   ├── InvitePartner.tsx
    │   ├── LiquidateButton.tsx
    │   ├── PWARegister.tsx
    │   ├── RecentActivity.tsx
    │   └── SignOutButton.tsx
    │
    ├── lib/
    │   ├── dashboard.ts
    │   ├── expenses.ts
    │   └── supabase/
    │       └── server.ts
    │
    └── utils/
        └── supabase/
            ├── client.ts
            └── server.ts
```

---

## Resumen breve de la arquitectura

Este proyecto es una **PWA de finanzas personales/compartidas** construida con **Next.js 16**, **React**, **TypeScript** y **Tailwind CSS**.

### Capas principales

1. **Presentación**
   - Las pantallas y rutas están dentro de `src/app/`.
   - Los componentes reutilizables están en `src/components/`.

2. **Lógica de negocio**
   - Las acciones del servidor viven en `src/app/actions/`.
   - La lógica de soporte y agregación de datos está en `src/lib/`.

3. **Datos y autenticación**
   - Se usa **Supabase** para autenticación y persistencia.
   - Los conectores cliente/servidor están en `src/utils/supabase/` y `src/lib/supabase/`.

4. **Capa PWA**
   - La app puede instalarse como aplicación móvil.
   - La configuración PWA se apoya en `public/manifest.json` y `public/sw.js`.

### Flujo general

- El usuario navega por rutas del App Router.
- Los componentes muestran dashboards, gastos, deudas e historial.
- Las acciones del servidor procesan operaciones como crear gastos, editar movimientos y liquidar deudas.
- Supabase almacena la información y gestiona la sesión del usuario.

### Objetivo funcional

La aplicación está orientada a:
- registrar gastos,
- visualizar actividad reciente,
- controlar presupuesto,
- gestionar finanzas individuales o en pareja,
- y funcionar como una app instalable en móvil.
