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
  console.error("Usage: node scripts/queue-premium-welcome.mjs email");
  process.exit(1);
}

const env = loadEnv(".env.cloud.local");
const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function findUser(target) {
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

const user = await findUser(email);
if (!user) {
  console.log("USER_NOT_FOUND");
  process.exit(1);
}

const { data: profile } = await admin
  .from("profiles")
  .select("id, family_id")
  .eq("id", user.id)
  .maybeSingle();

let variant = "solo";
if (profile?.family_id) {
  const { data: family } = await admin
    .from("families")
    .select("user_1_id, user_2_id")
    .eq("id", profile.family_id)
    .maybeSingle();
  const n = [family?.user_1_id, family?.user_2_id].filter(Boolean).length;
  variant = n >= 2 ? "couple" : "solo";
}

const payload = {
  at: new Date().toISOString(),
  variant,
  source: "paid",
};

const { error } = await admin
  .from("profiles")
  .update({ pending_premium_welcome: payload })
  .eq("id", user.id);

if (error) throw error;
console.log("QUEUED", user.id, payload);
