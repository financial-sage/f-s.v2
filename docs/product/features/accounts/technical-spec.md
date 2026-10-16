# Accounts — Technical Spec

## Propósito

Cierra las decisiones de implementación que la feature de producto dejó implícitas. Es la guía operativa para código, migraciones y RLS.

Complementa (no sustituye):

- [README](./README.md)
- [business-rules.md](./business-rules.md)
- [user-flow.md](./user-flow.md)
- [ADR-0006](../../../decisions/ADR-0006-accounts-vs-funds.md)

---

# Decisiones técnicas (cerradas)

| Tema | Decisión |
|------|----------|
| Tabla | `public.family_accounts` |
| Ledger | Seguir usando `public.expenses` (mismo patrón que Funds) |
| Columnas nuevas en `expenses` | `account_id`, `paid_from_account` |
| Cuentas de sistema | **Ninguna** en MVP |
| Color | Opcional (`color text`), mismo enfoque que funds |
| Ruta UI | `/accounts` + componente `AccountsPanel` |
| Saldo insuficiente en **cuenta** | Aviso; **no** bloquea |
| Saldo insuficiente en **fondo** (origen) | Se mantiene el comportamiento actual de Funds (**bloquea**) |
| Visibilidad default (personal) | `private` |
| Migración | `database/migrations/003_family_accounts.sql` |

---

# Schema: `family_accounts`

```sql
CREATE TABLE public.family_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('personal', 'shared')),
  owner_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'family_visible')),
  color text,
  sort_order integer NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT family_accounts_personal_owner_chk CHECK (
    (scope = 'personal' AND owner_profile_id IS NOT NULL)
    OR (scope = 'shared' AND owner_profile_id IS NULL)
  ),
  CONSTRAINT family_accounts_shared_visibility_chk CHECK (
    scope = 'personal' OR visibility = 'family_visible'
  )
);
```

Índices:

- `family_accounts_family_id_idx` on `(family_id)`
- `family_accounts_owner_idx` on `(owner_profile_id)`
- Unique activas (como funds):
  - shared: `(family_id, lower(name)) WHERE scope = 'shared' AND archived_at IS NULL`
  - personal: `(family_id, owner_profile_id, lower(name)) WHERE scope = 'personal' AND archived_at IS NULL`

Notas:

- Cuentas `shared` fuerzan `visibility = 'family_visible'`.
- No hay `is_system` / `is_default` en MVP.

---

# Extensión del ledger (`expenses`)

```sql
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.family_accounts(id),
  ADD COLUMN IF NOT EXISTS paid_from_account boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS expenses_account_id_idx ON public.expenses(account_id);
```

## Semántica

| Campo | Rol |
|-------|-----|
| `fund_id` | Bolsillo afectado por la fila (si aplica) |
| `account_id` | Cuenta afectada por la fila (si aplica) |
| `paid_from_fund` | El gasto/salida reduce la caja del bolsillo |
| `paid_from_account` | El gasto/salida reduce la caja de la cuenta |
| `transfer_group_id` | Empareja las dos patas de una transferencia interna |
| `category` | `deposit` / `withdrawal` / gasto normal / etc. (sin cambiar el enum actual) |

## Invariantes de fila

1. Una fila de movimiento de caja afecta **como máximo un** bolsillo **o** una cuenta de liquidez:
   - ingreso/transferencia/salida de cuenta → `account_id` set, `fund_id` null;
   - aporte/transferencia/gasto de bolsillo → `fund_id` set, `account_id` null (salvo que en el futuro se documente otro caso).
2. Gasto ordinario pagado desde cuenta: `account_id` set, `paid_from_account = true`, `fund_id` null, `paid_from_fund` false/null, sin `transfer_group_id`.
3. Gasto ordinario pagado desde bolsillo: reglas Funds vigentes; `account_id` null, `paid_from_account` false/null.
4. Aporte directo a bolsillo: sin cambios (`deposit` + `fund_id`, sin `account_id`, sin `transfer_group_id`).
5. Ingreso a cuenta: `category = 'deposit'`, `account_id` set, sin `fund_id`, sin `transfer_group_id`.
6. Salida externa: `category = 'withdrawal'`, `account_id` set, `paid_from_account = true`, sin `transfer_group_id`, sin contrapartida.

No se introduce categoría nueva en MVP (`external_outflow` queda descartada).

---

# Encoding de transferencias

Todas las transferencias internas = **par** `withdrawal` + `deposit` con el mismo `transfer_group_id` (igual que `transferBetweenFundsAction`).

| Caso | Pata salida | Pata entrada |
|------|-------------|--------------|
| Cuenta → cuenta | `withdrawal`, `account_id=from`, `paid_from_account=true` | `deposit`, `account_id=to` |
| Cuenta → bolsillo | `withdrawal`, `account_id=from`, `paid_from_account=true` | `deposit`, `fund_id=to` |
| Bolsillo → cuenta | `withdrawal`, `fund_id=from`, `paid_from_fund=true` | `deposit`, `account_id=to` |
| Bolsillo → bolsillo | (sin cambios) Funds | Funds |

`split_type`: `personal` en movimientos de caja de cuenta (mismo patrón que transferencias de fondos).  
`paid_by`: perfil que registra.  
`responsible_for`: para patas de bolsillo, mantener convención Funds (`joint_fund` o `owner_profile_id`); para patas solo-cuenta usar el `owner_profile_id` de la cuenta personal o `joint_fund` si la cuenta es compartida.

---

# Cálculo de saldo de cuenta

```
saldo =
  sum(deposit sin transfer_group_id, account_id = A)
+ sum(deposit con transfer_group_id, account_id = A)
− sum(gastos con paid_from_account = true, sin transfer_group_id, account_id = A)
− sum(withdrawal sin transfer_group_id, account_id = A)
− sum(withdrawal con transfer_group_id, account_id = A)
```

Implementar en `src/lib/accounts.ts` como `calculateAccountCashBalance`, espejo de `calculateFundCashBalance`.

Reglas de validación en actions:

- **Origen cuenta**: si `saldo - monto < 0` → devolver warning (`balanceWarning: true`); **permitir** el movimiento.
- **Origen bolsillo** (p. ej. bolsillo → cuenta): reutilizar validación actual de Funds (error si insuficiente).

---

# RLS

`ENABLE ROW LEVEL SECURITY` en `family_accounts`.

## SELECT

Miembro de la familia **y**:

- `scope = 'shared'`, o
- `owner_profile_id = auth.uid()`, o
- `visibility = 'family_visible'`

## INSERT

Miembro de la familia **y**:

- si `personal` → `owner_profile_id = auth.uid()`
- si `shared` → `owner_profile_id IS NULL` y `visibility = 'family_visible'`

## UPDATE / soft-archive

- personal → solo `owner_profile_id = auth.uid()`
- shared → cualquier miembro de la familia

Las filas de `expenses` con `account_id` de cuenta `private` ajena **no deben filtrarse solo por RLS de expenses** (hoy expenses es visible a la familia). Mitigación MVP:

1. Actions/listados de cuentas filtran por visibilidad.
2. En historial/dashboard, **no mostrar** concepto/monto de movimientos cuya `account_id` apunte a cuenta `private` de otro miembro (ocultar o agrupar como “Movimiento privado”); el saldo de esa cuenta no se expone al partner.

Hardening futuro (fuera de MVP): políticas/views que enmascaren esas filas.

---

# Capas de código (rutas fijas)

| Capa | Path |
|------|------|
| Migración | `database/migrations/003_family_accounts.sql` |
| Tipos + balance | `src/lib/accounts.ts` |
| Actions | `src/app/actions/accounts.ts` |
| Store | `src/store/useAccountsStore.ts` |
| UI panel | `src/components/AccountsPanel.tsx` |
| Página centro | `src/app/(pwa)/accounts/page.tsx` |
| Pago desde cuenta | extender `src/components/AddExpenseForm.tsx` + `src/app/actions/expenses.ts` |

Actions mínimas en `accounts.ts`:

- `listFamilyAccountsAction`
- `createAccountAction`
- `updateAccountVisibilityAction`
- `archiveAccountAction`
- `registerAccountIncomeAction`
- `transferBetweenAccountsAction`
- `transferAccountToFundAction`
- `transferFundToAccountAction`
- `registerExternalOutflowAction`

Reutilizar `transferBetweenFundsAction` sin cambios para bolsillo↔bolsillo.

---

# Primer slice de entrega (orden fijo)

### Slice A — Fundaciones (sin UI rica)

1. Migración `003_family_accounts.sql` (tabla + columnas expenses + RLS + índices).
2. `src/lib/accounts.ts` (tipos, visibilidad, `calculateAccountCashBalance`).
3. Actions CRUD + ingreso + transferencias de la matriz + outflow externo.
4. Tests unitarios del cálculo de saldo (si el repo ya tiene patrón de tests para funds; si no, helpers puros testeables).

### Slice B — Centro de cuentas

1. `useAccountsStore` + `AccountsPanel` + página `/accounts`.
2. Crear personal/compartida, cambiar visibilidad, ver saldos, aviso de negativo.
3. Flujos: ingreso, cuenta→cuenta, cuenta→bolsillo, bolsillo→cuenta, salida externa.

### Slice C — Gastos desde cuenta

1. En `AddExpenseForm`: origen de pago `bolsillo` \| `cuenta` (default bolsillo).
2. Nudge si elige cuenta.
3. Persistencia con `account_id` + `paid_from_account`.
4. Historial/dashboard: no filtrar saldos privados al partner.

### Slice D — Pulido

1. Entrada desde Dashboard (resumen de liquidez visible).
2. Copy según product language.
3. QA manual contra checklist del harness.

---

# Compatibilidad con Funds

- Aportes directos y transferencias fondo↔fondo **no se modifican**.
- `calculateFundCashBalance` debe ignorar filas que solo tienen `account_id` (ya lo hace si filtra por `fund_id`).
- Al añadir `account_id` / `paid_from_account` a selects existentes, tipar como opcionales para no romper stores.

---

# Fuera de MVP (explícito)

- Cuentas de sistema / onboarding que cree cuentas por defecto.
- Plantillas de repartición de nómina.
- Enmascarado RLS estricto de `expenses` privados.
- Modo individual completo.
- Open banking / sincronización real con bancos.
- `states.md` / `edge-cases.md` de producto (solo si hacen falta tras Slice B).
