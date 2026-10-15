import { chromium } from "playwright";

const EMAIL = process.env.STRESS_EMAIL || "pareja1@sindescuadre.com";
const PASSWORD = process.env.STRESS_PASSWORD || "Admin123";
const BASE = process.env.STRESS_BASE_URL || "http://localhost:3000";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

page.on("console", (msg) => {
  if (["error", "warning"].includes(msg.type())) {
    console.log("CONSOLE", msg.type(), msg.text().slice(0, 200));
  }
});

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.locator('input[type="email"]').fill(EMAIL);
await page.locator('input[type="password"]').fill(PASSWORD);
await page.getByRole("button", { name: /entrar/i }).click();
await page.waitForTimeout(4000);

console.log("URL", page.url());
const body = (await page.locator("body").innerText()).slice(0, 800).replace(/\s+/g, " ");
console.log("BODY", body);

const links = await page.locator("a[href]").evaluateAll((els) =>
  els.map((e) => ({
    text: (e.innerText || "").trim().slice(0, 40),
    href: e.getAttribute("href"),
  }))
);
console.log("LINKS", JSON.stringify(links.slice(0, 40), null, 2));

await browser.close();
