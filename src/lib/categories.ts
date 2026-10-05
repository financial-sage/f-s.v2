import { extraCategories, topCategories, type CategoryTile } from "@/lib/categoryMap";

export type UserCategory = {
  id: string;
  label: string;
  isActive: boolean;
  order: number;
};

export function getDefaultUserCategories(): UserCategory[] {
  const all: CategoryTile[] = [...topCategories, ...extraCategories].filter((c) => c.id !== "deposit");
  return all.map((c, idx) => ({
    id: c.id,
    label: c.label,
    isActive: true,
    order: idx,
  }));
}

