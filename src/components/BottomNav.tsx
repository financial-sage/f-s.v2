"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  History,
  Home,
  Landmark,
  PiggyBank,
  UserRound,
  Wallet,
  type LucideProps,
} from "lucide-react";
import { useExpenseModal } from "@/components/ExpenseModalProvider";
import { Sheet } from "@/components/ui/Sheet";

const AddExpenseForm = dynamic(() => import("@/components/AddExpenseForm"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[28rem] flex-col gap-3 px-0.5 pt-2" aria-hidden>
      <div className="h-16 animate-pulse rounded-2xl bg-on-surface/8" />
      <div className="h-10 animate-pulse rounded-xl bg-on-surface/6" />
      <div className="h-24 animate-pulse rounded-2xl bg-on-surface/6" />
      <div className="mt-auto h-12 animate-pulse rounded-full bg-on-surface/8" />
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
  id: "home" | "history" | "accounts" | "savings" | "fixed-expenses" | "profile";
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
    id: "savings",
    href: "/savings",
    label: "Ahorros",
    icon: PiggyBank,
    match: (pathname) => pathname === "/savings" || pathname.startsWith("/savings/"),
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

/** Upper arc around the center FAB (left → top → right), in degrees. */
const ARC_START_DEG = -155;
const ARC_END_DEG = -25;
const ARC_RADIUS_PX = 82;

interface BottomNavProps {
  familyId?: string;
  currentUserId?: string;
  partnerUserId?: string | null;
  familyMemberCount?: number;
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

/** Evenly spaced angles so N satellites stay symmetric with no visual gaps. */
function arcAnglesForCount(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [-90];
  const span = ARC_END_DEG - ARC_START_DEG;
  return Array.from(
    { length: count },
    (_, index) => ARC_START_DEG + (span * index) / (count - 1)
  );
}

function resolveCurrentModule(pathname: string): NavModule {
  return NAV_MODULES.find((module) => module.match(pathname)) ?? NAV_MODULES[0];
}

export default function BottomNav({
  familyId,
  currentUserId,
  partnerUserId = null,
  familyMemberCount = 1,
  partnerFirstName = "",
  financialModel = "joint_fund",
  user1SplitPct = 50,
}: BottomNavProps) {
  const pathname = usePathname();
  const { isExpenseModalOpen, setIsExpenseModalOpen, expenseToEdit, setExpenseToEdit } =
    useExpenseModal();
  const [expanded, setExpanded] = useState(false);

  // Prefetch form chunk on first interaction with the nav (covers cases idle prefetch missed).
  useEffect(() => {
    if (!expanded && !isExpenseModalOpen) return;
    void import("@/components/AddExpenseForm");
  }, [expanded, isExpenseModalOpen]);

  const currentModule = useMemo(() => resolveCurrentModule(pathname), [pathname]);
  const CurrentIcon = currentModule.icon;

  /** Satellites = modules except current. On dashboard, hide Accounts (quick action). */
  const satellites = useMemo(() => {
    const others = NAV_MODULES.filter((module) => {
      if (module.id === currentModule.id) return false;
      if (module.id === "accounts" && pathname === "/") return false;
      return true;
    });

    // Keep a stable visual order around the arc
    const order = [
      "home",
      "history",
      "accounts",
      "savings",
      "fixed-expenses",
      "profile",
    ] as const;
    return [...others].sort(
      (a, b) => order.indexOf(a.id) - order.indexOf(b.id)
    );
  }, [currentModule.id, pathname]);

  const arcAngles = useMemo(
    () => arcAnglesForCount(satellites.length),
    [satellites.length]
  );

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

      <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pointer-events-none">
        <div className="relative h-12 w-12 pointer-events-auto">
          {satellites.map((module, index) => {
            const angleDeg = arcAngles[index] ?? -90;
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
              currentUserId={currentUserId}
              partnerUserId={partnerUserId}
              familyMemberCount={familyMemberCount}
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
