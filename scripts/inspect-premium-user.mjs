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

const email = (process.argv[2] || "tcampof@hotmail.com").trim().toLowerCase();
const env = loadEnv(".env.cloud.local");
const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

let user = null;
for (let page = 1; page <= 30; page++) {
  const { data, error } = await admin.auth.admin.listUsers({
    page,
    perPage: 200,
  });
  if (error) throw error;
  user = (data.users || []).find((u) => (u.email || "").toLowerCase() === email);
  if (user || !data.users?.length) break;
}

console.log("user", user?.id, user?.email);
const { data: profile, error: pe } = await admin
  .from("profiles")
  .select("id, family_id, is_premium, is_vip, pending_premium_welcome")
  .eq("id", user.id)
  .maybeSingle();
console.log("profile_error", pe?.message || null);
console.log("profile", JSON.stringify(profile, null, 2));

if (profile?.family_id) {
  const { data: f } = await admin
    .from("families")
    .select(
      "id, is_premium_household, premium_source, premium_until, user_1_id, user_2_id"
    )
    .eq("id", profile.family_id)
    .maybeSingle();
  console.log("family", JSON.stringify(f, null, 2));
}
