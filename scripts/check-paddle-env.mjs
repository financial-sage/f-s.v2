import fs from "fs";

const path = ".env.local";
if (!fs.existsSync(path)) {
  console.log("MISSING_FILE");
  process.exit(0);
}

const raw = fs.readFileSync(path, "utf8");
const keys = [
  "NEXT_PUBLIC_PADDLE_ENV",
  "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN",
  "NEXT_PUBLIC_PADDLE_PRICE_MONTHLY",
  "NEXT_PUBLIC_PADDLE_PRICE_YEARLY",
  "PADDLE_API_KEY",
  "PADDLE_WEBHOOK_SECRET",
];

for (const k of keys) {
  const m = raw.match(new RegExp(`^${k}=(.*)$`, "m"));
  if (!m) {
    console.log(`${k}: MISSING`);
    continue;
  }
  let v = m[1].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  if (!v || v.startsWith("#")) {
    console.log(`${k}: EMPTY`);
    continue;
  }

  let kind = "SET";
  if (v.startsWith("pdl_live")) kind = "LIVE_KEY";
  else if (v.startsWith("pdl_sdbx") || v.startsWith("pdl_sbx")) kind = "SANDBOX_KEY";
  else if (v.startsWith("pri_")) kind = "PRICE_ID";
  else if (k === "NEXT_PUBLIC_PADDLE_ENV") kind = `ENV=${v}`;

  console.log(`${k}: OK len=${v.length} (${kind})`);
}

function get(k) {
  const m = raw.match(new RegExp(`^${k}=(.*)$`, "m"));
  if (!m) return null;
  let v = m[1].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  return v;
}

const token = get("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN");
const api = get("PADDLE_API_KEY");
const monthly = get("NEXT_PUBLIC_PADDLE_PRICE_MONTHLY");
const yearly = get("NEXT_PUBLIC_PADDLE_PRICE_YEARLY");

console.log("--- checks ---");
console.log(`token_same_as_api_key: ${Boolean(token && api && token === api)}`);
console.log(
  `token_looks_like_api_key: ${Boolean(token && token.startsWith("pdl_"))}`
);
console.log(
  `monthly_looks_real: ${Boolean(monthly && monthly.startsWith("pri_") && monthly.length >= 20)}`
);
console.log(
  `yearly_looks_real: ${Boolean(yearly && yearly.startsWith("pri_") && yearly.length >= 20)}`
);

function inspectId(label, v) {
  if (!v) {
    console.log(`${label}: null`);
    return;
  }
  const hasWhitespace = /\s/.test(v);
  const hasQuotes = v.includes('"') || v.includes("'");
  console.log(
    `${label}: prefix=${JSON.stringify(v.slice(0, 8))} len=${v.length} whitespace=${hasWhitespace} embeddedQuotes=${hasQuotes} startsPri=${v.startsWith("pri_")} startsPro=${v.startsWith("pro_")}`
  );
}

inspectId("monthly", monthly);
inspectId("yearly", yearly);
inspectId("client_token", token);

const dupMonthly = [...raw.matchAll(/^NEXT_PUBLIC_PADDLE_PRICE_MONTHLY=/gm)];
const dupYearly = [...raw.matchAll(/^NEXT_PUBLIC_PADDLE_PRICE_YEARLY=/gm)];
console.log(`duplicate_monthly_lines: ${dupMonthly.length}`);
console.log(`duplicate_yearly_lines: ${dupYearly.length}`);
