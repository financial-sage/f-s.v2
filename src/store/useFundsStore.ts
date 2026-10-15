"use client";

import { create } from "zustand";
import { listFamilyFundsAction } from "@/app/actions/funds";
import type { FamilyFund } from "@/lib/funds";

const FUNDS_TTL_MS = 60_000;

interface FundsStoreState {
  funds: FamilyFund[];
  fetchedAt: number;
  isLoading: boolean;
  load: (options?: { force?: boolean }) => Promise<FamilyFund[]>;
  invalidate: () => void;
  setFunds: (funds: FamilyFund[]) => void;
}

export const useFundsStore = create<FundsStoreState>((set, get) => ({
  funds: [],
  fetchedAt: 0,
  isLoading: false,

  load: async (options) => {
    const force = options?.force === true;
    const { funds, fetchedAt, isLoading } = get();
    const isFresh = funds.length > 0 && Date.now() - fetchedAt < FUNDS_TTL_MS;

    if (!force && isFresh) return funds;
    if (isLoading && !force) return funds;

    set({ isLoading: true });
    try {
      const rows = await listFamilyFundsAction();
      const active = rows.filter((f) => !f.archived_at);
      set({ funds: active, fetchedAt: Date.now(), isLoading: false });
      return active;
    } catch {
      set({ isLoading: false });
      return get().funds;
    }
  },

  invalidate: () => set({ fetchedAt: 0 }),

  setFunds: (next) =>
    set({
      funds: next.filter((f) => !f.archived_at),
      fetchedAt: Date.now(),
    }),
}));
