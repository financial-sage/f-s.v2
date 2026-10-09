"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { History, Home, Menu, X } from "lucide-react";
import { useExpenseModal } from "@/components/ExpenseModalProvider";
import { Sheet } from "@/components/ui/Sheet";

const AddExpenseForm = dynamic(() => import("@/components/AddExpenseForm"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-40 items-center justify-center text-sm text-on-surface-variant">
      Cargando…
    </div>
  ),
});

const navItems = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/history", label: "Historial", icon: History },
] as const;

interface BottomNavProps {
  familyId?: string;
  partnerFirstName?: string;
  financialModel?: string;
  user1SplitPct?: number;
}

export default function BottomNav({
  familyId,
  partnerFirstName = "Mi pareja",
  financialModel = "joint_fund",
  user1SplitPct = 50,
}: BottomNavProps) {
  const pathname = usePathname();
  const { isExpenseModalOpen, setIsExpenseModalOpen, expenseToEdit, setExpenseToEdit } = useExpenseModal();
  const [expanded, setExpanded] = useState(false);
  const shouldHideNav = ["/add-expense", "/login", "/register", "/onboarding", "/profile"].includes(pathname);

  useEffect(() => {
    setExpanded(false);
  }, [pathname]);

  if (shouldHideNav) {
    return null;
  }

  if (!familyId) {
    return null;
  }

  function closeExpenseSheet() {
    setIsExpenseModalOpen(false);
    setExpenseToEdit(null);
  }

  const activeItem = navItems.find((item) => item.href === pathname) ?? navItems[0];
  const ActiveIcon = activeItem.icon;

  return (
    <>
      {expanded ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-on-surface/25 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={() => setExpanded(false)}
        />
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-5 pb-6 pointer-events-none">
        <div className="relative flex flex-col items-center pointer-events-auto">
          <div
            className={`mb-3 flex flex-col items-center gap-2 transition-all duration-200 ease-out ${
              expanded
                ? "translate-y-0 scale-100 opacity-100"
                : "pointer-events-none translate-y-3 scale-90 opacity-0"
            }`}
          >
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setExpanded(false)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border shadow-[0_8px_20px_rgba(15,23,42,0.14)] backdrop-blur-xl transition-transform active:scale-95 ${
                    isActive
                      ? "border-primary/30 bg-primary text-on-primary"
                      : "border-outline-variant/25 bg-surface-lowest/95 text-on-surface-variant"
                  }`}
                  aria-label={label}
                  title={label}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.4 : 1.9} />
                </Link>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            className={`flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/25 bg-surface-lowest/95 text-on-surface shadow-[0_10px_24px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-all duration-200 active:scale-95 ${
              expanded ? "rotate-90" : "rotate-0"
            }`}
            aria-label={expanded ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
            aria-expanded={expanded}
          >
            {expanded ? (
              <X size={16} strokeWidth={2.2} />
            ) : pathname === "/" || pathname === "/history" ? (
              <ActiveIcon size={16} strokeWidth={2.2} className="text-primary" />
            ) : (
              <Menu size={16} strokeWidth={2.2} />
            )}
          </button>
        </div>
      </nav>

      <Sheet
        open={isExpenseModalOpen}
        onClose={closeExpenseSheet}
        title="Agregar gasto"
        closeOnBackdrop={false}
      >
        {isExpenseModalOpen ? (
          <AddExpenseForm
            familyId={familyId ?? "unknown"}
            expenseToEdit={expenseToEdit}
            onClose={closeExpenseSheet}
            partnerFirstName={partnerFirstName}
            financialModel={financialModel}
            user1SplitPct={user1SplitPct}
          />
        ) : null}
      </Sheet>
    </>
  );
}
