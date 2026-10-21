import fs from "fs";

function get(raw, k) {
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

const raw = fs.readFileSync(".env.local", "utf8");
const apiKey = get(raw, "PADDLE_API_KEY");
const env = get(raw, "NEXT_PUBLIC_PADDLE_ENV") || "sandbox";
const monthly = get(raw, "NEXT_PUBLIC_PADDLE_PRICE_MONTHLY");
const yearly = get(raw, "NEXT_PUBLIC_PADDLE_PRICE_YEARLY");

const base =
  env === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";

async function checkPrice(id, label) {
  const res = await fetch(`${base}/prices/${id}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Paddle-Version": "1",
    },
  });
  const body = await res.json().catch(() => ({}));
  console.log(
    `${label}: http=${res.status} id=${id.slice(0, 10)}... error=${body?.error?.code ?? "none"} detail=${body?.error?.detail ?? body?.error?.doc_url ?? "ok"}`
  );
  if (body?.data) {
    console.log(
      `  status=${body.data.status} type=${body.data.billing_cycle?.interval ?? "?"} product=${String(body.data.product_id ?? "").slice(0, 10)}...`
    );
  }
}

await checkPrice(monthly, "monthly");
await checkPrice(yearly, "yearly");
