"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CreditCard, Goal, History, Home, Plus } from "lucide-react";
import AddExpenseForm from "@/components/AddExpenseForm";
import { useExpenseModal } from "@/components/ExpenseModalProvider";
import { Sheet } from "@/components/ui/Sheet";

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
  const shouldHideNav = ["/add-expense", "/login", "/register", "/onboarding", "/profile"].includes(pathname);

  if (shouldHideNav) {
    return null;
  }

  function openExpenseSheet() {
    setExpenseToEdit(null);
    setIsExpenseModalOpen(true);
  }

  function closeExpenseSheet() {
    setIsExpenseModalOpen(false);
    setExpenseToEdit(null);
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
        className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-full px-1 py-2 text-outline-variant transition-all duration-300 active:scale-95"
      >
        <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} className={isActive ? "text-primary" : "text-outline-variant"} />
        <span className={`max-w-full truncate whitespace-nowrap text-[9px] font-bold ${isActive ? "text-primary" : "text-outline-variant"}`}>{label}</span>
      </Link>
    );
  }

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4">
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end rounded-4xl bg-surface-lowest/85 px-2 pt-3 shadow-[0_-8px_30px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          {leftNavItems.map(({ href, label, icon: Icon }) => renderNavItem(href, label, Icon))}

          <div className="flex justify-center">
            <button
              type="button"
              onClick={openExpenseSheet}
              className={`-mt-7 mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_12px_24px_rgba(74,101,73,0.35)] transition-all duration-300 active:scale-95 ${
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

      <Sheet open={isExpenseModalOpen} onClose={closeExpenseSheet} title="Agregar gasto">
        <AddExpenseForm
          expenseToEdit={expenseToEdit}
          onClose={closeExpenseSheet}
          partnerFirstName={partnerFirstName}
          financialModel={financialModel}
          user1SplitPct={user1SplitPct}
        />
      </Sheet>
    </>
  );
}
