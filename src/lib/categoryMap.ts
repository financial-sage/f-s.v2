import {
  Baby,
  BanknoteArrowDown,
  Bike,
  BookOpen,
  Briefcase,
  Bus,
  CarFront,
  Coffee,
  Droplets,
  Dumbbell,
  Film,
  Fuel,
  Gamepad2,
  Gem,
  Gift,
  Globe,
  GraduationCap,
  House,
  Music,
  PartyPopper,
  PawPrint,
  Pill,
  Plane,
  Plus,
  Receipt,
  Scissors,
  Shirt,
  ShoppingCart,
  Smartphone,
  Stethoscope,
  UtensilsCrossed,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface CategoryTile {
  id: string;
  label: string;
  icon: LucideIcon;
  value: string;
}

export const topCategories: CategoryTile[] = [
  { id: "super", value: "super", label: "Super", icon: ShoppingCart },
  { id: "dining", value: "food", label: "Restaurante", icon: UtensilsCrossed },
  { id: "transport", value: "transport", label: "Transp", icon: CarFront },
  { id: "home", value: "home", label: "Hogar", icon: House },
  { id: "health", value: "other", label: "Salud", icon: Pill },
  { id: "work", value: "other", label: "Trabajo", icon: Briefcase },
  { id: "edu", value: "other", label: "Edu", icon: GraduationCap },
  { id: "gifts", value: "other", label: "Regalos", icon: Gift },
  { id: "pets", value: "other", label: "Mascotas", icon: PawPrint },
  { id: "fuel", value: "transport", label: "Gasolina", icon: Fuel },
];

export const extraCategories: CategoryTile[] = [
  { id: "gym", value: "other", label: "Gimnasio", icon: Dumbbell },
  { id: "clothes", value: "other", label: "Ropa", icon: Shirt },
  { id: "travel", value: "transport", label: "Viajes", icon: Plane },
  { id: "cinema", value: "other", label: "Cine", icon: Film },
  { id: "games", value: "other", label: "Juegos", icon: Gamepad2 },
  { id: "music", value: "other", label: "Musica", icon: Music },
  { id: "coffee", value: "food", label: "Cafe", icon: Coffee },
  { id: "kids", value: "other", label: "Bebe", icon: Baby },
  { id: "books", value: "other", label: "Libros", icon: BookOpen },
  { id: "phone", value: "home", label: "Telefono", icon: Smartphone },
  { id: "wifi", value: "home", label: "Internet", icon: Wifi },
  { id: "energy", value: "home", label: "Energia", icon: Zap },
  { id: "water", value: "home", label: "Agua", icon: Droplets },
  { id: "bus", value: "transport", label: "Bus", icon: Bus },
  { id: "party", value: "other", label: "Fiesta", icon: PartyPopper },
  { id: "beauty", value: "other", label: "Belleza", icon: Scissors },
  { id: "doctor", value: "other", label: "Doctor", icon: Stethoscope },
  { id: "bike", value: "transport", label: "Bici", icon: Bike },
  { id: "misc", value: "other", label: "Varios", icon: Globe },
  { id: "luxury", value: "other", label: "Lujo", icon: Gem },
];

const systemCategories: CategoryTile[] = [
  { id: "deposit", value: "deposit", label: "Aporte", icon: BanknoteArrowDown },
];

const ALL_CATEGORIES: CategoryTile[] = [
  ...topCategories,
  ...extraCategories,
  ...systemCategories,
];

const FALLBACK: CategoryTile = {
  id: "super",
  value: "super",
  label: "Gasto",
  icon: Receipt,
};

export function getCategoryDetails(id: string): CategoryTile {
  return ALL_CATEGORIES.find((c) => c.id === id) ?? FALLBACK;
}
