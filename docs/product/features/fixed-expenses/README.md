# Gastos fijos

## Propósito

Plantillas recurrentes (luz, alquiler, gimnasio…) con checklist mensual, frecuencia multi-periodo (ADR-0010) y registro de pago real.

## Alcance: familia vs personal

| Scope | Quién lo ve | De dónde se paga | Aportar |
|-------|-------------|------------------|---------|
| `shared` (Familia) | Ambos miembros | Bolsillo sistema **Gastos fijos** | Sí |
| `personal` (Míos) | Solo el dueño | **Mi bolsillo** | No (usa el bolsillo personal) |

- Columnas: `fixed_expenses.scope` (`shared` \| `personal`) + `owner_profile_id` (obligatorio si personal).
- En hogar individual no hay tabs: todo se trata como lista única (`shared` por defecto).
- En pareja: tabs **Familia | Míos**.

## Código

- Acciones: `src/app/actions/fixedExpenses.ts`
- UI: `src/components/FixedExpensesManager.tsx`
- Migración: `supabase/migrations/20261030140000_fixed_expenses_personal_scope.sql`
