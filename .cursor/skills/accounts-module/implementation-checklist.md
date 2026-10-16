# Accounts — implementation checklist

Source of truth for names/encoding: `docs/product/features/accounts/technical-spec.md`.  
Product rules: `docs/product/features/accounts/business-rules.md`.

## Slice A — Fundaciones

- [x] `database/migrations/003_family_accounts.sql`
  - [x] `family_accounts` with scope/owner/visibility checks
  - [x] unique active name indexes
  - [x] `expenses.account_id`, `expenses.paid_from_account` + index
  - [x] RLS select/insert/update per technical-spec
- [x] `src/lib/accounts.ts` — types + `calculateAccountCashBalance`
- [x] `src/app/actions/accounts.ts` — list/create/visibility/archive/income/transfers/outflow
- [x] Account-origin movements: negative balance → warning, not throw
- [x] Fund-origin leg (fund→account): keep Funds insufficient-balance error

## Slice B — Centro de cuentas

- [x] `useAccountsStore.ts`
- [x] `AccountsPanel.tsx` + `src/app/(pwa)/accounts/page.tsx`
- [x] Create personal (default visibility `private`) / shared
- [x] Change visibility; partner cannot see private balances
- [x] Income, account↔account, account↔fund, fund→account, external outflow
- [x] UI warning when balance goes/stays negative

## Slice C — Gasto desde cuenta

- [x] `AddExpenseForm`: payment source fund (default) | account
- [x] Nudge when account selected
- [x] Persist `account_id` + `paid_from_account`; does not touch fund cash
- [x] History/dashboard hide private foreign-account movement details

## Slice D — Pulido

- [x] Dashboard entry to `/accounts` (visible liquidity only)
- [x] Product language copy
- [ ] Manual QA vs business-rules matrix

## Regression

- [ ] Fund create / aporte / fund↔fund / settle debt unchanged
- [ ] Direct aporte to fund still works without accounts
- [x] Selects that add new expense columns treat them as optional
