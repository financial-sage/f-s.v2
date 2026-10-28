# Funds — Technical Spec (Balance de bolsillos)

Complementa: [README](./README.md), [business-rules.md](./business-rules.md).

---

# Balance V1

| Tema | Decisión |
|------|----------|
| Ruta UI | `/bolsillos` + `BolsillosPanel` |
| Nav | Módulo **Bolsillos** en BottomNav |
| Datos | Agregados deterministas sobre `expenses` + saldos de `family_funds` |
| LLM | No |
| Periodo | Mes calendario actual vs mes anterior |
| Pareja | Desglose por `paid_by` |

---

# Action

`getBolsillosBalanceAction()` en `src/app/actions/funds.ts`:

- Funds visibles (compartidos + personales del usuario), excluyendo Ahorro y Gastos fijos del informe de gasto.
- Saldos vía `calculateFundCashBalance`.
- Gastos del mes actual y anterior con `fund_id`, `paid_by`, `expense_date`.
- Miembros `{ id, name }` para etiquetas de pareja.
- Movimientos recientes por fondo (últimos N gastos reales).

Helpers en `src/lib/funds-balance.ts`.

---

# DTO

```ts
type FundPayerSpend = { profileId: string; name: string; amount: number };

type FundMonthStats = {
  fundId: string;
  fundName: string;
  spentThisMonth: number;
  spentLastMonth: number;
  delta: number;
  deltaPct: number | null;
  byPayer?: FundPayerSpend[];
};

type BolsillosBalanceOverview = {
  monthKey: string;
  monthLabel: string;
  totalSpentThisMonth: number;
  totalSpentLastMonth: number;
  totalDelta: number;
  totalDeltaPct: number | null;
  prevMonthEmpty: boolean;
  isCouple: boolean;
  funds: Array<{
    fund: FamilyFund;
    balance: number;
    displayName: string;
    stats: FundMonthStats;
    recent: Array<{
      id: string;
      amount: number;
      concept: string | null;
      expense_date: string | null;
      paid_by: string;
      payerName: string;
    }>;
  }>;
  topUp: FundMonthStats[];
  topDown: FundMonthStats[];
  personalFundId: string | null;
  sharedDefaultFundId: string | null;
};
```

---

# UI

| Pieza | Archivo |
|-------|---------|
| Página | `src/app/(pwa)/bolsillos/page.tsx` |
| Panel | `src/components/BolsillosPanel.tsx` |
| Admin | Reutiliza flujos de `FundsPanel` (crear / aportar / transferir / archivar) dentro del tab Administrar |
| Lib | `src/lib/funds-balance.ts` |

Secciones: **Balance** (informe + lista + detalle) | **Administrar**.
