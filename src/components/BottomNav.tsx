"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
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
  Plus,
  StickyNote,
  Tags,
  UserRound,
  Wallet,
  WalletCards,
  type LucideProps,
} from "lucide-react";
import { useExpenseModal } from "@/components/ExpenseModalProvider";
import { RECOMMENDATIONS_CHANGED_EVENT } from "@/components/CfoPresencePill";
import { Sheet } from "@/components/ui/Sheet";
import { useSimpleMode } from "@/hooks/useSimpleMode";
import { cn } from "@/components/ui/cn";

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

const SimpleExpenseSheet = dynamic(
  () => import("@/components/SimpleExpenseSheet"),
  { ssr: false },
);

const AUTH_PATHS = new Set([
  "/login",
  "/register",
  "/onboarding",
  "/forgot-password",
  "/reset-password",
]);

/** Legal / help pages reachable before login — no nav chrome. */
const PUBLIC_CONTENT_PATHS = new Set(["/profile/privacy", "/profile/support"]);

function shouldHideBottomNav(pathname: string) {
  return AUTH_PATHS.has(pathname) || PUBLIC_CONTENT_PATHS.has(pathname);
}

type NavIcon = ComponentType<LucideProps>;

/* ── Classic (production) expandable menu ─────────────────────────── */

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
    match: (pathname) =>
      pathname === "/history" || pathname.startsWith("/history/"),
  },
  {
    id: "accounts",
    href: "/accounts",
    label: "Cuentas",
    icon: Landmark,
    match: (pathname) =>
      pathname === "/accounts" || pathname.startsWith("/accounts/"),
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
    match: (pathname) =>
      pathname === "/savings" || pathname.startsWith("/savings/"),
  },
  {
    id: "fixed-expenses",
    href: "/fixed-expenses",
    label: "Gastos fijos",
    icon: Wallet,
    match: (pathname) =>
      pathname === "/fixed-expenses" ||
      pathname.startsWith("/fixed-expenses/"),
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
    match: (pathname) =>
      pathname === "/budget" || pathname.startsWith("/budget/"),
  },
  {
    id: "profile",
    href: "/profile",
    label: "Perfil",
    icon: UserRound,
    match: (pathname) =>
      pathname === "/profile" || pathname.startsWith("/profile/"),
  },
];

function resolveCurrentModule(pathname: string): NavModule {
  return NAV_MODULES.find((module) => module.match(pathname)) ?? NAV_MODULES[0];
}

/* ── Simple-mode dock ─────────────────────────────────────────────── */

type DockItem = {
  id: "home" | "history" | "notes" | "profile";
  href: string;
  label: string;
  icon: NavIcon;
  match: (pathname: string) => boolean;
};

const DOCK_ITEMS: DockItem[] = [
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
    label: "Movimientos",
    icon: History,
    match: (pathname) =>
      pathname === "/history" || pathname.startsWith("/history/"),
  },
  {
    id: "notes",
    href: "/recommendations",
    label: "Notas",
    icon: StickyNote,
    match: (pathname) =>
      pathname === "/recommendations" ||
      pathname.startsWith("/recommendations/"),
  },
  {
    id: "profile",
    href: "/profile",
    label: "Perfil",
    icon: UserRound,
    match: (pathname) =>
      pathname === "/profile" || pathname.startsWith("/profile/"),
  },
];

function DockLink({
  item,
  active,
  badge,
}: {
  item: DockItem;
  active: boolean;
  badge?: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-1 transition-transform active:scale-95",
        active ? "text-primary" : "text-on-surface-variant/70",
      )}
      aria-current={active ? "page" : undefined}
    >
      <span className="relative inline-flex h-6 w-6 items-center justify-center">
        <Icon
          size={20}
          strokeWidth={active ? 2 : 1.6}
          className="transition-colors"
          aria-hidden
        />
        {badge != null && badge > 0 ? (
          <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-medium tabular-nums leading-none text-on-primary">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "max-w-full truncate text-[10px] leading-none tracking-tight",
          active ? "font-medium" : "font-light",
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}

interface BottomNavProps {
  familyId?: string;
  currentUserId?: string;
  partnerUserId?: string | null;
  familyMemberCount?: number;
  partnerFirstName?: string;
  financialModel?: string;
  user1SplitPct?: number;
}

/**
 * Classic expandable nav for production users.
 * Simple-mode dock only when superadmin has modo simple on.
 */
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
  const {
    isExpenseModalOpen,
    setIsExpenseModalOpen,
    expenseToEdit,
    setExpenseToEdit,
    setExpenseDraft,
  } = useExpenseModal();
  const { enabled: isSimpleModeEnabled } = useSimpleMode();
  const [expanded, setExpanded] = useState(false);
  const [receiptScanning, setReceiptScanning] = useState(false);
  const [notesCount, setNotesCount] = useState(0);

  const useSimpleExpenseSheet = isSimpleModeEnabled && !expenseToEdit;

  const loadNotesCount = useCallback(async () => {
    try {
      const res = await fetch("/api/recommendations/active", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        count?: number;
        locked?: boolean;
      };
      if (data.locked) {
        setNotesCount(0);
        return;
      }
      setNotesCount(Math.max(0, Number(data.count) || 0));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isSimpleModeEnabled || !familyId) {
      setNotesCount(0);
      return;
    }
    void loadNotesCount();
    function onChanged() {
      void loadNotesCount();
    }
    function onVisible() {
      if (document.visibilityState === "visible") void loadNotesCount();
    }
    window.addEventListener(RECOMMENDATIONS_CHANGED_EVENT, onChanged);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(RECOMMENDATIONS_CHANGED_EVENT, onChanged);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [familyId, isSimpleModeEnabled, loadNotesCount, pathname]);

  function openNewExpense() {
    if (!familyId) return;
    setExpenseToEdit(null);
    setExpenseDraft(null);
    setIsExpenseModalOpen(true);
    setExpanded(false);
  }

  useEffect(() => {
    if (!expanded && !isExpenseModalOpen) return;
    if (useSimpleExpenseSheet) {
      void import("@/components/SimpleExpenseSheet");
      return;
    }
    void import("@/components/AddExpenseForm");
  }, [expanded, isExpenseModalOpen, useSimpleExpenseSheet]);

  const currentModule = useMemo(
    () => resolveCurrentModule(pathname),
    [pathname],
  );
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
    setExpenseDraft(null);
  }

  const leftItems = DOCK_ITEMS.filter(
    (item) => item.id === "home" || item.id === "history",
  );
  const rightItems = DOCK_ITEMS.filter(
    (item) => item.id === "notes" || item.id === "profile",
  );

  return (
    <>
      {isSimpleModeEnabled ? (
        <nav
          data-tour="bottom-nav"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-glass-border/80 bg-glass/85 shadow-[0_-8px_28px_rgba(43,52,55,0.06)] backdrop-blur-xl"
          aria-label="Navegación principal"
        >
          <div className="mx-auto flex w-full max-w-md items-end px-1 pb-[max(0.45rem,env(safe-area-inset-bottom,0px))] pt-1.5">
            {leftItems.map((item) => (
              <DockLink
                key={item.id}
                item={item}
                active={item.match(pathname)}
              />
            ))}

            <div className="relative flex w-[4.5rem] shrink-0 flex-col items-center justify-end">
              <button
                type="button"
                data-tour="dash-actions"
                onClick={openNewExpense}
                disabled={!familyId}
                className="fab-accent -mt-5 mb-0.5 flex h-14 w-14 items-center justify-center rounded-full shadow-[var(--fab-accent-shadow)] transition-transform active:scale-95 disabled:opacity-50"
                aria-label="Agregar gasto"
              >
                <Plus size={24} strokeWidth={2.2} aria-hidden />
              </button>
              <span className="pb-0.5 text-[10px] font-light leading-none tracking-tight text-on-surface-variant/70">
                Gasto
              </span>
            </div>

            {rightItems.map((item) => (
              <DockLink
                key={item.id}
                item={item}
                active={item.match(pathname)}
                badge={item.id === "notes" ? notesCount : undefined}
              />
            ))}
          </div>
        </nav>
      ) : (
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
            className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]"
          >
            <div className="pointer-events-auto relative flex w-full max-w-sm flex-col items-center">
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
                    {NAV_MODULES.filter(
                      (module) => module.id !== currentModule.id,
                    ).map((module, index) => {
                      const Icon = module.icon;
                      const col = index % 3;
                      const row = Math.floor(index / 3);
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
                    })}
                  </div>
                  <div
                    className="pointer-events-none mx-auto mt-1.5 h-px w-8 bg-gradient-to-r from-transparent via-[#c4a574]/55 to-transparent"
                    aria-hidden
                  />
                </div>
              ) : null}

              <div className="relative flex w-full items-end justify-center">
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setExpanded((prev) => !prev)}
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
                  <span
                    className="text-[10px] font-medium leading-none text-on-surface"
                    aria-hidden
                  >
                    Menú
                  </span>
                </div>

                {familyId ? (
                  <button
                    type="button"
                    data-tour="dash-actions"
                    onClick={openNewExpense}
                    className="absolute bottom-0 left-[calc(50%+2.85rem)] flex flex-col items-center gap-1 transition-transform active:scale-95"
                    aria-label="Agregar gasto"
                  >
                    <span className="fab-accent flex h-10 w-10 items-center justify-center rounded-full shadow-[var(--fab-accent-shadow)]">
                      <Plus size={17} strokeWidth={2.2} />
                    </span>
                    <span className="text-[10px] font-medium leading-none text-on-surface">
                      gasto
                    </span>
                  </button>
                ) : null}
              </div>
            </div>
          </nav>
        </>
      )}

      {familyId && useSimpleExpenseSheet ? (
        <SimpleExpenseSheet
          open={isExpenseModalOpen}
          onClose={closeExpenseSheet}
        />
      ) : null}

      {familyId && !useSimpleExpenseSheet ? (
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
