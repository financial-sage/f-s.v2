import { readFileSync, writeFileSync } from "fs";

const files = [
  "src/components/AccountsPanel.tsx",
  "src/components/BudgetManager.tsx",
  "src/components/BudgetProgress.tsx",
  "src/components/DashboardCouple.tsx",
  "src/components/DashboardSolo.tsx",
  "src/components/FixedExpensesManager.tsx",
  "src/components/FundsPanel.tsx",
  "src/components/HistoryList.tsx",
  "src/components/RecentActivity.tsx",
  "src/components/SavingsPanel.tsx",
];

const importLine =
  'import { FormattedCurrency } from "@/components/FormattedCurrency";';

for (const f of files) {
  let s = readFileSync(f, "utf8");
  if (s.includes('from "@/components/FormattedCurrency"')) {
    console.log("ok", f);
    continue;
  }
  if (!s.includes("FormattedCurrency")) continue;

  const nl = s.includes("\r\n") ? "\r\n" : "\n";
  const needle = `"use client";${nl}${nl}`;
  if (s.startsWith('"use client";') || s.startsWith("'use client';")) {
    const client = s.startsWith("'use client';")
      ? `'use client';${nl}${nl}`
      : needle;
    if (s.startsWith(client.replace(/\n/g, nl).slice(0, 12))) {
      // fall through
    }
    s = s.replace(
      /^['"]use client['"];\r?\n\r?\n/,
      (m) => `${m}${importLine}${nl}`
    );
  } else {
    s = `${importLine}${nl}${s}`;
  }
  writeFileSync(f, s);
  console.log("added", f);
}
