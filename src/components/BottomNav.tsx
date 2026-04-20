"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CreditCard, Goal, History, Home, Plus, X } from "lucide-react";
import AddExpenseForm from "@/components/AddExpenseForm";
import { useExpenseModal } from "@/components/ExpenseModalProvider";

const leftNavItems = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/cards", label: "Tarjetas", icon: CreditCard },
] as const;

const rightNavItems = [
  { href: "/history", label: "Historial", icon: History },
  { href: "/budget", label: "Presupuesto", icon: Goal },
] as const;

interface BottomNavProps {
  partnerFirstName?: string;
  financialModel?: string;
  user1SplitPct?: number;
}

export default function BottomNav({
  partnerFirstName = "Mi pareja",
  financialModel = "joint_fund",
  user1SplitPct = 50,
}: BottomNavProps) {
  const pathname = usePathname();
  const { isExpenseModalOpen, setIsExpenseModalOpen, expenseToEdit, setExpenseToEdit } = useExpenseModal();
  const [isSheetAnimated, setIsSheetAnimated] = useState(false);
  const shouldHideNav = ["/add-expense", "/login", "/register", "/onboarding", "/profile"].includes(pathname);

  useEffect(() => {
    if (isExpenseModalOpen) {
      requestAnimationFrame(() => requestAnimationFrame(() => setIsSheetAnimated(true)));
    }
  }, [isExpenseModalOpen]);

  if (shouldHideNav) {
    return null;
  }

  function openExpenseSheet() {
    setExpenseToEdit(null);
    setIsExpenseModalOpen(true);
  }

  function closeExpenseSheet() {
    setIsSheetAnimated(false);
    window.setTimeout(() => {
      setIsExpenseModalOpen(false);
      setExpenseToEdit(null);
    }, 450);
  }

  function renderNavItem(
    href: string,
    label: string,
    Icon: typeof Home,
  ) {
    const isActive = pathname === href;

    return (
      <Link
        key={href}
        href={href}
        className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-full px-1 py-2 text-slate-400 transition-all duration-300 active:scale-95"
      >
        <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} className={isActive ? "text-[#60855c]" : "text-slate-400"} />
        <span className={`max-w-full truncate whitespace-nowrap text-[9px] font-bold ${isActive ? "text-[#60855c]" : "text-slate-400"}`}>{label}</span>
      </Link>
    );
  }

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4">
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end rounded-4xl bg-white/85 px-2 pt-3 shadow-[0_-8px_30px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          {leftNavItems.map(({ href, label, icon: Icon }) => renderNavItem(href, label, Icon))}

          <div className="flex justify-center">
            <button
              type="button"
              onClick={openExpenseSheet}
              className={`-mt-7 mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#60855c] text-white shadow-[0_12px_24px_rgba(96,133,92,0.35)] transition-all duration-300 active:scale-95 ${
                isExpenseModalOpen ? "pointer-events-none scale-95 opacity-80" : "scale-100 opacity-100"
              }`}
              aria-label="Agregar gasto"
            >
              <Plus size={24} strokeWidth={2.6} />
            </button>
          </div>

          {rightNavItems.map(({ href, label, icon: Icon }) => renderNavItem(href, label, Icon))}
        </div>
      </nav>

      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-80 flex flex-col justify-end">
          <div
            className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${isSheetAnimated ? "opacity-100" : "opacity-0"}`}
            onClick={closeExpenseSheet}
          />
          <div className={`relative flex h-[80vh] flex-col rounded-t-[2.5rem] bg-slate-50 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isSheetAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
            <div className="relative flex items-center justify-center pt-4 pb-2">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
              <button
                type="button"
                onClick={closeExpenseSheet}
                className="absolute top-4 right-6 rounded-full bg-slate-100 p-1.5 text-slate-400 transition-colors hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="hide-scrollbar flex-1 overflow-y-auto px-4 pb-8">
              <AddExpenseForm
                expenseToEdit={expenseToEdit}
                onClose={closeExpenseSheet}
                partnerFirstName={partnerFirstName}
                financialModel={financialModel}
                user1SplitPct={user1SplitPct}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
