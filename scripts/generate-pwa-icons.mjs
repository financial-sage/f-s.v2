import sharp from "sharp";
import fs from "fs";
import path from "path";

const root = path.resolve("public/icons");
const outDir = path.join(root, "v2");
fs.mkdirSync(outDir, { recursive: true });

const svg = fs.readFileSync(path.join(root, "icon.svg"));

const maskableSvg = Buffer.from(
  String(svg)
    .replace(/<clipPath[\s\S]*?<\/clipPath>/, "")
    .replace(/clip-path="url\(#appIcon\)"/, ""),
);

async function writeAny(size, filename) {
  const out = path.join(outDir, filename);
  await sharp(svg).resize(size, size).png().toFile(out);
  console.log("wrote", out, fs.statSync(out).size);
}

async function writeMaskable(size, filename) {
  const out = path.join(outDir, filename);
  const inset = Math.round(size * 0.1);
  const inner = size - inset * 2;
  const icon = await sharp(maskableSvg).resize(inner, inner).png().toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: { r: 0, g: 0, b: 51 },
    },
  })
    .composite([{ input: icon, top: inset, left: inset }])
    .png()
    .toFile(out);
  console.log("wrote", out, fs.statSync(out).size);
}

await writeAny(192, "icon-192.png");
await writeAny(512, "icon-512.png");
await writeMaskable(512, "icon-512-maskable.png");
await writeAny(180, "apple-touch-icon.png");
console.log("done");
