---
name: accounts-module
description: >-
  Implements the Accounts (cuentas) feature for SinDescuadre couples mode:
  bank-like accounts, income, transfers to shared accounts and funds, external
  outflows, and account-paid expenses. Use when the user asks to implement
  accounts, centro de cuentas, transferencias a bolsillos, ADR-0006, or
  family_accounts / account balances.
---

# Accounts module — agent harness

## When this skill applies

User wants to **build or change** the Accounts feature (not just chat about money in general).

## Mandatory first reads

Read in order (do not invent product or schema rules):

1. `docs/product/features/accounts/README.md`
2. `docs/product/features/accounts/business-rules.md`
3. `docs/product/features/accounts/technical-spec.md` ← schema, ledger, RLS, file paths, slices
4. `docs/product/features/accounts/user-flow.md`
5. `docs/decisions/ADR-0006-accounts-vs-funds.md`
6. `docs/decisions/ADR-0010-liabilities-frequency-investments.md` (kinds `checking` | `credit` | `investment`, liquidez solo checking)

Also skim Funds mirrors: `src/lib/funds.ts`, `src/app/actions/funds.ts`, `database/migrations/001_family_funds.sql`.

For Next.js APIs in this repo, follow `AGENTS.md` / `node_modules/next/dist/docs/`.

## Implementation order

Follow **Slices A→D** exactly as in `technical-spec.md` (Fundaciones → Centro → Gasto desde cuenta → Pulido). Do not invent alternate table/column names.

Locked names:

- Table `family_accounts`; migration `003_family_accounts.sql`
- `expenses.account_id`, `expenses.paid_from_account`
- Code: `src/lib/accounts.ts`, `src/app/actions/accounts.ts`, `src/store/useAccountsStore.ts`, `src/components/AccountsPanel.tsx`, `src/app/(pwa)/accounts/page.tsx`

Detail checklist: [implementation-checklist.md](implementation-checklist.md)

## Decision shortcuts (do not re-ask)

| Topic | Answer |
|-------|--------|
| Account vs fund | Separate entities (ADR-0006) |
| Direct aporte to fund | Still allowed |
| Income destination | Account only |
| Negative balance | Allowed + warning |
| Shared account ops | Both members full ops |
| Personal account ops | Owner only; visibility configurable (couple only) |
| Audience | Couples + individual (family de 1: solo personales; `household.ts`) |

If product conflicts with code, **docs win** until the user changes the specs.

## Done criteria for a slice

- Matches numbered rules in `business-rules.md`
- Does not collapse Account into Fund
- Couples visibility/permissions respected
- Funds direct aporte still works
- User-facing copy follows `docs/product/foundations/05-product-language.md` (clear, non-bank jargon)
