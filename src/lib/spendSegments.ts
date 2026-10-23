import {
  Bike,
  HeartPulse,
  Home,
  MoreHorizontal,
  PartyPopper,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

/** Fixed life segments for budget (product catalog V1). */
export const SPEND_SEGMENT_IDS = [
  "home",
  "food",
  "mobility",
  "wellbeing",
  "leisure",
  "other",
] as const;

export type SpendSegmentId = (typeof SPEND_SEGMENT_IDS)[number];

export type SpendSegment = {
  id: SpendSegmentId;
  label: string;
  icon: LucideIcon;
};

export const SPEND_SEGMENTS: SpendSegment[] = [
  { id: "home", label: "Hogar", icon: Home },
  { id: "food", label: "Alimentación", icon: UtensilsCrossed },
  { id: "mobility", label: "Movilidad", icon: Bike },
  { id: "wellbeing", label: "Bienestar", icon: HeartPulse },
  { id: "leisure", label: "Ocio", icon: PartyPopper },
  { id: "other", label: "Otros", icon: MoreHorizontal },
];

const SEGMENT_SET = new Set<string>(SPEND_SEGMENT_IDS);

export const DEFAULT_SPEND_SEGMENT_ID: SpendSegmentId = "other";

export function isSpendSegmentId(value: unknown): value is SpendSegmentId {
  return typeof value === "string" && SEGMENT_SET.has(value);
}

export function normalizeSpendSegmentId(
  raw?: string | null
): SpendSegmentId {
  if (!raw) return DEFAULT_SPEND_SEGMENT_ID;
  const id = raw.trim().toLowerCase();
  if (isSpendSegmentId(id)) return id;
  return DEFAULT_SPEND_SEGMENT_ID;
}

export function getSpendSegment(id: SpendSegmentId): SpendSegment {
  return (
    SPEND_SEGMENTS.find((s) => s.id === id) ??
    SPEND_SEGMENTS[SPEND_SEGMENTS.length - 1]
  );
}

/** Map legacy fine categories → life segment (for edits / AI bridge). */
export function spendSegmentFromCategoryId(
  category?: string | null
): SpendSegmentId {
  const id = String(category ?? "").trim().toLowerCase();
  if (isSpendSegmentId(id)) return id;

  const map: Record<string, SpendSegmentId> = {
    home: "home",
    energy: "home",
    water: "home",
    wifi: "home",
    phone: "home",
    super: "food",
    dining: "food",
    coffee: "food",
    food: "food",
    transport: "mobility",
    fuel: "mobility",
    bus: "mobility",
    bike: "mobility",
    health: "wellbeing",
    gym: "wellbeing",
    doctor: "wellbeing",
    beauty: "wellbeing",
    cinema: "leisure",
    games: "leisure",
    game: "leisure",
    music: "leisure",
    party: "leisure",
    travel: "leisure",
    clothes: "leisure",
    luxury: "leisure",
    gifts: "leisure",
    edu: "other",
    work: "other",
    kids: "other",
    pets: "other",
    books: "other",
    misc: "other",
    shopping: "food",
    other: "other",
  };

  return map[id] ?? DEFAULT_SPEND_SEGMENT_ID;
}

export function spendSegmentFromFundName(
  fundName?: string | null
): SpendSegmentId {
  const raw = (fundName ?? "").trim().toLowerCase();
  if (!raw) return DEFAULT_SPEND_SEGMENT_ID;

  const rules: { re: RegExp; id: SpendSegmentId }[] = [
    {
      re: /restaurant|comida|food|cena|almuerzo|merienda|bar|cafe|café|super|mercado|compra|grocery/,
      id: "food",
    },
    {
      re: /gasolina|combustible|fuel|parking|uber|taxi|transporte|transp|bus|metro|tren|bici|bike/,
      id: "mobility",
    },
    {
      re: /hogar|casa|home|alquiler|renta|hipoteca|luz|energia|electric|agua|water|internet|wifi|fibra|telefono|móvil|movil|phone/,
      id: "home",
    },
    {
      re: /salud|medico|médico|farmacia|doctor|hospital|gym|gimnasio|deporte|belleza|peluquer|spa/,
      id: "wellbeing",
    },
    {
      re: /viaje|vacacion|avion|vuelo|hotel|cine|netflix|ocio|entreten|juego|game|musica|spotify|fiesta|party|ropa|moda|regalo|lujo/,
      id: "leisure",
    },
  ];

  for (const rule of rules) {
    if (rule.re.test(raw)) return rule.id;
  }
  return DEFAULT_SPEND_SEGMENT_ID;
}
