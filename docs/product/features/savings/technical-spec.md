# Savings — Technical Spec

Complementa: [README](./README.md), [business-rules.md](./business-rules.md), [ADR-0007](../../../decisions/ADR-0007-savings-vs-funds-accounts.md).

---

# Decisiones técnicas (cerradas)

| Tema | Decisión |
|------|----------|
| Persistencia | Reutilizar `family_funds` con `purpose = 'savings'` (mismo patrón que `fixed_expenses`) |
| Tabla propia | No en MVP |
| Ledger | `public.expenses` (transferencias cuenta↔fondo y fondo↔fondo existentes) |
| Ruta UI | `/savings` + `SavingsPanel` |
| Nav | Módulo en BottomNav |
| Migración | `database/migrations/004_family_funds_savings.sql` (también `supabase/migrations/20261019160000_savings_purpose.sql`) — amplía el CHECK de `purpose` para incluir `savings` |
| Color sistema | `#0F766E` |
| Nombre sistema | `Ahorro` |
| `sort_order` | `8` |

---

# Entidad sistema

Al asegurar fondos de familia, crear si falta:

```ts
{
  name: "Ahorro",
  scope: "shared",
  is_default: false,
  is_system: true,
  sort_order: 8,
  color: "#0F766E",
  purpose: "savings",
}
```

Helpers en `src/lib/funds.ts` / `src/lib/savings.ts`:

- `isSavingsFund(fund)`
- `getSavingsFund(funds)`
- `listDashboardSharedFunds` / selectores de gasto **excluyen** savings
- `computeSavingsMonthMetrics(expenses, savingsFundId, monthKey)` → `{ thisMonth, prevMonth, delta }`

---

# Movimientos

| Acción | Implementación |
|--------|----------------|
| Aporte desde cuenta | `transferAccountToFundAction({ toFundId: savingsId, ... })` |
| Aporte desde bolsillo | `transferBetweenFundsAction({ toFundId: savingsId, ... })` |
| Retiro a cuenta | `transferFundToAccountAction({ fromFundId: savingsId, ... })` |
| Retiro a bolsillo | `transferBetweenFundsAction({ fromFundId: savingsId, ... })` |

Facade `src/app/actions/savings.ts`:

- `getSavingsOverviewAction()` — saldo, métricas MoM, movimientos recientes
- `contributeToSavingsAction({ amount, source: { type: 'account'\|'fund', id }, date? })`
- `withdrawFromSavingsAction({ amount, destination: {...}, date? })`

Entradas del mes = filas `expenses` con `fund_id = savingsId`, `category = 'deposit'`, `is_active`, `expense_date` en el mes.

---

# UI slice 1

| Pieza | Ruta / archivo |
|-------|----------------|
| Página | `src/app/(pwa)/savings/page.tsx` |
| Panel | `src/components/SavingsPanel.tsx` |
| Nav | `BottomNav` módulo `savings` |
| Lib | `src/lib/savings.ts` |

Pantalla: hero saldo · bloque este mes + delta · CTA Aportar · lista reciente.

---

# Invariantes de código

1. No listar el bote en pickers de gasto / menú de bolsillos del dashboard.
2. No promover savings como `is_default` de gastos compartidos.
3. No permitir `purpose: savings` en `createFundAction` de usuario.
4. Revalidar `/` y `/savings` tras aportes/retiros.
