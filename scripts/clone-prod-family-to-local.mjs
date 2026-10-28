/**
 * Clone one production household into local Supabase (same UUIDs).
 *
 * Usage:
 *   node scripts/clone-prod-family-to-local.mjs tcampof@gmail.com sandralu317@gmail.com
 *
 * Reads prod from .env.cloud.local and writes to .env.local.
 * Creates auth users with a known local password (default: LocalDev123!).
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const LOCAL_PASSWORD = process.env.LOCAL_CLONE_PASSWORD || "LocalDev123!";
const emails = process.argv
  .slice(2)
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

if (emails.length === 0) {
  console.error(
    "Usage: node scripts/clone-prod-family-to-local.mjs <email1> [email2…]"
  );
  process.exit(1);
}

function loadEnv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function adminClient(env) {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function findAuthUserByEmail(admin, email) {
  for (let page = 1; page <= 40; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const hit = (data.users || []).find(
      (u) => (u.email || "").toLowerCase() === email
    );
    if (hit) return hit;
    if (!data.users?.length) break;
  }
  return null;
}

async function fetchAllByFamily(admin, table, familyId, orderCol = "created_at") {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    let q = admin.from(table).select("*").eq("family_id", familyId);
    if (orderCol) q = q.order(orderCol, { ascending: true });
    const { data, error } = await q.range(from, from + pageSize - 1);
    if (error) {
      // Table may not exist in older prod — skip soft.
      if (/does not exist|relation|Could not find/i.test(error.message)) {
        console.warn(`  skip ${table}: ${error.message}`);
        return [];
      }
      throw new Error(`${table}: ${error.message}`);
    }
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function upsert(admin, table, rows, onConflict = "id") {
  if (!rows.length) return 0;
  const chunk = 200;
  let n = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { error } = await admin.from(table).upsert(slice, { onConflict });
    if (error) throw new Error(`upsert ${table}: ${error.message}`);
    n += slice.length;
  }
  return n;
}

async function ensureLocalAuthUser(local, prodUser) {
  const email = (prodUser.email || "").toLowerCase();
  const existing = await findAuthUserByEmail(local, email);
  if (existing) {
    if (existing.id !== prodUser.id) {
      throw new Error(
        `Local user ${email} exists with id ${existing.id}, prod is ${prodUser.id}. Wipe or delete local user first.`
      );
    }
    const { error } = await local.auth.admin.updateUserById(existing.id, {
      password: LOCAL_PASSWORD,
      email_confirm: true,
      user_metadata: prodUser.user_metadata || {},
    });
    if (error) throw new Error(`update auth ${email}: ${error.message}`);
    console.log(`  auth ok (existing): ${email}`);
    return existing.id;
  }

  const { data, error } = await local.auth.admin.createUser({
    id: prodUser.id,
    email,
    password: LOCAL_PASSWORD,
    email_confirm: true,
    user_metadata: prodUser.user_metadata || {},
  });
  if (error) throw new Error(`create auth ${email}: ${error.message}`);
  console.log(`  auth created: ${email}`);
  return data.user.id;
}

const repoRoot = process.cwd();
const prodEnv = loadEnv(path.join(repoRoot, ".env.cloud.local"));
const localEnv = loadEnv(path.join(repoRoot, ".env.local"));

const prod = adminClient(prodEnv);
const local = adminClient(localEnv);

console.log("Source:", prodEnv.NEXT_PUBLIC_SUPABASE_URL);
console.log("Target:", localEnv.NEXT_PUBLIC_SUPABASE_URL);
console.log("Emails:", emails.join(", "));

const prodUsers = [];
for (const email of emails) {
  const u = await findAuthUserByEmail(prod, email);
  if (!u) {
    console.error(`Prod user not found: ${email}`);
    process.exit(1);
  }
  prodUsers.push(u);
  console.log(`Found prod user ${email} → ${u.id}`);
}

const { data: profiles, error: pe } = await prod
  .from("profiles")
  .select("*")
  .in(
    "id",
    prodUsers.map((u) => u.id)
  );
if (pe) throw pe;

const familyIds = [
  ...new Set((profiles || []).map((p) => p.family_id).filter(Boolean)),
];
if (familyIds.length !== 1) {
  console.error("Expected exactly one shared family_id, got:", familyIds);
  process.exit(1);
}
const familyId = familyIds[0];
console.log("Family:", familyId);

const { data: family, error: fe } = await prod
  .from("families")
  .select("*")
  .eq("id", familyId)
  .maybeSingle();
if (fe) throw fe;
if (!family) {
  console.error("Family row missing");
  process.exit(1);
}

// Ensure both family members are included even if only one email was passed
const memberIds = [family.user_1_id, family.user_2_id].filter(Boolean);
for (const mid of memberIds) {
  if (prodUsers.some((u) => u.id === mid)) continue;
  const { data, error } = await prod.auth.admin.getUserById(mid);
  if (error || !data?.user) {
    console.warn(`Could not load family member ${mid}: ${error?.message}`);
    continue;
  }
  prodUsers.push(data.user);
  console.log(`Also cloning partner ${data.user.email} → ${mid}`);
}

const { data: allProfiles, error: ape } = await prod
  .from("profiles")
  .select("*")
  .eq("family_id", familyId);
if (ape) throw ape;

console.log("\nFetching family data…");
const tables = [
  ["family_funds", "created_at"],
  ["family_accounts", "created_at"],
  ["family_categories", "created_at"],
  ["expenses", "created_at"],
  ["fixed_expenses", "created_at"],
  ["fixed_expense_payments", "created_at"],
  ["fixed_expense_budgets", null],
  ["family_recommendations", "created_at"],
];

const bundles = {};
for (const [table, order] of tables) {
  const rows = await fetchAllByFamily(prod, table, familyId, order);
  bundles[table] = rows;
  console.log(`  ${table}: ${rows.length}`);
}

console.log("\nEnsuring local auth users…");
for (const u of prodUsers) {
  await ensureLocalAuthUser(local, u);
}

console.log("\nUpserting into local…");
{
  const { error } = await local.from("families").upsert(family, {
    onConflict: "id",
  });
  if (error) throw new Error(`families: ${error.message}`);
  console.log("  families: 1");
}

{
  const n = await upsert(local, "profiles", allProfiles || []);
  console.log(`  profiles: ${n}`);
}

// Order matters for FKs (payments can reference expenses)
const insertOrder = [
  "family_funds",
  "family_accounts",
  "family_categories",
  "fixed_expenses",
  "fixed_expense_budgets",
  "expenses",
  "fixed_expense_payments",
  "family_recommendations",
];

for (const table of insertOrder) {
  const rows = bundles[table] || [];
  // fixed_expense_budgets PK is (family_id, month_key)
  const conflict =
    table === "fixed_expense_budgets" ? "family_id,month_key" : "id";
  const n = await upsert(local, table, rows, conflict);
  console.log(`  ${table}: ${n}`);
}

console.log("\nDone.");
console.log(`Local login password for cloned users: ${LOCAL_PASSWORD}`);
console.log("Tip: clear site data / localStorage if first-run gate looks stale.");
