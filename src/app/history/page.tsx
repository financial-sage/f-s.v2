export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CarFront,
  House,
  Plus,
  Receipt,
  ReceiptText,
  ShoppingCart,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { filterExpensesForPrivacy } from "@/lib/dashboard";
import type { ExpenseSplitType } from "@/lib/expenses";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExpenseRow {
  id: string;
  amount: number;
  concept: string;
  paid_by: string;
  responsible_for?: string | null;
  category?: string | null;
  split_type: ExpenseSplitType;
  expense_date: string;
  created_at: string;
  is_settled?: boolean;
}

type IconKey = "shopping-cart" | "car" | "utensils" | "home" | "receipt" | "deposit" | "bar-chart";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const iconMap: Record<IconKey, React.FC<{ size?: number; className?: string }>> = {
  "shopping-cart": (p) => <ShoppingCart {...p} />,
  car: (p) => <CarFront {...p} />,
  utensils: (p) => <UtensilsCrossed {...p} />,
  home: (p) => <House {...p} />,
  receipt: (p) => <Wrench {...p} />,
  deposit: (p) => <Plus {...p} />,
  "bar-chart": (p) => <BarChart3 {...p} />,
};

function getCategoryPresentation(category?: string | null, concept?: string): { iconKey: IconKey; label: string } {
  switch (category) {
    case "super": return { iconKey: "shopping-cart", label: "Super" };
    case "food": return { iconKey: "utensils", label: "Comida" };
    case "transport": return { iconKey: "car", label: "Transporte" };
    case "home": return { iconKey: "home", label: "Hogar" };
    case "deposit": return { iconKey: "deposit", label: "Aporte" };
    default: {
      const n = (concept ?? "").toLowerCase();
      if (/super|market|compra|grocery/.test(n)) return { iconKey: "shopping-cart", label: "Super" };
      if (/cafe|café|coffee|comida|rest|restaurant|almuerzo|cena/.test(n)) return { iconKey: "utensils", label: "Comida" };
      if (/gas|gasolina|uber|taxi|auto|car|bus|viaje/.test(n)) return { iconKey: "car", label: "Transporte" };
      return { iconKey: "receipt", label: "Otros" };
    }
  }
}

function groupByDate(expenses: ExpenseRow[]): { label: string; items: ExpenseRow[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const map = new Map<string, { label: string; ts: number; items: ExpenseRow[] }>();

  for (const e of expenses) {
    const raw = e.expense_date || e.created_at;
    const d = new Date(raw);
    const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

    if (!map.has(dayKey)) {
      const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const diff = Math.round((today.getTime() - target.getTime()) / 86_400_000);

      let label: string;
      if (diff === 0) label = "Hoy";
      else if (diff === 1) label = "Ayer";
      else {
        label = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long" })
          .format(d)
          .replace(".", "");
      }

      map.set(dayKey, { label, ts: target.getTime(), items: [] });
    }

    map.get(dayKey)!.items.push(e);
  }

  return [...map.values()]
    .sort((a, b) => b.ts - a.ts)
    .map(({ label, items }) => ({ label, items }));
}

function formatDate(dateInput: string) {
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" })
    .format(new Date(dateInput))
    .replace(".", "");
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) redirect("/onboarding");

  const { data: familyProfiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("family_id", profile.family_id);

  const partner = (familyProfiles ?? []).find((p) => p.id !== user.id);
  const partnerName = partner?.full_name?.trim().split(/\s+/)[0] ?? "Pareja";

  const { data: rawExpenses } = await supabase
    .from("expenses")
    .select("id, amount, concept, paid_by, responsible_for, category, split_type, expense_date, created_at, is_settled")
    .eq("family_id", profile.family_id)
    .eq("is_active", true)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  const visible = filterExpensesForPrivacy(
    (rawExpenses ?? []) as ExpenseRow[],
    user.id
  );

  const groups = groupByDate(visible);

  return (
    <div className="flex flex-col h-dvh bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 z-10 flex items-center gap-3 bg-[#F8F9FA]/90 px-4 py-4 backdrop-blur-md border-b border-slate-100">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm text-slate-500 transition hover:text-slate-800"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-bold tracking-tight text-slate-800">Historial de Movimientos</h1>
      </header>

      {/* List */}
      <main className="flex-1 overflow-y-auto pb-24">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
            <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
              <ReceiptText size={24} className="text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">Aún no hay movimientos registrados.</p>
          </div>
        ) : (
          groups.map(({ label, items }) => (
            <section key={label} className="mb-2">
              {/* Day label */}
              <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-sm px-4 py-2 border-b border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
              </div>

              {/* Items */}
              <div className="bg-white divide-y divide-slate-50 shadow-sm mx-3 my-2 rounded-2xl overflow-hidden">
                {items.map((expense) => {
                  const { iconKey } = getCategoryPresentation(expense.category, expense.concept);
                  const Icon = iconMap[iconKey] ?? Receipt;
                  const isDeposit = expense.category === "deposit";
                  const isDebt =
                    expense.paid_by !== expense.responsible_for &&
                    expense.category !== "deposit";
                  const paidByMe = expense.paid_by === user.id;
                  const paidByLabel = paidByMe ? "TÚ" : partnerName.toUpperCase().slice(0, 8);

                  return (
                    <div key={expense.id} className="flex items-center justify-between px-4 py-3.5">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-emerald-800/10 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0 shadow-sm">
                          <Icon size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-800 leading-tight">{expense.concept}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                              {formatDate(expense.expense_date || expense.created_at)} • {paidByLabel}
                            </span>
                            {isDebt && (
                              <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${
                                expense.is_settled
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-orange-50 text-orange-600"
                              }`}>
                                {expense.is_settled ? "Liquidado" : "Pendiente"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className={`text-base font-bold shrink-0 ${isDeposit ? "text-[#60855c]" : "text-slate-800"}`}>
                        {isDeposit ? "+" : "-"}${Number(expense.amount).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
