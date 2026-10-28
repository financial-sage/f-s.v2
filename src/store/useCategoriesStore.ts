"use client";

import { create } from "zustand";
import { listFamilyCategoriesAction } from "@/app/actions/categories";
import type { FamilyCategory } from "@/lib/familyCategories";

const CATEGORIES_TTL_MS = 60_000;

interface CategoriesStoreState {
  categories: FamilyCategory[];
  fetchedAt: number;
  isLoading: boolean;
  load: (options?: { force?: boolean }) => Promise<FamilyCategory[]>;
  invalidate: () => void;
  setCategories: (rows: FamilyCategory[]) => void;
}

export const useCategoriesStore = create<CategoriesStoreState>((set, get) => ({
  categories: [],
  fetchedAt: 0,
  isLoading: false,

  load: async (options) => {
    const force = options?.force === true;
    const { categories, fetchedAt, isLoading } = get();
    const isFresh =
      categories.length > 0 && Date.now() - fetchedAt < CATEGORIES_TTL_MS;

    if (!force && isFresh) return categories;
    if (isLoading && !force) return categories;

    set({ isLoading: true });
    try {
      const rows = await listFamilyCategoriesAction();
      const active = rows.filter((c) => !c.archived_at);
      set({ categories: active, fetchedAt: Date.now(), isLoading: false });
      return active;
    } catch {
      set({ isLoading: false });
      return get().categories;
    }
  },

  invalidate: () => set({ fetchedAt: 0 }),

  setCategories: (next) =>
    set({
      categories: next.filter((c) => !c.archived_at),
      fetchedAt: Date.now(),
    }),
}));
