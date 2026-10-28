"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type CSSProperties,
} from "react";
import {
  ChartPie,
  History,
  Home,
  Landmark,
  PiggyBank,
  Tags,
  UserRound,
  Wallet,
  WalletCards,
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

/** Legal / help pages reachable before login — no FAB. */
const PUBLIC_CONTENT_PATHS = new Set(["/profile/privacy", "/profile/support"]);

function shouldHideBottomNav(pathname: string) {
  return AUTH_PATHS.has(pathname) || PUBLIC_CONTENT_PATHS.has(pathname);
}

type NavIcon = ComponentType<LucideProps>;

type NavModule = {
  id:
    | "home"
    | "history"
    | "accounts"
    | "bolsillos"
    | "savings"
    | "fixed-expenses"
    | "categories"
    | "budget"
    | "profile";
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
    id: "bolsillos",
    href: "/bolsillos",
    label: "Bolsillos",
    icon: WalletCards,
    match: (pathname) =>
      pathname === "/bolsillos" || pathname.startsWith("/bolsillos/"),
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
    id: "categories",
    href: "/categories",
    label: "Categorías",
    icon: Tags,
    match: (pathname) =>
      pathname === "/categories" || pathname.startsWith("/categories/"),
  },
  {
    id: "budget",
    href: "/budget",
    label: "Presupuesto",
    icon: ChartPie,
    match: (pathname) => pathname === "/budget" || pathname.startsWith("/budget/"),
  },
  {
    id: "profile",
    href: "/profile",
    label: "Perfil",
    icon: UserRound,
    match: (pathname) => pathname === "/profile" || pathname.startsWith("/profile/"),
  },
];

interface BottomNavProps {
  familyId?: string;
  currentUserId?: string;
  partnerUserId?: string | null;
  familyMemberCount?: number;
  partnerFirstName?: string;
  financialModel?: string;
  user1SplitPct?: number;
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
  const [receiptScanning, setReceiptScanning] = useState(false);

  useEffect(() => {
    if (!expanded && !isExpenseModalOpen) return;
    void import("@/components/AddExpenseForm");
  }, [expanded, isExpenseModalOpen]);

  const currentModule = useMemo(() => resolveCurrentModule(pathname), [pathname]);
  const CurrentIcon = currentModule.icon;

  useEffect(() => {
    setExpanded(false);
  }, [pathname]);

  if (shouldHideBottomNav(pathname)) {
    return null;
  }

  function closeExpenseSheet() {
    if (receiptScanning) return;
    setIsExpenseModalOpen(false);
    setExpenseToEdit(null);
  }

  function handleCenterClick() {
    setExpanded((prev) => !prev);
  }

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

      <nav
        data-tour="bottom-nav"
        className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] pointer-events-none"
      >
        <div className="relative flex w-full max-w-sm flex-col items-center pointer-events-auto">
          {expanded ? (
            <div
              className="nav-panel-in mb-2.5 w-[min(100%,16.5rem)] overflow-hidden rounded-[1.35rem] border border-glass-border bg-glass/95 px-2.5 pb-2.5 pt-2.5 shadow-[0_14px_36px_rgba(15,23,42,0.16)] backdrop-blur-2xl"
              role="menu"
              aria-label="Navegación"
            >
              <div
                className="pointer-events-none mx-auto mb-1.5 h-px w-8 bg-gradient-to-r from-transparent via-[#c4a574]/55 to-transparent"
                aria-hidden
              />
              <div className="grid grid-cols-3 gap-x-0.5 gap-y-0.5">
                {NAV_MODULES.filter((module) => module.id !== currentModule.id).map(
                  (module, index) => {
                    const Icon = module.icon;
                    const col = index % 3;
                    const row = Math.floor(index / 3);
                    // Originate near the FAB (below-center of the panel).
                    const fromX = `${(1 - col) * 2.1}rem`;
                    const fromY = `${1.8 + (1 - row) * 1.15}rem`;

                    return (
                      <Link
                        key={module.id}
                        href={module.href}
                        role="menuitem"
                        onClick={() => setExpanded(false)}
                        className="nav-bubble-in group flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-on-surface transition-colors hover:bg-glass-soft active:scale-[0.98]"
                        style={
                          {
                            "--nav-bx": fromX,
                            "--nav-by": fromY,
                            animationDelay: `${90 + index * 48}ms`,
                          } as CSSProperties
                        }
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-low/80 text-on-surface-variant transition-colors group-hover:text-primary">
                          <Icon size={14} strokeWidth={1.75} />
                        </span>
                        <span className="w-full truncate text-center text-[10px] font-light leading-tight tracking-tight">
                          {module.label}
                        </span>
                      </Link>
                    );
                  }
                )}
              </div>
              <div
                className="pointer-events-none mx-auto mt-1.5 h-px w-8 bg-gradient-to-r from-transparent via-[#c4a574]/55 to-transparent"
                aria-hidden
              />
            </div>
          ) : null}

          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={handleCenterClick}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary text-on-primary shadow-[0_10px_24px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-all duration-200 active:scale-95"
              aria-label={
                expanded
                  ? `Cerrar menú · ${currentModule.label}`
                  : `Abrir menú · ${currentModule.label}`
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
            <span className="text-[10px] font-medium leading-none text-on-surface" aria-hidden>
              Menú
            </span>
          </div>
        </div>
      </nav>

      {familyId ? (
        <Sheet
          open={isExpenseModalOpen}
          onClose={closeExpenseSheet}
          title={expenseToEdit ? "Editar gasto" : "Nuevo gasto"}
          subtitle={
            expenseToEdit
              ? "Actualiza el movimiento."
              : "Registra un nuevo movimiento."
          }
          headerLayout="title-row"
          closeOnBackdrop={false}
          closeDisabled={receiptScanning}
        >
          {isExpenseModalOpen ? (
            <AddExpenseForm
              familyId={familyId}
              currentUserId={currentUserId}
              partnerUserId={partnerUserId}
              familyMemberCount={familyMemberCount}
              expenseToEdit={expenseToEdit}
              onClose={closeExpenseSheet}
              onScanningChange={setReceiptScanning}
              hideChromeTitle
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
