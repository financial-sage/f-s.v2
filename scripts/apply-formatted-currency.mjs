import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const root = "src/components";
const files = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".tsx")) files.push(p);
  }
}
walk(root);

const importLine =
  'import { FormattedCurrency } from "@/components/FormattedCurrency";';

function ensureImport(src) {
  if (src.includes("FormattedCurrency")) return src;
  if (!src.includes("formatCurrency(")) return src;
  const m = src.match(/^import .+;$/m);
  if (!m) return src;
  return src.replace(m[0], `${m[0]}\n${importLine}`);
}

function transform(src) {
  let out = src;

  out = out.replace(
    /\{balanceVisible \? formatCurrency\(([^)]+)\) : ("[^"]+")\}/g,
    "{balanceVisible ? <FormattedCurrency value={$1} /> : $2}"
  );

  out = out.replace(
    /-\{formatCurrency\(([^)]+)\)\}/g,
    '-<FormattedCurrency value={$1} />'
  );

  out = out.replace(
    /\{formatCurrency\(([^)]+)\)\}/g,
    "<FormattedCurrency value={$1} />"
  );

  out = out.replace(
    /\? formatCurrency\(([^)]+)\)/g,
    "? <FormattedCurrency value={$1} />"
  );

  // Don't put components into input value/placeholder props
  out = out.replace(
    /value=\{<FormattedCurrency value=\{([^}]+)\} \/>\}/g,
    "value={formatCurrency($1)}"
  );
  out = out.replace(
    /placeholder=\{<FormattedCurrency value=\{([^}]+)\} \/>\}/g,
    "placeholder={formatCurrency($1)}"
  );

  return out;
}

let changed = 0;
for (const file of files) {
  const before = readFileSync(file, "utf8");
  if (!before.includes("formatCurrency(")) continue;
  let after = transform(before);
  if (after === before) continue;
  after = ensureImport(after);
  writeFileSync(file, after);
  changed += 1;
  console.log("updated", file);
}
console.log("files", changed);
