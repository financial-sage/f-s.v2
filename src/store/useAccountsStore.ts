"use client";

import { create } from "zustand";
import { listFamilyAccountsAction } from "@/app/actions/accounts";
import type { FamilyAccount } from "@/lib/accounts";

const ACCOUNTS_TTL_MS = 60_000;

interface AccountsStoreState {
  accounts: FamilyAccount[];
  fetchedAt: number;
  isLoading: boolean;
  load: (options?: { force?: boolean }) => Promise<FamilyAccount[]>;
  invalidate: () => void;
  setAccounts: (accounts: FamilyAccount[]) => void;
}

export const useAccountsStore = create<AccountsStoreState>((set, get) => ({
  accounts: [],
  fetchedAt: 0,
  isLoading: false,

  load: async (options) => {
    const force = options?.force === true;
    const { accounts, fetchedAt, isLoading } = get();
    const isFresh = accounts.length > 0 && Date.now() - fetchedAt < ACCOUNTS_TTL_MS;

    if (!force && isFresh) return accounts;
    if (isLoading && !force) return accounts;

    set({ isLoading: true });
    try {
      const rows = await listFamilyAccountsAction();
      const active = rows.filter((a) => !a.archived_at);
      set({ accounts: active, fetchedAt: Date.now(), isLoading: false });
      return active;
    } catch {
      set({ isLoading: false });
      return get().accounts;
    }
  },

  invalidate: () => set({ fetchedAt: 0 }),

  setAccounts: (next) =>
    set({
      accounts: next.filter((a) => !a.archived_at),
      fetchedAt: Date.now(),
    }),
}));
