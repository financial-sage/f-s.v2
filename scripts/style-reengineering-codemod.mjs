import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const projectRoot = join(process.cwd());

// Only operate on TS/TSX under src.
const files = execSync(`rg --files src -g"*.ts" -g"*.tsx"`, {
  cwd: projectRoot,
  stdio: ["ignore", "pipe", "ignore"],
})
  .toString("utf8")
  .split(/\r?\n/)
  .filter(Boolean);

// Note: Option A from the user request:
// - Convert slate/white -> semantic surface tokens
// - Convert indigo/blue -> secondary tokens
// - Leave success/warning/error palettes (emerald/amber/rose/orange) as-is.
const replacements = [
  // Backgrounds
  { re: /bg-white\/(\d+(?:\.\d+)?)/g, to: "bg-surface-lowest/$1" },
  { re: /bg-white/g, to: "bg-surface-lowest" },

  { re: /bg-slate-50\/(\d+(?:\.\d+)?)/g, to: "bg-surface/$1" },
  { re: /bg-slate-50/g, to: "bg-surface" },
  { re: /bg-slate-100\/(\d+(?:\.\d+)?)/g, to: "bg-surface-low/$1" },
  { re: /bg-slate-100/g, to: "bg-surface-low" },
  { re: /bg-slate-200\/(\d+(?:\.\d+)?)/g, to: "bg-surface-container/$1" },
  { re: /bg-slate-200/g, to: "bg-surface-container" },
  { re: /bg-slate-300\/(\d+(?:\.\d+)?)/g, to: "bg-surface-high/$1" },
  { re: /bg-slate-300/g, to: "bg-surface-high" },
  { re: /bg-slate-400\/(\d+(?:\.\d+)?)/g, to: "bg-surface-highest/$1" },
  { re: /bg-slate-400/g, to: "bg-surface-highest" },

  // Text
  { re: /text-slate-800/g, to: "text-on-surface" },
  { re: /text-slate-700/g, to: "text-on-surface" },
  { re: /text-slate-600/g, to: "text-on-surface-variant" },
  { re: /text-slate-500/g, to: "text-on-surface-variant" },
  { re: /text-slate-400/g, to: "text-outline-variant" },
  { re: /text-slate-300/g, to: "text-outline-variant" },

  // Dividers / borders / rings (most common light greys)
  { re: /divide-slate-50/g, to: "divide-outline-variant/20" },
  { re: /divide-slate-100/g, to: "divide-outline-variant/20" },
  { re: /border-slate-100/g, to: "border-outline-variant/20" },
  { re: /border-slate-200/g, to: "border-outline-variant/30" },
  { re: /border-slate-300/g, to: "border-outline-variant/40" },
  { re: /border-slate-50/g, to: "border-outline-variant/15" },
  { re: /ring-slate-200/g, to: "ring-outline-variant/40" },
  { re: /bg-slate-800/g, to: "bg-on-surface/95" },
  { re: /bg-slate-900/g, to: "bg-on-surface/95" },

  // Indigo -> secondary
  { re: /text-indigo-700\/(\d+(?:\.\d+)?)/g, to: "text-secondary/$1" },
  { re: /text-indigo-700/g, to: "text-secondary" },
  { re: /text-indigo-700\//g, to: "text-secondary/" }, // fallback
  { re: /bg-indigo-50/g, to: "bg-secondary/10" },

  // Blue -> secondary
  { re: /text-blue-600/g, to: "text-secondary" },
  { re: /bg-blue-50/g, to: "bg-secondary/10" },
  { re: /hover:text-blue-600/g, to: "hover:text-secondary" },
  { re: /hover:bg-blue-50/g, to: "hover:bg-secondary/10" },
];

function applyReplacements(input) {
  let out = input;
  for (const { re, to } of replacements) {
    if (typeof to === "function") {
      out = out.replace(re, (...args) => to(args[0], ...args.slice(1)));
    } else {
      out = out.replace(re, to);
    }
  }
  return out;
}

let changed = 0;
for (const relPath of files) {
  const abs = join(projectRoot, relPath);
  const original = readFileSync(abs, "utf8");
  const next = applyReplacements(original);
  if (next !== original) {
    writeFileSync(abs, next, "utf8");
    changed++;
  }
}

console.log(`Codemod complete. Files changed: ${changed}`);

