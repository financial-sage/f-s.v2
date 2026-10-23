-- Wipe local app data; keep only is_superadmin profiles (+ their auth.users).
-- Safe for local Supabase. Do NOT run against production.
--
-- Usage (from repo root, PowerShell):
--   npm run db:wipe-local
-- or:
--   Get-Content -Raw .\scripts\wipe-local-keep-superadmins.sql |
--     docker exec -i supabase_db_financial-sage-pwa psql -U postgres -d postgres

BEGIN;

CREATE TEMP TABLE keep_users AS
SELECT id FROM public.profiles WHERE is_superadmin IS TRUE;

SELECT 'superadmins_to_keep' AS step, count(*)::int AS n FROM keep_users;

SELECT u.email
FROM auth.users u
JOIN keep_users k ON k.id = u.id
ORDER BY u.email;

-- Detach everyone from families before deleting families
UPDATE public.profiles SET family_id = NULL;

-- Family-scoped + related app data (order respects FKs)
DELETE FROM public.fixed_expense_payments;
DELETE FROM public.fixed_expense_budgets;
DELETE FROM public.fixed_expenses;
DELETE FROM public.family_recommendations;
DELETE FROM public.expenses;
DELETE FROM public.family_accounts;
DELETE FROM public.family_funds;
DELETE FROM public.billing_transactions;
DELETE FROM public.billing_subscriptions;
DELETE FROM public.support_tickets;
DELETE FROM public.families;

-- Non-admin profiles
DELETE FROM public.profiles
WHERE id NOT IN (SELECT id FROM keep_users);

-- Reset kept admin profiles to a clean first-run state (keep flags)
UPDATE public.profiles
SET
  family_id = NULL,
  pending_first_move_celebration = NULL,
  pending_premium_welcome = NULL,
  paddle_customer_id = NULL,
  -- Keep is_premium / is_vip / is_superadmin as-is for founders
  updated_at = timezone('utc'::text, now())
WHERE id IN (SELECT id FROM keep_users);

-- Auth sessions / tokens for deleted users
DELETE FROM auth.refresh_tokens
WHERE user_id::text::uuid NOT IN (SELECT id FROM keep_users);

DELETE FROM auth.sessions
WHERE user_id NOT IN (SELECT id FROM keep_users);

DELETE FROM auth.identities
WHERE user_id NOT IN (SELECT id FROM keep_users);

DELETE FROM auth.users
WHERE id NOT IN (SELECT id FROM keep_users);

-- Summary
SELECT 'profiles_left' AS step, count(*)::int AS n FROM public.profiles;
SELECT 'auth_users_left' AS step, count(*)::int AS n FROM auth.users;
SELECT 'families_left' AS step, count(*)::int AS n FROM public.families;
SELECT 'expenses_left' AS step, count(*)::int AS n FROM public.expenses;

COMMIT;
