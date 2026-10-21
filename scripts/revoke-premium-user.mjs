import fs from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  const raw = fs.readFileSync(path, "utf8");
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

const email = (process.argv[2] || "").trim().toLowerCase();
if (!email) {
  console.error("Usage: node scripts/revoke-premium-user.mjs email@example.com");
  process.exit(1);
}

const env = loadEnv(".env.cloud.local");
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing cloud Supabase env");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(target) {
  for (let page = 1; page <= 30; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const hit = (data.users || []).find(
      (u) => (u.email || "").toLowerCase() === target
    );
    if (hit) return hit;
    if (!data.users?.length) break;
  }
  return null;
}

const user = await findUserByEmail(email);
if (!user) {
  console.log("USER_NOT_FOUND");
  process.exit(1);
}

console.log(`user_id=${user.id}`);

const { data: profile, error: profileError } = await admin
  .from("profiles")
  .select("id, family_id, is_premium, is_vip")
  .eq("id", user.id)
  .maybeSingle();

if (profileError) throw profileError;
console.log("profile", JSON.stringify(profile));

if (!profile?.family_id) {
  await admin
    .from("profiles")
    .update({
      is_premium: false,
      is_vip: false,
      pending_premium_welcome: null,
    })
    .eq("id", user.id);
  console.log("NO_FAMILY_cleared_profile_flags");
  process.exit(0);
}

const { data: family, error: familyError } = await admin
  .from("families")
  .select(
    "id, user_1_id, user_2_id, is_premium_household, premium_source, premium_until"
  )
  .eq("id", profile.family_id)
  .maybeSingle();

if (familyError) throw familyError;
console.log("family_before", JSON.stringify(family));

const memberIds = [family.user_1_id, family.user_2_id].filter(Boolean);

const { error: fe } = await admin
  .from("families")
  .update({
    is_premium_household: false,
    premium_until: null,
    premium_source: null,
    updated_at: new Date().toISOString(),
  })
  .eq("id", profile.family_id);
if (fe) throw fe;

const { error: pe } = await admin
  .from("profiles")
  .update({
    is_premium: false,
    is_vip: false,
    pending_premium_welcome: null,
  })
  .in("id", memberIds);
if (pe) throw pe;

const { data: subs } = await admin
  .from("billing_subscriptions")
  .select("id, paddle_subscription_id, status, user_id")
  .in("user_id", memberIds);

console.log("subs_before", JSON.stringify(subs));

if (subs?.length) {
  await admin
    .from("billing_subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .in("user_id", memberIds);
}

const { data: familyAfter } = await admin
  .from("families")
  .select("id, is_premium_household, premium_source, premium_until")
  .eq("id", profile.family_id)
  .maybeSingle();

const { data: profilesAfter } = await admin
  .from("profiles")
  .select("id, is_premium, is_vip")
  .in("id", memberIds);

console.log("family_after", JSON.stringify(familyAfter));
console.log("profiles_after", JSON.stringify(profilesAfter));
console.log("DONE");
