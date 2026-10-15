/**
 * Live navigation stress test against local Next.js.
 *
 * Usage:
 *   $env:STRESS_EMAIL="..."
 *   $env:STRESS_PASSWORD="..."
 *   node scripts/stress-nav.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.STRESS_BASE_URL || "http://localhost:3000";
const EMAIL = process.env.STRESS_EMAIL || "";
const PASSWORD = process.env.STRESS_PASSWORD || "";
const ROUNDS = Number(process.env.STRESS_ROUNDS || 10);

const TABS = [
  { name: "home", href: "/", marker: /Saldo|Movimientos|Acciones|Mi fondo|Bolsillo/i },
  { name: "history", href: "/history", marker: /Historial|movimientos|Este mes|Sin movimientos|Filtros/i },
  { name: "fixed-expenses", href: "/fixed-expenses", marker: /Gastos fijos|Checklist|Aportar|Este mes|primer gasto/i },
  { name: "profile", href: "/profile", marker: /Perfil|Cuenta|Cerrar sesión|Ajustes|Tema|Moneda/i },
];

function pct(sorted, p) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const avg = sorted.reduce((s, n) => s + n, 0) / sorted.length;
  return {
    n: sorted.length,
    min: Math.round(sorted[0]),
    p50: Math.round(pct(sorted, 50)),
    p95: Math.round(pct(sorted, 95)),
    max: Math.round(sorted[sorted.length - 1]),
    avg: Math.round(avg),
  };
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 45000 });
  await page.locator('input[type="email"]').waitFor({ state: "visible", timeout: 15000 });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /entrar/i }).click();
  try {
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 25000 });
  } catch (err) {
    const body = (await page.locator("body").innerText()).slice(0, 400).replace(/\s+/g, " ");
    throw new Error(`Login stuck at ${page.url()}: ${body}`);
  }
  await page.waitForTimeout(800);
}

async function expandBottomNav(page) {
  const menuBtn = page.getByRole("button", { name: /Menú/i });
  if (await menuBtn.count()) {
    await menuBtn.click();
    await page.waitForTimeout(280); // arc open animation
    return;
  }
  // Already expanded (aria-label switches to "Cerrar menú · …")
  const closeBtn = page.getByRole("button", { name: /Cerrar menú ·/i });
  if (await closeBtn.count()) return;
}

const TAB_LABEL = {
  home: "Inicio",
  history: "Historial",
  "fixed-expenses": "Gastos fijos",
  profile: "Perfil",
};

async function softNav(page, tab) {
  const pathNow = () => {
    const u = new URL(page.url());
    return u.pathname.replace(/\/$/, "") || "/";
  };
  const target = tab.href.replace(/\/$/, "") || "/";

  // Already on target: skip (FAB center is current route, not a link)
  if (pathNow() === target) {
    await page.getByText(tab.marker).first().waitFor({ timeout: 5000 }).catch(() => null);
    return 0;
  }

  // Expand FAB first (not counted — UX animation, not route cost)
  await expandBottomNav(page);

  const byLabel = page.getByRole("link", {
    name: new RegExp(`^${TAB_LABEL[tab.name]}$`, "i"),
  });
  const byHref = page.locator(`nav a[href="${tab.href}"]`);

  const t0 = performance.now();

  if (await byLabel.count()) {
    await byLabel.first().click({ force: true });
  } else if (await byHref.count()) {
    await byHref.first().click({ force: true });
  } else {
    const any = page.locator(`a[href="${tab.href}"]`);
    if (await any.count()) await any.last().click();
    else await page.goto(`${BASE}${tab.href}`, { waitUntil: "domcontentloaded" });
  }

  await page.waitForURL((url) => {
    const path = url.pathname.replace(/\/$/, "") || "/";
    return path === target;
  }, { timeout: 15000 });

  await page.getByText(tab.marker).first().waitFor({ timeout: 12000 }).catch(() => null);

  return Math.round(performance.now() - t0);
}

async function hardNav(page, tab) {
  const t0 = performance.now();
  await page.goto(`${BASE}${tab.href}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.getByText(tab.marker).first().waitFor({ timeout: 12000 }).catch(() => null);
  await page.waitForTimeout(80);
  return Math.round(performance.now() - t0);
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error("Set STRESS_EMAIL and STRESS_PASSWORD");
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const longRequests = [];
  page.on("requestfinished", async (req) => {
    try {
      const started = Date.now();
      const res = await req.response();
      const elapsed = Date.now() - started;
      // requestfinished fires when done; approximate with response timing if available
      const timing = req.timing?.() || {};
      const total = Math.max(0, Math.round((timing.responseEnd || 0) - (timing.requestStart || 0)));
      if (total > 120 || elapsed > 120) {
        longRequests.push({
          url: req.url().replace(BASE, "").slice(0, 100),
          method: req.method(),
          status: res?.status(),
          totalMs: total || elapsed,
        });
      }
    } catch {
      // ignore
    }
  });

  console.log(`\n=== Stress nav @ ${BASE} (${ROUNDS} rounds) as ${EMAIL} ===\n`);
  await login(page);
  console.log("Logged in →", page.url());

  // Warm caches
  for (const tab of TABS) {
    await softNav(page, tab);
  }

  const soft = Object.fromEntries(TABS.map((t) => [t.name, []]));
  const hard = Object.fromEntries(TABS.map((t) => [t.name, []]));

  for (let i = 0; i < ROUNDS; i++) {
    for (const tab of TABS) {
      const ms = await softNav(page, tab);
      soft[tab.name].push(ms);
      process.stdout.write(`  soft ${i + 1}/${ROUNDS} ${tab.name}: ${ms}ms\n`);
    }
  }

  console.log("\n--- Soft BottomNav (primary metric) ---");
  for (const tab of TABS) {
    console.log(tab.name, summarize(soft[tab.name]));
  }

  // Fewer hard navigations (full document loads)
  for (let i = 0; i < 4; i++) {
    for (const tab of TABS) {
      const ms = await hardNav(page, tab);
      hard[tab.name].push(ms);
      process.stdout.write(`  hard ${i + 1}/4 ${tab.name}: ${ms}ms\n`);
    }
  }

  console.log("\n--- Hard page.goto ---");
  for (const tab of TABS) {
    console.log(tab.name, summarize(hard[tab.name]));
  }

  const slow = [...longRequests].sort((a, b) => b.totalMs - a.totalMs).slice(0, 12);
  console.log("\n--- Slow-ish requests (approx) ---");
  console.log(slow);

  // Verdict helpers
  const softAll = TABS.flatMap((t) => soft[t.name]);
  const softSummary = summarize(softAll);
  console.log("\n=== VERDICT (soft nav overall) ===");
  console.log(softSummary);
  if (softSummary.p50 <= 250) console.log("OK: p50 soft nav <= 250ms");
  else if (softSummary.p50 <= 450) console.log("ACCEPTABLE: p50 soft nav <= 450ms");
  else console.log("SLOW: p50 soft nav > 450ms — investigate RSC/store");

  await browser.close();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
