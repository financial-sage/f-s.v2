import { useEffect, useMemo, useState } from "react";
import { getDefaultUserCategories, type UserCategory } from "@/lib/categories";
import { getCategoryDetails } from "@/lib/categoryMap";

function storageKey(familyId: string) {
  return `fsage:categories:v1:${familyId}`;
}

function safeParse(raw: string | null): UserCategory[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as UserCategory[];
  } catch {
    return null;
  }
}

export function useCategories(familyId: string) {
  const [categories, setCategories] = useState<UserCategory[] | null>(null);

  useEffect(() => {
    const defaults = getDefaultUserCategories();
    const stored = safeParse(window.localStorage.getItem(storageKey(familyId)));

    if (!stored) {
      setCategories(defaults);
      window.localStorage.setItem(storageKey(familyId), JSON.stringify(defaults));
      return;
    }

    // Merge: keep stored settings for known ids, add any new defaults.
    const byId = new Map(stored.map((c) => [c.id, c]));
    const merged = defaults.map((d) => {
      const existing = byId.get(d.id);
      return existing
        ? {
            ...d,
            label: typeof existing.label === "string" && existing.label.trim() ? existing.label : d.label,
            isActive: typeof existing.isActive === "boolean" ? existing.isActive : d.isActive,
            order: typeof existing.order === "number" ? existing.order : d.order,
          }
        : d;
    });

    merged.sort((a, b) => a.order - b.order);
    setCategories(merged);
  }, [familyId]);

  const activeCategories = useMemo(() => {
    const list = categories ?? getDefaultUserCategories();
    return list.filter((c) => c.isActive);
  }, [categories]);

  function persist(next: UserCategory[]) {
    setCategories(next);
    window.localStorage.setItem(storageKey(familyId), JSON.stringify(next));
  }

  function renameCategory(id: string, label: string) {
    const list = categories ?? getDefaultUserCategories();
    const next = list.map((c) => (c.id === id ? { ...c, label } : c));
    persist(next);
  }

  function setCategoryActive(id: string, isActive: boolean) {
    const list = categories ?? getDefaultUserCategories();
    const next = list.map((c) => (c.id === id ? { ...c, isActive } : c));
    persist(next);
  }

  const labelById = useMemo(() => {
    const list = categories ?? getDefaultUserCategories();
    const map = new Map<string, string>();
    for (const c of list) {
      map.set(c.id, c.label);
    }
    return map;
  }, [categories]);

  function getDisplayForCategory(id: string) {
    const fallback = getCategoryDetails(id);
    const label = labelById.get(id) ?? fallback.label;
    return { ...fallback, label };
  }

  return {
    categories: categories ?? getDefaultUserCategories(),
    activeCategories,
    renameCategory,
    setCategoryActive,
    getDisplayForCategory,
  };
}

