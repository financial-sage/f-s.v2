export type TourId =
  | "dashboard"
  | "accounts"
  /** After creating a checking account: spotlight Ingreso. */
  | "accountsIncome"
  /** After registering income: spotlight Transferir. */
  | "accountsTransfer"
  | "savings"
  | "fixedExpenses"
  | "history"
  /** First grocery ticket icon in history (scanned receipt detail). */
  | "historyReceipt"
  /** First time opening the add-expense sheet. */
  | "expenseForm"
  /** When “Cobrar” first appears on the couple dashboard. */
  | "coupleCollect";

export type FirstRunState = {
  setupCompleted: boolean;
  /** Preferred mode chosen during onboarding (for tour copy). */
  mode?: "individual" | "couple";
  tours: Partial<Record<TourId, boolean>>;
};

const STORAGE_PREFIX = "fsage:ux:";

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function emptyState(): FirstRunState {
  return { setupCompleted: false, tours: {} };
}

export function readFirstRun(userId: string): FirstRunState {
  if (typeof window === "undefined" || !userId) return emptyState();
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<FirstRunState>;
    return {
      setupCompleted: Boolean(parsed.setupCompleted),
      mode: parsed.mode === "couple" ? "couple" : parsed.mode === "individual" ? "individual" : undefined,
      tours: parsed.tours && typeof parsed.tours === "object" ? parsed.tours : {},
    };
  } catch {
    return emptyState();
  }
}

export function writeFirstRun(userId: string, next: FirstRunState) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}

export function patchFirstRun(userId: string, patch: Partial<FirstRunState>) {
  const current = readFirstRun(userId);
  const next: FirstRunState = {
    setupCompleted: patch.setupCompleted ?? current.setupCompleted,
    mode: patch.mode ?? current.mode,
    tours: { ...current.tours, ...(patch.tours ?? {}) },
  };
  writeFirstRun(userId, next);
  return next;
}

/**
 * Seed legacy users who already have a family before this feature shipped:
 * skip forced setup, but leave tours unset so they still see module tours once.
 */
export function ensureFirstRunForUser(
  userId: string,
  options: { hasFamily: boolean }
): FirstRunState {
  if (typeof window === "undefined" || !userId) return emptyState();
  try {
    const key = storageKey(userId);
    if (window.localStorage.getItem(key)) {
      const current = readFirstRun(userId);
      // Cloned / existing households should never be forced through setup again.
      if (options.hasFamily && !current.setupCompleted) {
        return patchFirstRun(userId, { setupCompleted: true });
      }
      return current;
    }
    if (options.hasFamily) {
      const seeded: FirstRunState = { setupCompleted: true, tours: {} };
      writeFirstRun(userId, seeded);
      return seeded;
    }
    return emptyState();
  } catch {
    return emptyState();
  }
}

export function markSetupCompleted(
  userId: string,
  mode?: "individual" | "couple"
) {
  return patchFirstRun(userId, {
    setupCompleted: true,
    ...(mode ? { mode } : {}),
  });
}

export function isTourDone(userId: string, tourId: TourId): boolean {
  return Boolean(readFirstRun(userId).tours[tourId]);
}

/** Dispatched on `window` after a product tour is marked done. */
export const TOUR_DONE_EVENT = "fsage:tour-done";

export function markTourDone(userId: string, tourId: TourId) {
  const next = patchFirstRun(userId, { tours: { [tourId]: true } });
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(TOUR_DONE_EVENT, { detail: { userId, tourId } })
    );
  }
  return next;
}
