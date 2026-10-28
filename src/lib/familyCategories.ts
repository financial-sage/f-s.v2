/** Family spend categories (shared / personal) + optional subcategories. */

import type { LucideIcon } from "lucide-react";
import { getCategoryDetails } from "@/lib/categoryMap";
import {
  Baby,
  Bath,
  BedDouble,
  Beer,
  Bell,
  Bike,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  CalendarDays,
  Camera,
  Car,
  Cigarette,
  Clapperboard,
  Clock,
  Coffee,
  CreditCard,
  Droplets,
  Dumbbell,
  Flower2,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  Hammer,
  Headphones,
  Heart,
  HeartPulse,
  Home,
  KeyRound,
  Landmark,
  Leaf,
  MoreHorizontal,
  Mountain,
  Music,
  Package,
  ParkingCircle,
  PawPrint,
  PiggyBank,
  Pill,
  Pizza,
  Plane,
  Receipt,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sofa,
  Sparkles,
  Stethoscope,
  Store,
  Sun,
  Tags,
  Tent,
  Ticket,
  TrainFront,
  TreePine,
  Truck,
  Tv,
  Umbrella,
  Users,
  UtensilsCrossed,
  Wallet,
  WashingMachine,
  Wifi,
  Wine,
  Wrench,
  Zap,
} from "lucide-react";

export type CategoryScope = "shared" | "personal";

export type CategoryIconId =
  | "home"
  | "utensils"
  | "bike"
  | "car"
  | "heart"
  | "party"
  | "tags"
  | "cart"
  | "coffee"
  | "gift"
  | "plane"
  | "shirt"
  | "phone"
  | "wifi"
  | "zap"
  | "briefcase"
  | "book"
  | "game"
  | "music"
  | "paw"
  | "baby"
  | "more"
  | "bus"
  | "train"
  | "fuel"
  | "parking"
  | "building"
  | "sofa"
  | "bed"
  | "bath"
  | "laundry"
  | "pizza"
  | "wine"
  | "beer"
  | "dumbbell"
  | "stethoscope"
  | "pill"
  | "scissors"
  | "camera"
  | "film"
  | "tv"
  | "headphones"
  | "ticket"
  | "tent"
  | "mountain"
  | "flower"
  | "tree"
  | "leaf"
  | "landmark"
  | "wallet"
  | "card"
  | "piggy"
  | "receipt"
  | "store"
  | "cart2"
  | "package"
  | "truck"
  | "hammer"
  | "wrench"
  | "key"
  | "bell"
  | "calendar"
  | "clock"
  | "graduation"
  | "users"
  | "heart2"
  | "sun"
  | "umbrella"
  | "droplets"
  | "cigarette";

export type FamilyCategory = {
  id: string;
  family_id: string;
  parent_id: string | null;
  scope: CategoryScope;
  owner_profile_id: string | null;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

/** First N icons shown before “Más iconos” in the picker. */
export const CATEGORY_ICON_PRIMARY_COUNT = 11;

export const CATEGORY_ICON_OPTIONS: {
  id: CategoryIconId;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "home", label: "Hogar", icon: Home },
  { id: "utensils", label: "Comida", icon: UtensilsCrossed },
  { id: "cart", label: "Compras", icon: ShoppingBag },
  { id: "coffee", label: "Café", icon: Coffee },
  { id: "bike", label: "Bici", icon: Bike },
  { id: "car", label: "Coche", icon: Car },
  { id: "heart", label: "Salud", icon: HeartPulse },
  { id: "party", label: "Ocio", icon: Sparkles },
  { id: "gift", label: "Regalo", icon: Gift },
  { id: "plane", label: "Viaje", icon: Plane },
  { id: "shirt", label: "Ropa", icon: Shirt },
  { id: "phone", label: "Móvil", icon: Smartphone },
  { id: "wifi", label: "Internet", icon: Wifi },
  { id: "zap", label: "Energía", icon: Zap },
  { id: "briefcase", label: "Trabajo", icon: Briefcase },
  { id: "book", label: "Educación", icon: BookOpen },
  { id: "game", label: "Juegos", icon: Gamepad2 },
  { id: "music", label: "Música", icon: Music },
  { id: "paw", label: "Mascotas", icon: PawPrint },
  { id: "baby", label: "Familia", icon: Baby },
  { id: "bus", label: "Bus", icon: Bus },
  { id: "train", label: "Tren", icon: TrainFront },
  { id: "fuel", label: "Gasolina", icon: Fuel },
  { id: "parking", label: "Parking", icon: ParkingCircle },
  { id: "building", label: "Edificio", icon: Building2 },
  { id: "sofa", label: "Salón", icon: Sofa },
  { id: "bed", label: "Dormir", icon: BedDouble },
  { id: "bath", label: "Baño", icon: Bath },
  { id: "laundry", label: "Lavado", icon: WashingMachine },
  { id: "pizza", label: "Pizza", icon: Pizza },
  { id: "wine", label: "Vino", icon: Wine },
  { id: "beer", label: "Cerveza", icon: Beer },
  { id: "dumbbell", label: "Gimnasio", icon: Dumbbell },
  { id: "stethoscope", label: "Médico", icon: Stethoscope },
  { id: "pill", label: "Farmacia", icon: Pill },
  { id: "scissors", label: "Peluquería", icon: Scissors },
  { id: "camera", label: "Fotos", icon: Camera },
  { id: "film", label: "Cine", icon: Clapperboard },
  { id: "tv", label: "TV", icon: Tv },
  { id: "headphones", label: "Audio", icon: Headphones },
  { id: "ticket", label: "Entradas", icon: Ticket },
  { id: "tent", label: "Camping", icon: Tent },
  { id: "mountain", label: "Montaña", icon: Mountain },
  { id: "flower", label: "Jardín", icon: Flower2 },
  { id: "tree", label: "Naturaleza", icon: TreePine },
  { id: "leaf", label: "Eco", icon: Leaf },
  { id: "landmark", label: "Banco", icon: Landmark },
  { id: "wallet", label: "Cartera", icon: Wallet },
  { id: "card", label: "Tarjeta", icon: CreditCard },
  { id: "piggy", label: "Ahorro", icon: PiggyBank },
  { id: "receipt", label: "Factura", icon: Receipt },
  { id: "store", label: "Tienda", icon: Store },
  { id: "cart2", label: "Carrito", icon: ShoppingCart },
  { id: "package", label: "Envío", icon: Package },
  { id: "truck", label: "Transporte", icon: Truck },
  { id: "hammer", label: "Obras", icon: Hammer },
  { id: "wrench", label: "Reparación", icon: Wrench },
  { id: "key", label: "Llaves", icon: KeyRound },
  { id: "bell", label: "Avisos", icon: Bell },
  { id: "calendar", label: "Agenda", icon: CalendarDays },
  { id: "clock", label: "Tiempo", icon: Clock },
  { id: "graduation", label: "Estudios", icon: GraduationCap },
  { id: "users", label: "Grupo", icon: Users },
  { id: "heart2", label: "Amor", icon: Heart },
  { id: "sun", label: "Sol", icon: Sun },
  { id: "umbrella", label: "Lluvia", icon: Umbrella },
  { id: "droplets", label: "Agua", icon: Droplets },
  { id: "cigarette", label: "Tabaco", icon: Cigarette },
  { id: "tags", label: "Etiqueta", icon: Tags },
  { id: "more", label: "Otros", icon: MoreHorizontal },
];

const ICON_BY_ID = new Map(
  CATEGORY_ICON_OPTIONS.map((opt) => [opt.id, opt] as const)
);

export function isCategoryIconId(value: unknown): value is CategoryIconId {
  return typeof value === "string" && ICON_BY_ID.has(value as CategoryIconId);
}

export function resolveCategoryIcon(
  iconId?: string | null
): LucideIcon {
  if (iconId && isCategoryIconId(iconId)) {
    return ICON_BY_ID.get(iconId)!.icon;
  }
  return Tags;
}

/**
 * Icon for an expense row: prefers family_categories (by id, then name),
 * then legacy tile ids (dining/home/…), then Tags.
 */
export function resolveExpenseCategoryIcon(input: {
  category?: string | null;
  categoryId?: string | null;
  categories?: Pick<FamilyCategory, "id" | "parent_id" | "name" | "icon">[];
}): LucideIcon {
  const legacyKey = String(input.category ?? "").trim().toLowerCase();
  if (legacyKey === "deposit" || legacyKey === "withdrawal") {
    return getCategoryDetails(legacyKey).icon;
  }

  const rows = input.categories ?? [];
  if (input.categoryId) {
    const row = rows.find((c) => c.id === input.categoryId);
    if (row) {
      const source =
        row.parent_id != null
          ? (rows.find((c) => c.id === row.parent_id) ?? row)
          : row;
      return resolveCategoryIcon(source.icon);
    }
  }

  if (input.category && rows.length > 0) {
    const name = input.category.trim().toLowerCase();
    const byName = rows.find(
      (c) => c.parent_id == null && c.name.trim().toLowerCase() === name
    );
    if (byName) return resolveCategoryIcon(byName.icon);
  }

  if (legacyKey) {
    const legacy = getCategoryDetails(legacyKey);
    if (legacy.id !== "misc") return legacy.icon;
  }

  return Tags;
}

/** Seed parents — same life areas as the retired fixed segments. */
export const BASIC_SHARED_CATEGORY_SEEDS: {
  name: string;
  color: string;
  icon: CategoryIconId;
  sort_order: number;
}[] = [
  { name: "Hogar", color: "#5B7188", icon: "home", sort_order: 10 },
  { name: "Alimentación", color: "#C2410C", icon: "utensils", sort_order: 20 },
  { name: "Movilidad", color: "#0369A1", icon: "car", sort_order: 30 },
  { name: "Bienestar", color: "#0F766E", icon: "heart", sort_order: 40 },
  { name: "Ocio", color: "#7C3AED", icon: "party", sort_order: 50 },
  { name: "Otros", color: "#57534E", icon: "more", sort_order: 60 },
];

export const CATEGORY_COLOR_OPTIONS = [
  "#5B7188",
  "#C2410C",
  "#0369A1",
  "#0F766E",
  "#7C3AED",
  "#C4A574",
  "#BE123C",
  "#166534",
  "#1E3A8A",
  "#57534E",
] as const;

export function isTopLevelCategory(c: Pick<FamilyCategory, "parent_id">) {
  return c.parent_id == null;
}

export function listVisibleCategories(
  rows: FamilyCategory[],
  userId: string
): FamilyCategory[] {
  return rows.filter(
    (c) =>
      !c.archived_at &&
      (c.scope === "shared" || c.owner_profile_id === userId)
  );
}

export function listParentCategories(
  rows: FamilyCategory[],
  userId: string
): FamilyCategory[] {
  return listVisibleCategories(rows, userId)
    .filter((c) => c.parent_id == null)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es"));
}

export function listSubcategories(
  rows: FamilyCategory[],
  parentId: string,
  userId: string
): FamilyCategory[] {
  return listVisibleCategories(rows, userId)
    .filter((c) => c.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es"));
}

/** Parent id for budget aggregation (sub → parent, else self). */
export function budgetCategoryIdForExpense(
  rows: FamilyCategory[],
  categoryId: string | null | undefined
): string | null {
  if (!categoryId) return null;
  const row = rows.find((c) => c.id === categoryId);
  if (!row || row.archived_at) return null;
  return row.parent_id ?? row.id;
}

export function mapCategoryRow(raw: Record<string, unknown>): FamilyCategory {
  return {
    id: String(raw.id),
    family_id: String(raw.family_id),
    parent_id: raw.parent_id == null ? null : String(raw.parent_id),
    scope: raw.scope === "personal" ? "personal" : "shared",
    owner_profile_id:
      raw.owner_profile_id == null ? null : String(raw.owner_profile_id),
    name: String(raw.name ?? "").trim(),
    color: raw.color == null ? null : String(raw.color),
    icon: raw.icon == null ? null : String(raw.icon),
    sort_order: Number(raw.sort_order ?? 100),
    archived_at: raw.archived_at == null ? null : String(raw.archived_at),
    created_at: String(raw.created_at ?? ""),
    updated_at: String(raw.updated_at ?? ""),
  };
}
