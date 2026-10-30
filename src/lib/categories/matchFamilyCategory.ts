/**
 * Map AI / OCR legacy tile ids + hints onto family_categories (parent or sub).
 */

export type FamilyCategoryOption = {
  id: string;
  name: string;
  parent_id: string | null;
  icon?: string | null;
};

/** Legacy suggest/OCR tile id → preferred family icon ids (order = preference). */
const LEGACY_TILE_ICONS: Record<string, string[]> = {
  dining: ["utensils", "pizza", "coffee", "wine", "beer"],
  coffee: ["coffee", "utensils"],
  super: ["cart", "store"],
  transport: ["car", "bus", "train", "bike"],
  fuel: ["fuel", "car"],
  bus: ["bus", "train", "car"],
  bike: ["bike"],
  travel: ["plane", "car"],
  home: ["home", "sofa", "bed", "bath", "laundry", "wrench", "hammer"],
  energy: ["zap", "home"],
  water: ["bath", "home"],
  wifi: ["wifi", "home"],
  phone: ["phone", "home"],
  health: ["heart", "pill", "stethoscope"],
  doctor: ["stethoscope", "pill", "heart"],
  gym: ["dumbbell", "heart"],
  clothes: ["shirt"],
  cinema: ["film", "ticket", "party"],
  games: ["game", "party"],
  game: ["game", "party"],
  music: ["music", "headphones", "party"],
  party: ["party", "beer", "wine"],
  beauty: ["scissors", "sparkles"],
  edu: ["book", "briefcase"],
  books: ["book"],
  gifts: ["gift"],
  pets: ["paw"],
  kids: ["baby"],
  work: ["briefcase", "building"],
  misc: ["more", "tags"],
  luxury: ["sparkles", "more"],
};

const HINT_ICONS: Record<string, string[]> = {
  food: ["utensils", "pizza", "coffee", "wine", "beer", "cart"],
  shopping: ["cart", "store", "shirt"],
  transport: ["car", "bus", "train", "bike", "fuel", "plane"],
  home: ["home", "sofa", "zap", "wifi", "phone"],
  health: ["heart", "pill", "stethoscope", "dumbbell"],
  leisure: ["party", "film", "music", "game", "ticket"],
  other: ["more", "tags"],
};

const CONCEPT_RULES: { re: RegExp; icons: string[]; nameHints: string[] }[] = [
  {
    re: /restaurant|restau|comer|cena|almuerzo|menu|menú|bar |cafe|café|pizzer|burger|mcdonald|kebab|tapas/,
    icons: ["utensils", "pizza", "coffee", "beer", "wine"],
    nameHints: ["aliment", "comida", "restau", "ocio"],
  },
  {
    re: /super|mercado|compra|grocery|lidl|mercadona|carrefour|aldi|dia |hiper/,
    icons: ["cart", "store"],
    nameHints: ["aliment", "compra", "super", "mercado"],
  },
  {
    re: /gasolina|combustible|fuel|parking|peaje/,
    icons: ["fuel", "car", "parking"],
    nameHints: ["movil", "transp", "coche", "auto"],
  },
  {
    re: /uber|cabify|taxi|bus|metro|tren|transporte|renfe|emt/,
    icons: ["car", "bus", "train"],
    nameHints: ["movil", "transp"],
  },
  {
    re: /avion|vuelo|hotel|booking|airbnb|viaje/,
    icons: ["plane"],
    nameHints: ["viaje", "ocio", "vacac"],
  },
  {
    re: /farmacia|medico|médico|hospital|dentista|clinica|clínica|seguro salud/,
    icons: ["pill", "stethoscope", "heart"],
    nameHints: ["salud", "bienestar", "farmac"],
  },
  {
    re: /gym|gimnasio|deporte|padel|pádel|futbol|fútbol/,
    icons: ["dumbbell", "heart"],
    nameHints: ["deporte", "bienestar", "gym"],
  },
  {
    re: /netflix|spotify|cine|teatro|concierto|ocio|disney|hbo/,
    icons: ["film", "music", "party", "ticket"],
    nameHints: ["ocio", "entreten"],
  },
  {
    re: /ikea|leroy|brico|ferreter|alquiler|hipoteca|comunidad|basura/,
    icons: ["home", "sofa", "wrench", "hammer"],
    nameHints: ["hogar", "casa"],
  },
  {
    re: /luz|electric|iberdrola|endesa|gas |agua|canal|internet|wifi|fibra|movistar|orange|vodafone/,
    icons: ["zap", "wifi", "phone", "home"],
    nameHints: ["hogar", "suministr", "internet", "telef"],
  },
  {
    re: /ropa|zara|hm |primark|nike|adidas|zapat/,
    icons: ["shirt"],
    nameHints: ["ropa", "moda", "ocio"],
  },
  {
    re: /mascota|veterinar|pet |perro|gato|pienso/,
    icons: ["paw"],
    nameHints: ["mascot"],
  },
  {
    re: /colegio|universidad|curso|udemy|libro/,
    icons: ["book"],
    nameHints: ["educ", "formac", "libro"],
  },
  {
    re: /regalo|amazon gift/,
    icons: ["gift"],
    nameHints: ["regalo"],
  },
];

function norm(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function scoreCategory(
  cat: FamilyCategoryOption,
  preferredIcons: string[],
  nameHints: string[],
  conceptNorm: string
): number {
  let score = 0;
  const icon = String(cat.icon ?? "").toLowerCase();
  const name = norm(cat.name);
  const iconIdx = preferredIcons.indexOf(icon);
  if (iconIdx >= 0) score += 40 - iconIdx * 2;
  for (const hint of nameHints) {
    if (hint && name.includes(norm(hint))) score += 25;
  }
  if (conceptNorm && name.length >= 3 && conceptNorm.includes(name)) {
    score += cat.parent_id ? 35 : 20;
  }
  // Prefer leaf when both match similarly.
  if (cat.parent_id) score += 3;
  return score;
}

function bestByIconsAndHints(
  categories: FamilyCategoryOption[],
  preferredIcons: string[],
  nameHints: string[],
  concept?: string | null
): string | null {
  if (!categories.length) return null;
  const conceptNorm = norm(concept ?? "");
  let best: FamilyCategoryOption | null = null;
  let bestScore = 0;
  for (const cat of categories) {
    const s = scoreCategory(cat, preferredIcons, nameHints, conceptNorm);
    if (s > bestScore) {
      bestScore = s;
      best = cat;
    }
  }
  return bestScore >= 15 ? best?.id ?? null : null;
}

/** Resolve a family category id from legacy tile, OCR hint, and/or concept text. */
export function matchFamilyCategoryId(input: {
  categories: FamilyCategoryOption[];
  /** Legacy tile (dining, super, …) or already a family uuid. */
  legacyTileId?: string | null;
  categoryHint?: string | null;
  concept?: string | null;
}): string | null {
  const categories = input.categories.filter((c) => c.id);
  if (!categories.length) return null;

  const maybeUuid = String(input.legacyTileId ?? "").trim();
  if (maybeUuid && categories.some((c) => c.id === maybeUuid)) {
    return maybeUuid;
  }

  const concept = input.concept?.trim() || "";
  const conceptNorm = norm(concept);

  // 1) Explicit subcategory / parent name contained in concept.
  if (conceptNorm.length >= 3) {
    const byName = [...categories]
      .filter((c) => {
        const n = norm(c.name);
        return n.length >= 3 && conceptNorm.includes(n);
      })
      .sort((a, b) => {
        const an = norm(a.name).length;
        const bn = norm(b.name).length;
        if (an !== bn) return bn - an;
        return (a.parent_id ? 0 : 1) - (b.parent_id ? 0 : 1);
      });
    if (byName[0]) return byName[0].id;
  }

  // 2) Legacy tile from OCR / old suggest.
  const legacy = maybeUuid.toLowerCase();
  if (legacy && LEGACY_TILE_ICONS[legacy]) {
    const hit = bestByIconsAndHints(
      categories,
      LEGACY_TILE_ICONS[legacy],
      [legacy],
      concept
    );
    if (hit) return hit;
  }

  // 3) Coarse categoryHint.
  const hint = String(input.categoryHint ?? "")
    .trim()
    .toLowerCase();
  if (hint && HINT_ICONS[hint]) {
    const hit = bestByIconsAndHints(
      categories,
      HINT_ICONS[hint],
      [hint],
      concept
    );
    if (hit) return hit;
  }

  // 4) Concept heuristics.
  if (conceptNorm.length >= 2) {
    for (const rule of CONCEPT_RULES) {
      if (rule.re.test(conceptNorm)) {
        const hit = bestByIconsAndHints(
          categories,
          rule.icons,
          rule.nameHints,
          concept
        );
        if (hit) return hit;
      }
    }
  }

  return null;
}

/** Lines for the AI prompt: prefer leaf ids; show parent path. */
export function formatFamilyCategoryCatalog(
  categories: FamilyCategoryOption[]
): string {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return categories
    .map((c) => {
      const parent = c.parent_id ? byId.get(c.parent_id) : null;
      const path = parent ? `${parent.name} > ${c.name}` : c.name;
      const kind = c.parent_id ? "sub" : "padre";
      return `${c.id} | ${path} | icon=${c.icon ?? "—"} | ${kind}`;
    })
    .join("\n");
}
