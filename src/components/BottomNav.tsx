"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  History,
  Home,
  Landmark,
  UserRound,
  Wallet,
  type LucideProps,
} from "lucide-react";
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

const AUTH_PATHS = new Set([
  "/login",
  "/register",
  "/onboarding",
  "/forgot-password",
  "/reset-password",
]);

type NavIcon = ComponentType<LucideProps>;

type NavModule = {
  id: "home" | "history" | "accounts" | "fixed-expenses" | "profile";
  href: string;
  label: string;
  icon: NavIcon;
  match: (pathname: string) => boolean;
};

const NAV_MODULES: NavModule[] = [
  {
    id: "home",
    href: "/",
    label: "Inicio",
    icon: Home,
    match: (pathname) => pathname === "/",
  },
  {
    id: "history",
    href: "/history",
    label: "Historial",
    icon: History,
    match: (pathname) => pathname === "/history" || pathname.startsWith("/history/"),
  },
  {
    id: "accounts",
    href: "/accounts",
    label: "Cuentas",
    icon: Landmark,
    match: (pathname) => pathname === "/accounts" || pathname.startsWith("/accounts/"),
  },
  {
    id: "fixed-expenses",
    href: "/fixed-expenses",
    label: "Gastos fijos",
    icon: Wallet,
    match: (pathname) =>
      pathname === "/fixed-expenses" || pathname.startsWith("/fixed-expenses/"),
  },
  {
    id: "profile",
    href: "/profile",
    label: "Perfil",
    icon: UserRound,
    match: (pathname) => pathname === "/profile" || pathname.startsWith("/profile/"),
  },
];

/** Arc slots around the center FAB (left → top → right). Four satellites when one module is active. */
const ARC_SLOTS = [-155, -115, -65, -25] as const;
const ARC_RADIUS_PX = 82;

interface BottomNavProps {
  familyId?: string;
  partnerFirstName?: string;
  financialModel?: string;
  user1SplitPct?: number;
}

function polarToOffset(angleDeg: number, radius: number) {
  const radians = (angleDeg * Math.PI) / 180;
  return {
    x: Math.cos(radians) * radius,
    y: Math.sin(radians) * radius,
  };
}

function resolveCurrentModule(pathname: string): NavModule {
  return NAV_MODULES.find((module) => module.match(pathname)) ?? NAV_MODULES[0];
}

export default function BottomNav({
  familyId,
  partnerFirstName = "Mi pareja",
  financialModel = "joint_fund",
  user1SplitPct = 50,
}: BottomNavProps) {
  const pathname = usePathname();
  const { isExpenseModalOpen, setIsExpenseModalOpen, expenseToEdit, setExpenseToEdit } =
    useExpenseModal();
  const [expanded, setExpanded] = useState(false);

  const currentModule = useMemo(() => resolveCurrentModule(pathname), [pathname]);
  const CurrentIcon = currentModule.icon;

  /** Satellites = all modules except current; if current isn't home, Home takes its place in the arc. */
  const satellites = useMemo(() => {
    const others = NAV_MODULES.filter((module) => module.id !== currentModule.id);

    // Keep a stable visual order around the arc
    const order = ["home", "history", "accounts", "fixed-expenses", "profile"] as const;
    return [...others].sort(
      (a, b) => order.indexOf(a.id) - order.indexOf(b.id)
    );
  }, [currentModule.id]);

  useEffect(() => {
    setExpanded(false);
  }, [pathname]);

  if (AUTH_PATHS.has(pathname)) {
    return null;
  }

  function closeExpenseSheet() {
    setIsExpenseModalOpen(false);
    setExpenseToEdit(null);
  }

  function handleCenterClick() {
    if (!expanded) {
      setExpanded(true);
      return;
    }

    // Expanded + tap center again: collapse (already on this module)
    setExpanded(false);
  }

  return (
    <>
      {expanded ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-on-surface/20 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={() => setExpanded(false)}
        />
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-5 pb-6 pointer-events-none">
        <div className="relative h-12 w-12 pointer-events-auto">
          {satellites.map((module, index) => {
            const angleDeg = ARC_SLOTS[index] ?? ARC_SLOTS[ARC_SLOTS.length - 1];
            const { x, y } = polarToOffset(angleDeg, ARC_RADIUS_PX);
            const Icon = module.icon;
            const isActive = module.match(pathname);

            return (
              <Link
                key={module.id}
                href={module.href}
                onClick={() => setExpanded(false)}
                aria-label={module.label}
                title={module.label}
                className={`absolute left-1/2 top-1/2 flex h-10 w-10 items-center justify-center rounded-full border shadow-[0_8px_20px_rgba(15,23,42,0.14)] backdrop-blur-xl transition-all duration-300 ease-out active:scale-95 ${
                  isActive
                    ? "border-primary/30 bg-primary text-on-primary"
                    : "border-outline-variant/25 bg-surface-lowest/95 text-on-surface-variant"
                } ${expanded ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
                style={{
                  transform: expanded
                    ? `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1)`
                    : "translate(-50%, -50%) scale(0.55)",
                  transitionDelay: expanded ? `${index * 40}ms` : "0ms",
                }}
              >
                <Icon size={16} strokeWidth={isActive ? 2.4 : 1.9} />
              </Link>
            );
          })}

          <button
            type="button"
            onClick={handleCenterClick}
            className="absolute left-1/2 top-1/2 z-10 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary/30 bg-primary text-on-primary shadow-[0_10px_24px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-all duration-200 active:scale-95"
            aria-label={
              expanded
                ? `Cerrar menú · ${currentModule.label}`
                : `Menú · ${currentModule.label}`
            }
            aria-expanded={expanded}
            title={currentModule.label}
          >
            <CurrentIcon
              key={currentModule.id}
              size={18}
              strokeWidth={2.2}
              className="animate-in fade-in zoom-in-95 duration-200"
            />
          </button>
        </div>
      </nav>

      {familyId ? (
        <Sheet
          open={isExpenseModalOpen}
          onClose={closeExpenseSheet}
          title="Agregar gasto"
          closeOnBackdrop={false}
        >
          {isExpenseModalOpen ? (
            <AddExpenseForm
              familyId={familyId}
              expenseToEdit={expenseToEdit}
              onClose={closeExpenseSheet}
              partnerFirstName={partnerFirstName}
              financialModel={financialModel}
              user1SplitPct={user1SplitPct}
            />
          ) : null}
        </Sheet>
      ) : null}
    </>
  );
}
