/**
 * Generates PWA icons from public/icons/icon.svg
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "public", "icons", "icon.svg");
const svg = readFileSync(svgPath);

const sizes = [192, 512];

for (const size of sizes) {
  const output = join(root, "public", "icons", `icon-${size}.png`);
  await sharp(svg).resize(size, size).png().toFile(output);
  console.log(`Created ${output}`);
}
